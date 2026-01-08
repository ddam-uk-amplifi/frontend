"use client";

import { AlertTriangle, Info } from "lucide-react";

interface DataDensityWarningProps {
  message: string;
  severity: "info" | "warning" | "error";
}

export function DataDensityWarning({
  message,
  severity,
}: DataDensityWarningProps) {
  const getStyles = () => {
    switch (severity) {
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-800",
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-800",
          icon: <AlertTriangle className="w-5 h-5 text-yellow-600" />,
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-800",
          icon: <Info className="w-5 h-5 text-blue-600" />,
        };
    }
  };

  const styles = getStyles();

  return (
    <div
      className={`${styles.bg} border ${styles.border} rounded-xl p-4 mb-4 flex items-start gap-3`}
    >
      <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
      <div className="flex-1">
        <p className={`text-sm ${styles.text}`}>{message}</p>
      </div>
    </div>
  );
}
