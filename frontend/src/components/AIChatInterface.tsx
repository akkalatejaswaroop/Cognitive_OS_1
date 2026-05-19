"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, Terminal, Activity, ArrowRight } from "lucide-react";
import { useChatStore } from "@/store";
import { apiClient } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
      content: "Sending request..."
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
      updateMessage(agentMsgId, "Connecting to server...");

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
          "Connection failed. Please check if the local server and backend server are running."
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
    <div className="flex flex-col h-full glass-panel rounded-2xl overflow-hidden border border-border shadow-sm">
      
      {/* ── HEADER PANEL ── */}
      <div className="p-4 border-b border-border/80 bg-muted/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-foreground dark:text-primary">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-semibold text-xs tracking-wider uppercase text-foreground/90 font-mono">AI Assistant Chat</h2>
            <p className="text-[9px] text-muted-foreground font-light">Ask a question or enter a command</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-foreground glow-dot" />
          <span className="text-[10px] text-muted-foreground font-mono font-medium">Ready</span>
        </div>
      </div>
      
      {/* ── MESSAGES CONTAINER ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar bg-card/25">
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="p-4 rounded-full bg-muted/30 border border-border/80">
                <Sparkles className="w-8 h-8 text-foreground dark:text-primary animate-pulse-slow" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display font-medium text-base text-foreground italic">Assistant Ready</h3>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed font-light">
                  Enter a message to talk to the AI assistant...
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              const isSystem = msg.role === "system";

              return (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  key={msg.id}
                  className={cn(
                    "flex gap-3 max-w-[85%] items-start",
                    isUser ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border text-[10px] font-semibold transition-all shadow-sm",
                    isUser 
                      ? "bg-foreground/10 text-foreground border-foreground/20 dark:bg-primary/10 dark:text-primary dark:border-primary/20" 
                      : isSystem 
                      ? "bg-foreground/10 text-foreground border-foreground/20" 
                      : "bg-muted/80 border-border text-foreground"
                  )}>
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div className="space-y-1">
                    <div className={cn(
                      "text-[9px] font-mono text-muted-foreground",
                      isUser ? "text-right" : "text-left"
                    )}>
                      {isUser ? "USER" : isSystem ? "SYSTEM" : "ASSISTANT"}
                    </div>
                    
                    <div className={cn(
                      "p-3.5 text-xs leading-relaxed font-light shadow-sm transition-all",
                      isUser 
                        ? "bg-foreground/5 dark:bg-primary/5 border border-foreground/20 dark:border-primary/20 rounded-2xl rounded-tr-sm text-foreground" 
                        : isSystem
                        ? "bg-foreground/5 border border-foreground/20 rounded-2xl rounded-tl-sm text-foreground"
                        : "bg-card border border-border/80 rounded-2xl rounded-tl-sm text-foreground/90"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </div>

      {/* ── COMMAND INPUT MODULE ── */}
      <div className="p-4 bg-muted/20 border-t border-border/80">
        <div className="flex gap-2 relative group items-stretch">
          <div className="relative flex-1 flex items-center">
            <input
              type="text"
              value={input}
              disabled={isLoading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={isLoading ? "Processing..." : "Message assistant..."}
              className="w-full bg-muted/40 border border-border/80 rounded-xl pl-4 pr-10 py-3.5 text-xs focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground/40 text-foreground disabled:opacity-60 disabled:cursor-not-allowed font-sans font-light"
            />
            <Terminal className="absolute right-3.5 w-4 h-4 text-muted-foreground/35 pointer-events-none group-focus-within:text-primary/50 transition-colors" />
          </div>
          
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn(
              "px-5 rounded-xl flex items-center justify-center transition-all duration-300 font-semibold border shadow-sm shrink-0",
              input.trim() && !isLoading
                ? "bg-primary text-primary-foreground border-primary/20 hover:bg-primary/90 hover:shadow-md cursor-pointer"
                : "bg-muted border-border/80 text-muted-foreground/35 cursor-not-allowed"
            )}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
