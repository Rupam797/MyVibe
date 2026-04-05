import { useEffect, useRef, useState } from "react";
import { 
  Send, Paperclip, LogOut, Users, Hash, Smile,
  MoreVertical, Phone, Video, Search, Settings
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
    roomId,
    currentUser,
    connected,
    setConnected,
    setRoomId,
    setCurrentUser,
  } = useChatContext();

  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineCount] = useState(1);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);
  const chatBoxRef = useRef(null);
  const [stompClient, setStompClient] = useState(null);

  useEffect(() => {
    if (!connected) navigate("/");
  }, [connected, navigate]);

  useEffect(() => {
    async function loadMessages() {
      try {
        const messages = await getMessagess(roomId);
        setMessages(messages);
      } catch (error) {
        console.error("Error loading messages:", error);
      }
    }
    if (connected) loadMessages();
  }, [connected, roomId]);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTo({
        top: chatBoxRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    let timer;
    if (input.length > 0) {
      setIsTyping(true);
      timer = setTimeout(() => setIsTyping(false), 1000);
    } else {
      setIsTyping(false);
    }
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    const connectWebSocket = () => {
      const sock = new SockJS(`${baseURL}/chat`);
      const client = Stomp.over(sock);

      client.connect({}, () => {
        setStompClient(client);
        toast.success("Connected to chat!");
        client.subscribe(`/topic/room/${roomId}`, (message) => {
          const newMessage = JSON.parse(message.body);
          setMessages((prev) => [...prev, newMessage]);
        });
      });
    };

    if (connected) {
      connectWebSocket();
    }
  }, [connected, roomId]);

  const sendMessage = () => {
    if (stompClient && connected && input.trim()) {
      const message = {
        sender: currentUser,
        content: input,
        roomId: roomId,
      };
      stompClient.send(`/app/sendMessage/${roomId}`, {}, JSON.stringify(message));
      setInput("");
      setShowEmojiPicker(false);
    }
  };

  function handleLogout() {
    if (stompClient) stompClient.disconnect();
    setConnected(false);
    setRoomId("");
    setCurrentUser("");
    navigate("/");
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <header className="relative z-10 backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Hash className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">{roomId}</h1>
                <div className="flex items-center space-x-2 text-sm text-white/60">
                  <Users className="w-4 h-4" />
                  <span>{onlineCount} online</span>
                  {isTyping && (
                    <span className="flex items-center space-x-1">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                      <span className="text-green-400">Someone is typing</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 text-white/80">
              <span className="text-sm font-medium">{currentUser}</span>
              <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-white">
                  {currentUser?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-white/10 rounded-xl transition-colors"><Search className="w-5 h-5 text-white/70" /></button>
              <button className="p-2 hover:bg-white/10 rounded-xl transition-colors"><Phone className="w-5 h-5 text-white/70" /></button>
              <button className="p-2 hover:bg-white/10 rounded-xl transition-colors"><Video className="w-5 h-5 text-white/70" /></button>
              <button className="p-2 hover:bg-white/10 rounded-xl transition-colors"><Settings className="w-5 h-5 text-white/70" /></button>
            </div>

            <button
              onClick={handleLogout}
              className="group flex items-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-xl transition-all duration-300 hover:scale-105"
            >
              <LogOut className="w-4 h-4 text-red-400 group-hover:rotate-12 transition-transform" />
              <span className="text-red-400 text-sm font-medium">Leave</span>
            </button>
          </div>
        </div>
      </header>

      <main
        ref={chatBoxRef}
        className="flex-1 overflow-y-auto px-6 py-4 space-y-4 relative z-10 custom-scrollbar"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent' }}
      >
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.sender === currentUser ? "justify-end" : "justify-start"} animate-fadeIn`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl relative group ${
              message.sender === currentUser 
              ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-br-md"
              : "bg-white/10 backdrop-blur-sm border border-white/20 text-white rounded-bl-md"
            }`}>
              {message.sender !== currentUser && (
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {message.sender?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-white/90">{message.sender}</span>
                </div>
              )}
              <p className="text-sm leading-relaxed">{message.content}</p>
              <div className="flex items-center justify-end mt-2 space-x-2">
                <span className={`text-xs ${message.sender === currentUser ? "text-white/70" : "text-white/50"}`}>
                  {timeAgo(message.timeStamp)}
                </span>
                {message.sender === currentUser && (
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-white/70 rounded-full"></div>
                    <div className="w-1 h-1 bg-white/70 rounded-full"></div>
                  </div>
                )}
              </div>
              <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1 bg-black/50 backdrop-blur-sm rounded-lg">
                  <MoreVertical className="w-3 h-3 text-white" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </main>

      <div className="relative z-10 p-6">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-4 relative">
          <div className="flex items-end space-x-4">
            <button className="p-3 hover:bg-white/10 rounded-xl transition-all duration-300 hover:scale-110 group">
              <Paperclip className="w-5 h-5 text-white/70 group-hover:text-white group-hover:rotate-12 transition-all" />
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                rows={1}
                className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/25 resize-none transition-all duration-300"
                style={{ minHeight: '48px', maxHeight: '120px' }}
              />
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <Smile className="w-5 h-5 text-white/50 hover:text-white" />
              </button>
            </div>

            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="group relative p-3 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-xl transition-all duration-300 hover:scale-110 hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Send className="w-5 h-5 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <div className="absolute inset-0 rounded-xl bg-white/20 scale-0 group-active:scale-100 transition-transform duration-200"></div>
            </button>
          </div>

          <div className="mt-2 flex justify-between items-center text-xs text-white/40">
            <span>{input.length > 0 && `${input.length}/1000`}</span>
            <span>Press Enter to send • Shift+Enter for new line</span>
          </div>

          {/* Emoji Picker */}
          {showEmojiPicker && (
            <div className="absolute bottom-24 right-6 z-50 emoji-picker-container">
              <Picker
                data={data}
                onEmojiSelect={(emoji) => {
                  setInput((prev) => prev + emoji.native);
                  inputRef.current?.focus();
                }}
                theme="dark"
              />
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ChatPage;
