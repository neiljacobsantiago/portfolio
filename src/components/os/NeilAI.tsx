"use client";

import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  sender: "ai" | "user";
  text: string;
}

export default function NeilAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [input, setInput] = useState("");
  
  // Warm, conversational intro messages
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: "welcome-1", 
      sender: "ai", 
      text: "Hi there! 👋 Welcome to Neil's portfolio. I'm NeilAI." 
    },
    { 
      id: "welcome-2", 
      sender: "ai", 
      text: "I can answer questions about his rates, tech stack, or creative projects. What would you like to know?" 
    }
  ]);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  const handleSend = async (textOverride?: string) => {
    const userMsg = textOverride || input.trim();
    if (!userMsg) return;
    
    const newMessageId = Date.now().toString();
    setMessages(prev => [...prev, { id: newMessageId, sender: "user", text: userMsg }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg })
      });

      const data = await res.json();
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: "ai", text: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: "ai", text: "Sorry, my connection dropped! Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickQuestions = [
    "Who are you?",
    "What are your rates?",
    "What is your tech stack?"
  ];

  return (
    // 1. INCREASED Z-INDEX TO 9999 TO OVERRIDE THE TOP NAVBAR
    <div className="fixed bottom-24 md:bottom-28 right-6 z-[9999] flex flex-col items-end font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-80 h-[500px] bg-marine/95 backdrop-blur-2xl border border-butter/20 mb-4 flex flex-col rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden relative"
          >
            {/* 2. REFINED HEADER ALIGNMENT */}
            <div className="h-14 bg-black/40 border-b border-butter/10 flex justify-between items-center px-5 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accentRed flex items-center justify-center relative shadow-sm">
                  <span className="text-butter font-display font-bold text-[10px]">AI</span>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-marine rounded-full" />
                </div>
                <span className="font-bold text-butter tracking-wide text-sm relative top-[1px]">NeilAI</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-butter/60 hover:text-accentRed transition-colors cursor-none interactive">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Chat Log (Apple iMessage aesthetic) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`px-4 py-2.5 max-w-[80%] text-[13px] leading-relaxed shadow-sm ${
                      msg.sender === "user" 
                        ? "bg-accentRed text-butter rounded-2xl rounded-br-sm" 
                        : "bg-black/50 text-butter/90 border border-butter/10 rounded-2xl rounded-bl-sm"
                    }`}>
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                
                {/* Bouncing Typing Indicator */}
                {isTyping && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex justify-start"
                  >
                    <div className="px-4 py-3 bg-black/50 border border-butter/10 rounded-2xl rounded-bl-sm flex items-center space-x-1.5">
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-butter/60 rounded-full" />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-butter/60 rounded-full" />
                      <motion.div animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-butter/60 rounded-full" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            {/* Quick Action Chips */}
            {messages.length <= 2 && !isTyping && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="px-3 pb-2 flex flex-wrap gap-2"
              >
                {quickQuestions.map((q, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleSend(q)}
                    className="px-3 py-1.5 text-[11px] font-bold text-marine bg-butter hover:bg-white rounded-full transition-colors cursor-none interactive"
                  >
                    {q}
                  </button>
                ))}
              </motion.div>
            )}

            {/* Rounded Input Area */}
            <div className="h-16 border-t border-butter/10 flex items-center px-3 bg-marine/50">
              <div className="flex-1 bg-black/40 border border-butter/20 rounded-full flex items-center px-4 h-10">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Message NeilAI..."
                  className="flex-1 bg-transparent outline-none text-butter placeholder:text-butter/30 text-sm"
                  disabled={isTyping}
                />
              </div>
              <button 
                onClick={() => handleSend()} 
                disabled={isTyping || !input.trim()}
                className="ml-2 w-10 h-10 rounded-full bg-accentRed flex items-center justify-center text-butter hover:bg-red-500 transition-colors disabled:opacity-50 disabled:hover:bg-accentRed cursor-none interactive"
              >
                <Send className="w-4 h-4 ml-1" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Floating Action Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-accentRed flex items-center justify-center shadow-[0_10px_25px_rgba(229,26,26,0.4)] hover:scale-105 hover:bg-red-500 transition-all rounded-full cursor-none interactive border-2 border-marine"
      >
        {isOpen ? <X className="text-butter w-6 h-6" /> : <MessageSquare className="text-butter w-6 h-6" />}
      </button>
    </div>
  );
}