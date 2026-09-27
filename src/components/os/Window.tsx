"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { X, Minus, Maximize2 } from "lucide-react";

interface WindowProps {
  id: string;
  title: string;
  isOpen: boolean;
  isActive: boolean;
  zIndex: number;
  onClose: (id: string) => void;
  onFocus: (id: string) => void;
  children: ReactNode;
  defaultSize?: { w: number | string; h: number | string };
  defaultPos?: { x: number; y: number };
}

export default function Window({ 
  id, title, isOpen, isActive, zIndex, onClose, onFocus, children, 
  defaultSize = { w: 800, h: 500 }, defaultPos = { x: 50, y: 50 } 
}: WindowProps) {
  
  if (!isOpen) return null;

  return (
    <motion.div
      drag
      dragHandle=".drag-handle"
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.95, ...defaultPos }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onMouseDown={() => onFocus(id)}
      style={{ 
        width: defaultSize.w, 
        height: defaultSize.h, 
        zIndex: isActive ? zIndex + 10 : zIndex,
        position: "absolute"
      }}
      className={`flex flex-col bg-marine/80 backdrop-blur-xl border overflow-hidden shadow-2xl transition-colors duration-200 ${isActive ? 'border-butter/40' : 'border-butter/10'}`}
    >
      {/* MAC-STYLE TITLE BAR */}
      <div className="drag-handle w-full h-10 bg-black/40 border-b border-butter/10 flex items-center justify-between px-4 cursor-grab active:cursor-grabbing">
        <div className="flex space-x-2">
          <button onClick={() => onClose(id)} className="w-3 h-3 rounded-full bg-accentRed hover:bg-red-400 flex items-center justify-center group">
            <X className="w-2 h-2 text-black opacity-0 group-hover:opacity-100" />
          </button>
          <button className="w-3 h-3 rounded-full bg-butter hover:bg-yellow-200 flex items-center justify-center group">
            <Minus className="w-2 h-2 text-black opacity-0 group-hover:opacity-100" />
          </button>
          <button className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center group">
            <Maximize2 className="w-2 h-2 text-black opacity-0 group-hover:opacity-100" />
          </button>
        </div>
        <span className="font-mono text-xs uppercase tracking-widest text-butter opacity-80 select-none">
          {title}
        </span>
        <div className="w-12" /> {/* Spacer for centering */}
      </div>

      {/* APP CONTENT */}
      <div className="flex-1 overflow-auto overflow-x-hidden p-6 custom-scrollbar">
        {children}
      </div>
    </motion.div>
  );
}