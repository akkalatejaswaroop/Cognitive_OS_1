"use client";

import { useState } from "react";
import { Send, Bot, User } from "lucide-react";
import { useChatStore } from "@/store";
import { motion } from "framer-motion";

export function AIChatInterface() {
  const [input, setInput] = useState("");
  const { messages, addMessage } = useChatStore();

  const handleSend = () => {
    if (!input.trim()) return;
    
    addMessage({ id: Date.now().toString(), role: "user", content: input });
    setInput("");
    
    // Simulate AI response
    setTimeout(() => {
      addMessage({
        id: (Date.now() + 1).toString(),
        role: "agent",
        content: "Acknowledged. Initiating memory search and orchestrating agents for this task..."
      });
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-white/10">
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-3">
        <Bot className="w-5 h-5 text-blue-400" />
        <h2 className="font-semibold text-sm">Supervisor Agent</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-blue-600" : msg.role === "system" ? "bg-purple-600" : "bg-white/10 border border-white/20"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${
              msg.role === "user" 
                ? "bg-blue-600/20 border border-blue-500/30 text-white" 
                : msg.role === "system"
                ? "bg-purple-500/10 border border-purple-500/20 text-purple-200"
                : "bg-white/5 border border-white/10 text-white/80"
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="p-4 bg-black/20 border-t border-white/10">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Issue command to Cognitive OS..."
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-white/30"
          />
          <button 
            onClick={handleSend}
            className="px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
