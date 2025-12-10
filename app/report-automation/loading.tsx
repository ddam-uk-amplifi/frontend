import { Skeleton } from '@/components/ui/skeleton';

export default function ReportAutomationLoading() {
    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="mb-8">
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-96" />
            </div>

            {/* Tabs Skeleton */}
            <div className="mb-6">
                <div className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-100 p-1">
                    <Skeleton className="h-8 w-28 rounded-lg" />
                    <Skeleton className="h-8 w-28 rounded-lg ml-1" />
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                {/* Upload Section Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                {/* Client & Config Selectors */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                </div>

                {/* Upload Area Skeleton */}
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-12 flex flex-col items-center justify-center bg-slate-50/50">
                    <Skeleton className="h-16 w-16 rounded-full mb-4" />
                    <Skeleton className="h-5 w-64 mb-2" />
                    <Skeleton className="h-4 w-48 mb-4" />
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                {/* File List Skeleton */}
                <div className="mt-8 space-y-3">
                    <Skeleton className="h-5 w-32 mb-4" />
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                        >
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-20 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Loading Indicator */}
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm mt-6">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading report automation...</span>
            </div>
        </div>
    );
}
