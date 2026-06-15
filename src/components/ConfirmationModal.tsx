import React from "react";
import { AlertCircle, HelpCircle, Trash2, LogOut, CheckCircle2, X } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "info" | "danger" | "warning" | "success" | "logout";
  onConfirm: () => void;
  onCancel: () => void;
  isNightMode?: boolean;
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "info",
  onConfirm,
  onCancel,
  isNightMode = false
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const typeConfig = {
    info: {
      bg: isNightMode ? "bg-amber-950/20 border-amber-500/10" : "bg-blue-50 border-blue-100",
      iconColor: isNightMode ? "text-amber-400" : "text-blue-800",
      buttonBg: isNightMode ? "bg-amber-700 hover:bg-amber-800 focus:ring-amber-950" : "bg-blue-800 hover:bg-blue-900 focus:ring-blue-100",
      icon: <HelpCircle size={24} />
    },
    danger: {
      bg: isNightMode ? "bg-rose-950/25 border-rose-900/45" : "bg-rose-50 border-rose-100",
      iconColor: "text-rose-500",
      buttonBg: "bg-rose-800 hover:bg-rose-900 focus:ring-rose-950",
      icon: <Trash2 size={24} />
    },
    warning: {
      bg: isNightMode ? "bg-amber-950/25 border-amber-900/45" : "bg-amber-50 border-amber-100",
      iconColor: "text-amber-400",
      buttonBg: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-950",
      icon: <AlertCircle size={24} />
    },
    success: {
      bg: isNightMode ? "bg-emerald-950/25 border-emerald-900/45" : "bg-emerald-50 border-emerald-100",
      iconColor: "text-emerald-400",
      buttonBg: "bg-emerald-800 hover:bg-emerald-900 focus:ring-emerald-950",
      icon: <CheckCircle2 size={24} />
    },
    logout: {
      bg: isNightMode ? "bg-rose-950/25 border-rose-900/45" : "bg-rose-50 border-rose-100",
      iconColor: "text-rose-455",
      buttonBg: isNightMode ? "bg-gradient-to-r from-rose-800 to-rose-950 hover:opacity-90 focus:ring-rose-950" : "bg-gradient-to-r from-rose-800 to-rose-950 hover:from-rose-900 hover:to-rose-995 focus:ring-rose-200",
      icon: <LogOut size={24} />
    }
  };

  const activeTheme = typeConfig[type] || typeConfig.info;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with elegant blur */}
      <div 
        className="fixed inset-0 bg-gray-950/60 backdrop-blur-sm transition-opacity animate-fade-in" 
        onClick={onCancel}
      />
      
      {/* Modal Dialog Card */}
      <div className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl transition-all animate-in zoom-in-95 duration-150 z-10 ${
        isNightMode ? "bg-neutral-950 border-amber-500/20 text-white" : "bg-white border-rose-100 text-gray-900"
      }`}>
        <button
          onClick={onCancel}
          className={`absolute right-4 top-4 rounded-full p-1.5 transition-all ${
            isNightMode ? "text-gray-400 hover:text-white hover:bg-amber-500/10" : "text-gray-400 hover:text-gray-650 hover:bg-rose-50"
          }`}
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${activeTheme.bg} ${activeTheme.iconColor}`}>
            {activeTheme.icon}
          </div>
          <div className="flex-1 text-left">
            <h3 className={`font-serif text-lg font-bold leading-snug ${isNightMode ? "text-amber-100" : "text-gray-950"}`}>
              {title}
            </h3>
            <p className={`text-xs mt-2.5 whitespace-pre-wrap leading-relaxed ${isNightMode ? "text-gray-300" : "text-gray-600"}`}>
              {message}
            </p>
          </div>
        </div>

        {/* Buttons controls */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer active:scale-95 ${
              isNightMode ? "border-amber-500/10 bg-black/40 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow hover:opacity-95 transition-all cursor-pointer active:scale-95 ${activeTheme.buttonBg}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
