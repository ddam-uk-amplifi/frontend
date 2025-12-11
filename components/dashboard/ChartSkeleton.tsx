"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3, TrendingUp, PieChart } from "lucide-react";

interface ChartSkeletonProps {
  type?: "bar" | "pie" | "line" | "kpi" | "table";
}

export function ChartSkeleton({ type = "bar" }: ChartSkeletonProps) {
  if (type === "kpi") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm animate-pulse"
          >
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-10 w-32 mb-2" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "pie") {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="flex items-center justify-center h-[450px]">
          <div className="relative">
            <div className="w-72 h-72 rounded-full border-[40px] border-slate-200 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <PieChart className="w-12 h-12 text-slate-300" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "line") {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-4 w-64 mb-6" />
        <div className="h-[450px] flex items-end justify-between gap-1 px-8">
          {/* Y-axis labels */}
          <div className="flex flex-col justify-between h-full py-4 pr-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
          {/* Line chart skeleton */}
          <div className="flex-1 h-full flex items-center justify-center">
            <svg className="w-full h-[80%]" viewBox="0 0 400 200">
              <path
                d="M 0 150 Q 50 120 100 130 T 200 100 T 300 80 T 400 60"
                fill="none"
                stroke="#E2E8F0"
                strokeWidth="3"
                className="animate-pulse"
              />
            </svg>
          </div>
        </div>
        {/* X-axis labels */}
        <div className="flex justify-between px-16 mt-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
        {/* Table header */}
        <div className="border-b border-slate-200 pb-3 mb-3">
          <div className="grid grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
        {/* Table rows */}
        {[1, 2, 3, 4, 5, 6, 7, 8].map((row) => (
          <div
            key={row}
            className="grid grid-cols-5 gap-4 py-3 border-b border-slate-100"
          >
            {[1, 2, 3, 4, 5].map((col) => (
              <Skeleton key={col} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Default: Bar chart skeleton
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-4 w-64 mb-6" />
      <div className="h-[450px] flex items-end justify-between gap-2 px-8">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between h-full py-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-3 w-8" />
          ))}
        </div>
        {/* Bars */}
        {[65, 80, 45, 90, 70, 55].map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2">
            <Skeleton
              className="w-full rounded-t-lg animate-pulse"
              style={{ height: `${height}%` }}
            />
            <Skeleton className="h-3 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardLoadingState({ chartType }: { chartType?: string }) {
  const getSkeletonType = () => {
    switch (chartType) {
      case "pie-chart":
        return "pie";
      case "line-chart":
      case "area-chart":
        return "line";
      case "table":
        return "table";
      default:
        return "bar";
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-xl bg-slate-100 animate-pulse">
          <BarChart3 className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      {/* Chart skeleton */}
      <ChartSkeleton type={getSkeletonType()} />

      {/* Loading indicator */}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span>Loading data...</span>
      </div>
    </div>
  );
}
