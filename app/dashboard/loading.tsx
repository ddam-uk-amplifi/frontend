import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardLoading() {
    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100/50">
            {/* Top Bar Skeleton */}
            <div className="h-16 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm px-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-32 rounded-lg" />
                    <Skeleton className="h-9 w-36 rounded-lg" />
                    <Skeleton className="h-9 w-28 rounded-lg" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-24 rounded-lg" />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Query Builder Panel Skeleton */}
                <div className="w-80 bg-white/80 backdrop-blur-sm border-r border-slate-200/60 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <div className="space-y-3 mt-6">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <div className="space-y-1 pl-2">
                                    <Skeleton className="h-8 w-full rounded-lg" />
                                    <Skeleton className="h-8 w-full rounded-lg" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Visualization Canvas Skeleton */}
                <div className="flex-1 p-6 bg-slate-50/50">
                    <div className="h-full bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm">
                        {/* Chart Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="space-y-2">
                                <Skeleton className="h-7 w-56" />
                                <Skeleton className="h-4 w-80" />
                            </div>
                            <div className="flex gap-2">
                                <Skeleton className="h-9 w-24 rounded-lg" />
                                <Skeleton className="h-9 w-9 rounded-lg" />
                            </div>
                        </div>

                        {/* Chart Area */}
                        <div className="h-[calc(100%-120px)] flex items-end justify-between gap-3 px-8 pb-8">
                            {/* Y-axis */}
                            <div className="flex flex-col justify-between h-full py-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton key={i} className="h-3 w-10" />
                                ))}
                            </div>
                            {/* Bars */}
                            {[70, 85, 50, 95, 75, 60, 80, 45].map((height, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                    <Skeleton
                                        className="w-full rounded-t-lg"
                                        style={{ height: `${height}%` }}
                                    />
                                    <Skeleton className="h-3 w-8" />
                                </div>
                            ))}
                        </div>

                        {/* Loading Indicator */}
                        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
                            <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            <span>Loading dashboard...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
