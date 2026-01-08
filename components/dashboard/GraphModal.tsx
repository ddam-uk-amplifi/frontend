"use client";

import { X, FileText, Check, Maximize2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface GraphModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphId: string;
  title: string;
  children: React.ReactNode;
  isIncluded: boolean;
  onToggleInclude: () => void;
  slideNumber?: number;
  onUpdateSlideNumber?: (slideNumber: number | undefined) => void;
}

export function GraphModal({
  isOpen,
  onClose,
  title,
  children,
  isIncluded,
  onToggleInclude,
}: GraphModalProps) {
  const [mounted, setMounted] = useState(false);

  // Ensure we only render portal on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[95vw] h-[90vh] bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/60">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Maximize2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
              <p className="text-sm text-slate-500">Expanded view</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Include in PPT Report Button */}
            <button
              onClick={() => onToggleInclude()}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-medium shadow-sm
                ${
                  isIncluded
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-200"
                    : "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-violet-200"
                }
              `}
            >
              {isIncluded ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Added to PPT</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Add to PPT Report</span>
                </>
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-auto bg-gradient-to-br from-slate-50 to-slate-100/50">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
