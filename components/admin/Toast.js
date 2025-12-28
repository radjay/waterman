"use client";

import { useEffect } from "react";
import { X, CheckCircle, AlertCircle } from "lucide-react";

export function Toast({ message, type = "success", onClose, duration = 3000 }) {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const bgColor = type === "success" ? "bg-green-500" : "bg-red-500";
  const Icon = type === "success" ? CheckCircle : AlertCircle;

  return (
    <div
      className={`fixed top-4 right-4 z-50 ${bgColor} text-white rounded-lg shadow-lg px-4 py-3 min-w-[300px] max-w-md flex items-center gap-3 animate-in slide-in-from-top-5`}
    >
      <Icon size={20} className="flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 rounded p-1 transition-colors"
        aria-label="Close"
      >
        <X size={16} />
      </button>
    </div>
  );
}

