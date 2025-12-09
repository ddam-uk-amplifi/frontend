'use client';

import { FileText, Download, Sparkles } from 'lucide-react';

interface PPTGenerationBannerProps {
  selectedCount: number;
  onGenerateReport: () => void;
}

export function PPTGenerationBanner({
  selectedCount,
  onGenerateReport,
}: PPTGenerationBannerProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="sticky top-0 z-40 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="font-medium">
              {selectedCount} graph{selectedCount !== 1 ? 's' : ''} selected for PPT report
            </span>
            <p className="text-sm text-white/80">Click to preview and arrange slides</p>
          </div>
        </div>
        <button
          onClick={onGenerateReport}
          className="flex items-center gap-2 px-6 py-2.5 bg-white text-emerald-600 rounded-xl hover:bg-emerald-50 transition-all font-medium shadow-lg hover:shadow-xl hover:scale-[1.02]"
        >
          <Sparkles className="w-4 h-4" />
          Generate PPT Report
        </button>
      </div>
    </div>
  );
}
