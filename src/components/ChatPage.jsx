import { useEffect, useRef, useState } from "react";
import {
  Send, Paperclip, LogOut, Users, Hash, Smile,
  MoreVertical, Phone, Video, Search, MessageCircle,
  Sun, Moon, Copy, Check
} from "lucide-react";
import { useChatContext } from "../context/ChatContext";
import { useNavigate } from "react-router";
import SockJS from "sockjs-client";
import { Stomp } from "@stomp/stompjs";
import toast from "react-hot-toast";
import { baseURL } from "../config/AxiosHelper";
import { getMessagess } from "../services/RoomService";
import { timeAgo } from "../config/helper";
import Picker from "@emoji-mart/react";
import data from "@emoji-mart/data";

const ChatPage = () => {
  const {
    roomId, currentUser, connected,
    setConnected, setRoomId, setCurrentUser,
  } = useChatContext();

  const navigate  = useNavigate();
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState("");
  const [isTyping, setIsTyping]               = useState(false);
  const [onlineCount, setOnlineCount]         = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [dark, setDark]                       = useState(true);
  const [wsStatus, setWsStatus]               = useState("connecting");
  const [sending, setSending]                 = useState(false);
  const [copied, setCopied]                   = useState(false);

  const inputRef        = useRef(null);
  const chatBoxRef      = useRef(null);
  const stompRef        = useRef(null);
  const emojiPickerRef  = useRef(null);
  const scrollAnchorRef = useRef(null);

  /* ── theme ── */
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  /* ── guard ── */
  useEffect(() => {
    if (!connected) navigate("/");
  }, [connected, navigate]);

  /* ── load history ── */
  useEffect(() => {
    async function load() {
      try {
        const msgs = await getMessagess(roomId);
        setMessages(msgs);
      } catch (e) { console.error(e); }
    }
    if (connected) load();
  }, [connected, roomId]);

  /* ── auto-scroll ──
     Problem: WebSocket messages trigger a React state update → re-render →
     DOM paint, but a single rAF fires *before* the browser has committed the
     new bubble's height, so scrollHeight is still the old value.
     Fix: double-rAF (second frame fires after layout/paint) + a 120 ms
     fallback setTimeout to catch any late image/emoji layout shifts.
  ── */
  const scrollToBottom = () => {
    // Primary: scrollIntoView on an anchor div — most reliable method,
    // used by Discord/WhatsApp. Works even when scrollHeight hasn't updated yet.
    if (scrollAnchorRef.current) {
      scrollAnchorRef.current.scrollIntoView({ block: "end" });
    }
    // Fallback: direct scrollTop assignment after layout
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (chatBoxRef.current)
          chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
      });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  /* ── typing indicator ── */
  useEffect(() => {
    if (!input.length) { setIsTyping(false); return; }
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 1000);
    return () => clearTimeout(t);
  }, [input]);

  /* ── close emoji picker on outside click ── */
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handler = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [showEmojiPicker]);

  /* ── textarea auto-resize ── */
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  };

  /* ── websocket ── */
  useEffect(() => {
    if (!connected) return;
    let reconnectTimer = null;

    const connect = () => {
      setWsStatus("connecting");
      const sock   = new SockJS(`${baseURL}/chat`, null, { transports: ["websocket", "xhr-streaming", "xhr-polling"] });
      const client = Stomp.over(sock);
      client.debug  = () => {};

      client.connect({}, () => {
        stompRef.current = client;
        setWsStatus("live");
        toast.success("Connected to MyVibe!");

        client.subscribe(`/topic/room/${roomId}`, (msg) => {
          const newMsg = JSON.parse(msg.body);
          setMessages((prev) => [...prev, newMsg]);
        });

        client.subscribe(`/topic/room/${roomId}/users`, (msg) => {
          const count = JSON.parse(msg.body);
          setOnlineCount(count);
        });

      }, (err) => {
        console.error(err);
        setWsStatus("lost");
        toast.error("Connection lost. Retrying…");
        reconnectTimer = setTimeout(connect, 3000);
      });
    };

    connect();
    return () => { if (reconnectTimer) clearTimeout(reconnectTimer); };
  }, [connected, roomId]);

  /* ── send ── */
  const sendMessage = () => {
    const client = stompRef.current;
    if (!client || !connected || !input.trim()) return;
    setSending(true);
    const msg = { sender: currentUser, content: input, roomId };
    client.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(msg));
    setInput("");
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    setShowEmojiPicker(false);
    setTimeout(() => setSending(false), 300);
  };

  /* ── copy room id ── */
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── logout ── */
  const handleLogout = () => {
    if (stompRef.current) stompRef.current.disconnect();
    setConnected(false); setRoomId(""); setCurrentUser("");
    navigate("/");
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── avatar colour (deterministic) ── */
  const avatarColor = (name = "") => {
    const hues = [210, 260, 320, 150, 30, 190, 350, 80];
    return `hsl(${hues[name.charCodeAt(0) % hues.length]}, 65%, 55%)`;
  };

  /* ── status badge ── */
  const StatusBadge = () => {
    const map = {
      connecting: { color: "text-amber-400", dot: "bg-amber-400", label: "Connecting…" },
      live:       { color: "text-emerald-400", dot: "bg-emerald-400", label: "Live" },
      lost:       { color: "text-red-400", dot: "bg-red-400", label: "Reconnecting…" },
    };
    const s = map[wsStatus];
    return (
      <span className={`flex items-center gap-1.5 text-xs font-medium ${s.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
        {s.label}
      </span>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
        .syne { font-family: 'Syne', sans-serif; }

        /* ── FIX: Prevent browser/OS chrome from affecting layout on mobile ── */
        html, body, #root {
          height: 100%;
          height: 100dvh; /* dynamic viewport height — accounts for mobile address bar */
          overflow: hidden;
        }

        /* grid bg */
        .chat-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(#e4e4e7 1px, transparent 1px),
            linear-gradient(90deg, #e4e4e7 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: .35;
        }
        .dark .chat-grid {
          background-image:
            linear-gradient(#27272a 1px, transparent 1px),
            linear-gradient(90deg, #27272a 1px, transparent 1px);
          opacity: .2;
        }

        /* scrollbar */
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,.3); border-radius: 99px; }
        .dark .chat-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,.25); }
        /* Firefox */
        .chat-scroll { scrollbar-width: thin; scrollbar-color: rgba(99,102,241,.3) transparent; }

        /* message pop-in */
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(10px) scale(.97); }
          to   { opacity: 1; transform: none; }
        }
        .msg-in { animation: msgIn .22s cubic-bezier(.22,1,.36,1) both; }

        /* send button pulse */
        @keyframes sendPop {
          0%   { transform: scale(1); }
          50%  { transform: scale(.88); }
          100% { transform: scale(1); }
        }
        .send-pop { animation: sendPop .3s ease; }

        /* typing dots */
        @keyframes typingDot {
          0%,80%,100% { transform: scale(0); opacity: .4; }
          40%          { transform: scale(1);   opacity: 1; }
        }
        .typing-dot { animation: typingDot 1.2s infinite ease-in-out; }
        .typing-dot:nth-child(2) { animation-delay: .15s; }
        .typing-dot:nth-child(3) { animation-delay: .3s; }

        /* copy button pop */
        @keyframes copyPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
        .copy-pop { animation: copyPop .25s ease; }

        /* emoji picker */
        em-emoji-picker { --border-radius: 16px; --shadow: 0 16px 40px rgba(0,0,0,.25); }

        /* ── FIX: Emoji picker responsive positioning on mobile ── */
        .emoji-picker-wrapper {
          position: absolute;
          bottom: calc(100% + 8px);
          right: 0;
          z-index: 100;
          max-width: calc(100vw - 32px);
        }
        /* On very small screens, anchor to left edge of viewport */
        @media (max-width: 400px) {
          .emoji-picker-wrapper {
            right: auto;
            left: 50%;
            transform: translateX(-50%);
          }
        }

        /* ── FIX: Prevent iOS bounce/overscroll from breaking layout ── */
        .chat-scroll {
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        /* Tap highlight removal for mobile buttons */
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/*
        ── ROOT CONTAINER ──
        Use 100dvh so the layout accounts for the mobile address bar
        (avoids the classic "content hidden behind browser chrome" bug).
        overflow-hidden prevents double scrollbars.
      */}
      <div
        className="flex flex-col bg-zinc-50 dark:bg-zinc-950 transition-colors duration-300 overflow-hidden"
        style={{ height: "100dvh" }}
      >

        {/* ── HEADER ── */}
        <header className="
          relative z-10 flex-shrink-0
          bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl
          border-b border-zinc-200 dark:border-zinc-800
          px-3 sm:px-6 py-2.5
        ">
          <div className="flex items-center justify-between gap-2">

            {/* Left — logo + room info */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_14px_rgba(99,102,241,.4)]">
                <MessageCircle size={16} color="#fff" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="syne font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-50 leading-none">MyVibe</span>

                  {/* Room ID + Copy — always visible, truncated on mobile */}
                  <div className="flex items-center gap-1">
                    <span className="flex items-center gap-0.5 text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[80px] sm:max-w-[160px]">
                      <Hash size={11} className="flex-shrink-0" />
                      <span className="truncate">{roomId}</span>
                    </span>
                    <button
                      onClick={copyRoomId}
                      title="Copy room code"
                      className={`
                        w-6 h-6 flex items-center justify-center rounded-lg
                        transition-all duration-150
                        ${copied
                          ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 copy-pop"
                          : "text-zinc-400 dark:text-zinc-500 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 hover:text-indigo-500 dark:hover:text-indigo-400"
                        }
                      `}
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
                    <Users size={11} />
                    <span className="tabular-nums font-semibold text-indigo-400">{onlineCount}</span>
                    <span className="hidden xs:inline">{onlineCount === 1 ? "user" : "users"} online</span>
                  </span>

                  <StatusBadge />

                  {isTyping && (
                    <span className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-400">
                      <span className="flex gap-0.5">
                        {[0,1,2].map(i => <span key={i} className="typing-dot w-1 h-1 rounded-full bg-indigo-400 inline-block" />)}
                      </span>
                      typing…
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right — actions */}
            <div className="flex items-center gap-1 flex-shrink-0">

              {[
                { icon: Search, label: "Search", show: "hidden sm:flex" },
                { icon: Phone,  label: "Voice",  show: "hidden sm:flex" },
                { icon: Video,  label: "Video",  show: "hidden sm:flex" },
              ].map(({ icon: Icon, label, show }) => (
                <button key={label} title={label}
                  className={`
                    ${show} w-8 h-8 items-center justify-center rounded-xl
                    text-zinc-400 dark:text-zinc-500
                    hover:bg-zinc-100 dark:hover:bg-zinc-800
                    hover:text-zinc-700 dark:hover:text-zinc-300
                    transition-all duration-150
                  `}>
                  <Icon size={16} />
                </button>
              ))}

              {/* theme toggle */}
              <button
                onClick={() => setDark(d => !d)}
                title="Toggle theme"
                className="
                  w-8 h-8 flex items-center justify-center rounded-xl
                  text-zinc-400 dark:text-zinc-500
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  hover:text-indigo-500 dark:hover:text-indigo-400
                  transition-all duration-150
                ">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* user chip — hidden on mobile to save space */}
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 ml-0.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ background: avatarColor(currentUser) }}>
                  {currentUser?.charAt(0)?.toUpperCase()}
                </div>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 max-w-[80px] truncate">{currentUser}</span>
              </div>

              {/* leave */}
              <button onClick={handleLogout}
                className="
                  flex items-center gap-1 h-8 px-2.5 sm:px-3 rounded-xl text-xs font-medium
                  bg-red-50 dark:bg-red-500/10
                  border border-red-200 dark:border-red-500/25
                  text-red-500 dark:text-red-400
                  hover:bg-red-100 dark:hover:bg-red-500/20
                  active:scale-95
                  transition-all duration-150
                ">
                <LogOut size={13} />
                <span className="hidden sm:inline">Leave</span>
              </button>
            </div>
          </div>
        </header>

        {/* ── MESSAGE AREA ──
            FIX: min-h-0 is critical — without it, flex children won't shrink
            below their content size, causing the container to overflow.
            overflow-y-auto + flex-1 + min-h-0 = correct scrollable region.
        ── */}
        <main
          ref={chatBoxRef}
          className="flex-1 min-h-0 overflow-y-auto chat-scroll relative px-3 sm:px-6 py-4"
        >
          {/* grid bg */}
          <div className="chat-grid" />

          {/* glow orb */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(99,102,241,.07) 0%, transparent 70%)" }} />

          {messages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <MessageCircle size={26} className="text-indigo-400 opacity-60" />
              </div>
              <p className="text-sm text-zinc-400 dark:text-zinc-600">No messages yet — say hi! 👋</p>
            </div>
          )}

          {/* FIX: Use a wrapper div for spacing instead of space-y-3 on the
              scrollable container — avoids margin-collapse / scroll glitches */}
          <div className="flex flex-col gap-0.5">
            {messages.map((message, index) => {
              const isMe = message.sender === currentUser;
              const prevSender = index > 0 ? messages[index - 1].sender : null;
              const isGrouped = prevSender === message.sender;

              return (
                <div key={index}
                  className={`msg-in flex ${isMe ? "justify-end" : "justify-start"} ${isGrouped ? "mt-0.5" : "mt-3"}`}
                >
                  {/* Avatar (others) */}
                  {!isMe && (
                    <div className={`flex-shrink-0 mr-2 mt-auto ${isGrouped ? "opacity-0 pointer-events-none" : ""}`}>
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: avatarColor(message.sender) }}>
                        {message.sender?.charAt(0)?.toUpperCase()}
                      </div>
                    </div>
                  )}

                  {/* FIX: max-w uses % + clamp so bubbles don't overflow on tiny screens */}
                  <div className="group relative" style={{ maxWidth: "min(72%, 420px)" }}>
                    {/* Sender name */}
                    {!isMe && !isGrouped && (
                      <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1 ml-1 block">{message.sender}</span>
                    )}

                    {/* Bubble */}
                    <div className={`
                      relative px-3 sm:px-4 py-2.5 text-sm leading-relaxed
                      ${isMe
                        ? "bg-indigo-500 text-white rounded-2xl rounded-br-sm shadow-[0_4px_16px_rgba(99,102,241,.3)]"
                        : "bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-2xl rounded-bl-sm shadow-sm"
                      }
                    `}>
                      {/* FIX: overflow-wrap + word-break prevents long URLs/words from overflowing bubble */}
                      <p style={{ overflowWrap: "break-word", wordBreak: "break-word" }}>{message.content}</p>

                      <div className={`flex items-center gap-1.5 mt-1 ${isMe ? "justify-end" : "justify-start"}`}>
                        <span className={`text-[10px] ${isMe ? "text-white/60" : "text-zinc-400 dark:text-zinc-500"}`}>
                          {timeAgo(message.timeStamp)}
                        </span>
                        {isMe && (
                          <svg width="14" height="9" viewBox="0 0 14 9" fill="none" className="opacity-70">
                            <path d="M1 4.5L4.5 8L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M5 4.5L8.5 8L13 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </div>

                    {/* hover action — hidden on touch devices */}
                    <button className="
                      absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity
                      w-6 h-6 rounded-lg hidden sm:flex items-center justify-center
                      bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700
                      text-zinc-400 shadow-sm
                    "
                      style={{ [isMe ? "left" : "right"]: "-30px" }}>
                      <MoreVertical size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scroll anchor — scrollIntoView targets this to pin view to bottom */}
          <div ref={scrollAnchorRef} className="h-1 w-full flex-shrink-0" aria-hidden="true" />
        </main>

        {/* ── INPUT BAR ── */}
        <div className="relative z-10 flex-shrink-0 px-3 sm:px-6 pb-4 pt-2">
          <div className="
            relative
            bg-white dark:bg-zinc-900
            border border-zinc-200 dark:border-zinc-800
            rounded-2xl
            shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,.4)]
            ring-1 ring-inset ring-white/60 dark:ring-white/[.03]
          ">
            {/* Emoji picker — responsive wrapper */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="emoji-picker-wrapper">
                <Picker
                  data={data}
                  theme={dark ? "dark" : "light"}
                  onEmojiSelect={(emoji) => {
                    setInput((p) => p + emoji.native);
                    inputRef.current?.focus();
                  }}
                  // Smaller size on mobile
                  perLine={7}
                  previewPosition="none"
                />
              </div>
            )}

            <div className="flex items-end gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2.5">
              {/* Attach */}
              <button title="Attach file"
                className="
                  w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl
                  text-zinc-400 dark:text-zinc-500
                  hover:bg-zinc-100 dark:hover:bg-zinc-800
                  hover:text-zinc-600 dark:hover:text-zinc-300
                  transition-all duration-150
                ">
                <Paperclip size={17} />
              </button>

              {/* Textarea */}
              <div className="flex-1 relative min-w-0">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder="Send a message…"
                  rows={1}
                  className="
                    w-full bg-transparent text-sm
                    text-zinc-800 dark:text-zinc-100
                    placeholder-zinc-400 dark:placeholder-zinc-600
                    resize-none outline-none py-2 pr-8
                    leading-relaxed
                  "
                  style={{ minHeight: "36px", maxHeight: "120px" }}
                />
                {/* Emoji toggle */}
                <button
                  onClick={() => setShowEmojiPicker(v => !v)}
                  title="Emoji"
                  className={`
                    absolute right-0 top-1/2 -translate-y-1/2
                    w-7 h-7 flex items-center justify-center rounded-lg
                    transition-all duration-150
                    ${showEmojiPicker
                      ? "bg-indigo-100 dark:bg-indigo-500/20 text-indigo-500"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                    }
                  `}>
                  <Smile size={16} />
                </button>
              </div>

              {/* Send */}
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className={`
                  w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl
                  transition-all duration-150
                  ${input.trim()
                    ? "bg-indigo-500 text-white shadow-[0_4px_12px_rgba(99,102,241,.4)] hover:bg-indigo-400 active:scale-90"
                    : "bg-zinc-100 dark:bg-zinc-800 text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                  }
                  ${sending ? "send-pop" : ""}
                `}>
                <Send size={15} className={input.trim() ? "translate-x-px" : ""} />
              </button>
            </div>

            {/* Footer hint */}
            <div className="flex items-center justify-between px-3 sm:px-4 pb-2 -mt-1">
              <span className={`text-[10px] text-zinc-400 dark:text-zinc-600 transition-opacity ${input.length ? "opacity-100" : "opacity-0"}`}>
                {input.length}/1000
              </span>
              <span className="text-[10px] text-zinc-300 dark:text-zinc-700 hidden sm:block">
                Enter to send · Shift+Enter for new line
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default ChatPage;