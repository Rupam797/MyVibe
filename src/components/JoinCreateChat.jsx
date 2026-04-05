import { useState, useEffect } from "react";
import { MessageCircle, Users, Plus, LogIn, Sparkles, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { createRoomApi, joinChatApi } from "../services/RoomService";
import { useChatContext } from "../context/ChatContext";
import { useNavigate } from "react-router";

const JoinCreateChat = () => {
  const [detail, setDetail] = useState({
    roomId: "",
    userName: "",
  });
  
  const [focusedField, setFocusedField] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const { setRoomId, setCurrentUser, setConnected } =
    useChatContext();
  const navigate = useNavigate();

  // Function to generate a random room ID
  const generateRoomId = () => {
    setIsGenerating(true);
    const adjectives = ["Cool", "Fun", "Epic", "Magic", "Happy", "Bright", "Smart", "Quick"];
    const nouns = ["Room", "Space", "Zone", "Place", "Chat", "Hub", "Spot", "Lounge"];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    
    const generatedId = `${randomAdj}-${randomNoun}-${randomNum}`;
    
    // Simulate a small delay for better UX
    setTimeout(() => {
      setDetail(prev => ({ ...prev, roomId: generatedId }));
      setIsGenerating(false);
      toast.success("Room ID generated!");
    }, 500);
  };

  // Auto-generate a room ID when component mounts
  useEffect(() => {
    generateRoomId();
  }, []);

  function handleFormInputChange(event) {
    setDetail({
      ...detail,
      [event.target.name]: event.target.value,
    });
  }

  function validateForm() {
    if (detail.roomId === "" || detail.userName === "") {
      toast.error("Please fill in all fields");
      return false;
    }
    return true;
  }

  async function joinChat() {
    if (validateForm()) {
      try {
        const room = await joinChatApi(detail.roomId);
        toast.success("Successfully joined the room!");
        setCurrentUser(detail.userName);
        setRoomId(room.roomId);
        setConnected(true);
        navigate("/chat");
      } catch (error) {
        if (error.status == 400) {
          toast.error(error.response.data);
        } else {
          toast.error("Error in joining room");
        }
        console.log(error);
      }
    }
  }

  async function createRoom() {
    if (validateForm()) {
      try {
        const response = await createRoomApi(detail.roomId);
        toast.success("Room Created Successfully!");
        setCurrentUser(detail.userName);
        setRoomId(response.roomId);
        setConnected(true);
        navigate("/chat");
      } catch (error) {
        console.log(error);
        if (error.status == 400) {
          toast.error("Room already exists!");
        } else {
          toast.error("Error in creating room");
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-500"></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full opacity-30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animation: `float 6s ease-in-out infinite`
            }}
          />
        ))}
      </div>


      <div className="relative w-full max-w-md">
        {/* Main card with glassmorphism effect */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl"></div>
          
          {/* Content */}
          <div className="relative z-10">
            {/* Header with animated icon */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-6 glow-animation">
                <MessageCircle className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent mb-2">
                Chat Rooms
              </h1>
              <p className="text-white/70 text-sm flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Join or create your space
                <Sparkles className="w-4 h-4" />
              </p>
            </div>

            {/* Form */}
            <div className="space-y-6">
              {/* Username field */}
              <div className="space-y-2">
                <label className="text-white/90 text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Your Name
                </label>
                <div className="relative">
                  <input
                    onChange={handleFormInputChange}
                    onFocus={() => setFocusedField("userName")}
                    onBlur={() => setFocusedField("")}
                    value={detail.userName}
                    type="text"
                    id="name"
                    name="userName"
                    placeholder="Enter your display name"
                    className={`w-full px-4 py-4 bg-white/10 border ${
                      focusedField === "userName" 
                        ? "border-purple-400 shadow-lg shadow-purple-400/25" 
                        : "border-white/20"
                    } rounded-2xl text-white placeholder-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:border-purple-400 focus:shadow-lg focus:shadow-purple-400/25`}
                  />
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 transition-opacity duration-300 pointer-events-none ${
                    focusedField === "userName" ? "opacity-100" : ""
                  }`}></div>
                </div>
              </div>

              {/* Room ID field */}
              <div className="space-y-2">
                <label className="text-white/90 text-sm font-medium flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  Room ID
                </label>
                <div className="relative">
                  <div className="flex gap-2">
                    <input
                      name="roomId"
                      onChange={handleFormInputChange}
                      onFocus={() => setFocusedField("roomId")}
                      onBlur={() => setFocusedField("")}
                      value={detail.roomId}
                      type="text"
                      id="roomId"
                      placeholder="Enter room ID"
                      className={`flex-1 px-4 py-4 bg-white/10 border ${
                        focusedField === "roomId" 
                          ? "border-purple-400 shadow-lg shadow-purple-400/25" 
                          : "border-white/20"
                      } rounded-2xl text-white placeholder-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:border-purple-400 focus:shadow-lg focus:shadow-purple-400/25`}
                    />
                    <button
                      onClick={generateRoomId}
                      disabled={isGenerating}
                      className="px-4 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl text-white font-medium transition-all duration-300 flex items-center justify-center disabled:opacity-70"
                    >
                      {isGenerating ? (
                        <RefreshCw className="w-5 h-5 spin" />
                      ) : (
                        <RefreshCw className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 transition-opacity duration-300 pointer-events-none ${
                    focusedField === "roomId" ? "opacity-100" : ""
                  }`}></div>
                  <p className="text-xs text-white/60 mt-2">
                    {isGenerating ? "Generating..." : "Need a room ID? Click the refresh icon"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={joinChat}
                  className="flex-1 group relative px-6 py-4 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-2xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-blue-500/25"
                >
                  <div className="flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                    Join Room
                  </div>
                </button>

                <button
                  onClick={createRoom}
                  className="flex-1 group relative px-6 py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-2xl text-white font-semibold transition-all duration-300 transform hover:scale-105 hover:shadow-xl hover:shadow-orange-500/25"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                    Create Room
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-8 pt-6 border-t border-white/10">
              <p className="text-white/50 text-xs">
                Connect instantly • Share seamlessly • Chat privately
              </p>
            </div>
          </div>
        </div>

        {/* Additional glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl blur-xl -z-10 animate-pulse"></div>
      </div>
    </div>
  );
};

export default JoinCreateChat;