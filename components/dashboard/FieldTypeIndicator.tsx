"use client";

import { Hash, Percent, TrendingUp, Calendar, Tag } from "lucide-react";
import { FieldType } from "./utils/dataProcessing";

interface FieldTypeIndicatorProps {
  type: FieldType;
  size?: "sm" | "md";
}

export function FieldTypeIndicator({
  type,
  size = "sm",
}: FieldTypeIndicatorProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4";

  const config: Record<
    FieldType,
    { icon: React.ReactNode; color: string; bg: string; label: string }
  > = {
    percentage: {
      icon: <Percent className={iconSize} />,
      color: "text-purple-600",
      bg: "bg-purple-100",
      label: "Percentage",
    },
    metric: {
      icon: <Hash className={iconSize} />,
      color: "text-blue-600",
      bg: "bg-blue-100",
      label: "Value",
    },
    index: {
      icon: <TrendingUp className={iconSize} />,
      color: "text-orange-600",
      bg: "bg-orange-100",
      label: "Index",
    },
    time: {
      icon: <Calendar className={iconSize} />,
      color: "text-teal-600",
      bg: "bg-teal-100",
      label: "Trend",
    },
    dimension: {
      icon: <Tag className={iconSize} />,
      color: "text-gray-600",
      bg: "bg-gray-100",
      label: "Category",
    },
  };

  const { icon, color, bg, label } = config[type];

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 rounded ${bg} ${color}`}
      title={label}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </div>
  );
}
