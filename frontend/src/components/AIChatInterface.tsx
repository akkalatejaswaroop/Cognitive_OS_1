"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { useChatStore } from "@/store";
import { apiClient } from "@/lib/api";
import { motion } from "framer-motion";

export function AIChatInterface() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { messages, addMessage, updateMessage, updateAgentStatus, resetAllAgents } = useChatStore();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat on message updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setInput("");
    setIsLoading(true);
    
    const userMsgId = Date.now().toString();
    addMessage({ id: userMsgId, role: "user", content: userMessage });
    
    // Create placeholder message for agent's reply
    const agentMsgId = (Date.now() + 1).toString();
    addMessage({
      id: agentMsgId,
      role: "agent",
      content: "Dispatching task to Cognitive OS..."
    });

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      // Call backend to execute the multi-agent task
      const res = await apiClient("/api/v1/agent/execute", {
        method: "POST",
        body: JSON.stringify({ task: userMessage }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "System rejected task execution request");
      }

      const taskId = data.task_id;
      updateMessage(agentMsgId, "Connecting to agent event bus...");

      // Formulate WebSocket URL dynamically (ws:// for http, wss:// for https)
      const wsProtocol = apiBaseUrl.startsWith("https") ? "wss" : "ws";
      const host = apiBaseUrl.replace(/^https?:\/\//, "");
      const wsUrl = `${wsProtocol}://${host}/api/v1/ws/${taskId}`;
      
      const socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.status === "completed") {
            updateMessage(agentMsgId, payload.result || "Task completed successfully.");
            setIsLoading(false);
            resetAllAgents();
            socket.close();
          } else if (payload.status === "failed") {
            updateMessage(agentMsgId, `🚨 Execution Failed: ${payload.message}`);
            setIsLoading(false);
            resetAllAgents();
            socket.close();
          } else {
            // Live progress state (e.g. thinking, processing)
            updateMessage(
              agentMsgId, 
              `🤖 [${payload.agent.toUpperCase()}] ${payload.message}`
            );
            // Dynamically update agent activity panel
            updateAgentStatus(payload.agent, "executing", payload.message);
          }
        } catch (err) {
          console.error("Error parsing WebSocket packet", err);
        }
      };

      socket.onerror = (err) => {
        console.error("WebSocket connection failure:", err);
        updateMessage(
          agentMsgId, 
          "Connection failed. Please check if the local Ollama server and backend server are running."
        );
        setIsLoading(false);
        resetAllAgents();
      };

      socket.onclose = () => {
        setIsLoading(false);
      };

    } catch (err: any) {
      updateMessage(agentMsgId, `⚠️ System Connection Error: ${err.message}`);
      setIsLoading(false);
      resetAllAgents();
    }
  };

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-border">
      <div className="p-4 border-b border-border bg-muted/40 flex items-center gap-3">
        <Bot className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-sm text-foreground">Supervisor Agent</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : msg.role === "system" ? "bg-secondary text-secondary-foreground" : "bg-muted border border-border text-foreground"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`p-3 rounded-2xl max-w-[80%] text-sm whitespace-pre-line ${
              msg.role === "user" 
                ? "bg-primary/10 border border-primary/20 text-foreground" 
                : msg.role === "system"
                ? "bg-secondary/10 border border-secondary/20 text-foreground"
                : "bg-card border border-border text-foreground/80"
            }`}>
              {msg.content}
            </div>
          </motion.div>
        ))}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 bg-muted/20 border-t border-border">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            disabled={isLoading}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={isLoading ? "OS is executing task..." : "Issue command to Cognitive OS..."}
            className="flex-1 bg-muted/40 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/50 text-foreground disabled:opacity-50"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading}
            className="px-4 bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl flex items-center justify-center transition-colors disabled:bg-muted disabled:text-muted-foreground/30"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
