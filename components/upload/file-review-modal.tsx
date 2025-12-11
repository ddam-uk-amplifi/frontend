"use client";

import React from "react";
import { X, AlertCircle, CheckCircle, FileText } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Market } from "@/lib/utils/market-detection";

export interface FileWithMarket {
  file: File;
  detectedMarketId: number | null;
  detectedMarketCode: string;
  confidence: "high" | "low" | "none";
  selectedMarketId: number | null;
}

interface FileReviewModalProps {
  files: FileWithMarket[];
  availableMarkets: Market[];
  onConfirm: (files: FileWithMarket[]) => void;
  onCancel: () => void;
  onUpdateMarket: (index: number, marketId: number) => void;
}

export const FileReviewModal: React.FC<FileReviewModalProps> = ({
  files,
  availableMarkets,
  onConfirm,
  onCancel,
  onUpdateMarket,
}) => {
  const allMarketsSelected = files.every((f) => f.selectedMarketId !== null);
  const hasLowConfidence = files.some((f) => f.confidence === "low");
  const hasNoDetection = files.some((f) => f.confidence === "none");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Review & Confirm Files
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {files.length} file{files.length !== 1 ? "s" : ""} ready to upload
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Alert Messages */}
        <div className="space-y-2 px-6 pt-4">
          {hasNoDetection && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  Market not detected for some files
                </p>
                <p className="text-amber-700">
                  Please manually select the market for highlighted files below.
                </p>
              </div>
            </div>
          )}
          {hasLowConfidence && !hasNoDetection && (
            <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">
                  Please verify auto-detected markets
                </p>
                <p className="text-blue-700">
                  Some markets were detected with low confidence. Please confirm
                  they are correct.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* File List */}
        <div className="max-h-96 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {files.map((fileItem, index) => {
              const market = availableMarkets.find(
                (m) => m.id === fileItem.selectedMarketId,
              );

              return (
                <div
                  key={`${fileItem.file.name}-${index}`}
                  className={`rounded-lg border p-4 transition-colors ${
                    fileItem.confidence === "none"
                      ? "border-amber-300 bg-amber-50"
                      : fileItem.confidence === "low"
                        ? "border-blue-200 bg-blue-50"
                        : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* File Icon */}
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      <FileText className="h-5 w-5 text-gray-600" />
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p
                            className="truncate text-sm font-medium text-gray-900"
                            title={fileItem.file.name}
                          >
                            {fileItem.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>

                        {/* Detection Status */}
                        {fileItem.confidence === "high" && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={16} />
                            <span className="text-xs font-medium">
                              Auto-detected
                            </span>
                          </div>
                        )}
                        {fileItem.confidence === "low" && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <AlertCircle size={16} />
                            <span className="text-xs font-medium">Verify</span>
                          </div>
                        )}
                        {fileItem.confidence === "none" && (
                          <div className="flex items-center gap-1 text-amber-600">
                            <AlertCircle size={16} />
                            <span className="text-xs font-medium">
                              Required
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Market Selection */}
                      <div className="mt-3">
                        <label className="mb-1.5 block text-xs font-medium text-gray-700">
                          Market <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={fileItem.selectedMarketId?.toString() ?? ""}
                          onValueChange={(value) =>
                            onUpdateMarket(index, Number(value))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select market" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableMarkets.map((m) => (
                              <SelectItem key={m.id} value={m.id.toString()}>
                                {m.code} — {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <p className="text-sm text-gray-600">
            {allMarketsSelected ? (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircle size={16} />
                All markets assigned
              </span>
            ) : (
              <span className="text-amber-600">
                Please assign markets to all files
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onConfirm(files)}
              disabled={!allMarketsSelected}
              className="cursor-pointer bg-blue-600 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm & Upload {files.length} File
              {files.length !== 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
