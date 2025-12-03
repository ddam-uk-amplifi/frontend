"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  FileText,
  Calendar,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";
import {
  consolidationApi,
  type ConsolidationJobDetail,
} from "@/lib/api/consolidation";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper to get download URL (S3 presigned or local endpoint)
const getDownloadUrl = (downloadUrl: string | null | undefined, filePath: string | null | undefined): string | null => {
  if (downloadUrl) return downloadUrl;
  if (filePath) {
    const fileName = filePath.split('/').pop();
    return `${API_BASE_URL}/api/v1/consolidation/download/${fileName}`;
  }
  return null;
};

const formatTrackerFileName = (fileName: string | null): string => {
  if (!fileName) return "";
  return fileName.replace(/^extracted_[^_]+_/, "");
};

export default function ConsolidationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [jobDetail, setJobDetail] = useState<ConsolidationJobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      fetchJobDetail();
    }
  }, [jobId]);

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await consolidationApi.getJobDetail(jobId);
      setJobDetail(data);
    } catch (err: any) {
      console.error("Failed to fetch job detail:", err);
      setError(err.response?.data?.detail || "Failed to load consolidation details");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "text-green-600 bg-green-100";
      case "failed":
        return "text-red-600 bg-red-100";
      case "processing":
        return "text-blue-600 bg-blue-100";
      case "pending":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5" />;
      case "failed":
        return <XCircle className="w-5 h-5" />;
      case "processing":
        return <Loader className="w-5 h-5 animate-spin" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !jobDetail) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push("/report-automation?tab=history")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            Back to History
          </button>
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-12 text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {error || "Failed to load details"}
            </h3>
            <p className="text-gray-500 mb-6">
              Unable to fetch consolidation job details.
            </p>
            <button
              onClick={() => router.push("/report-automation?tab=history")}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusClasses = getStatusColor(jobDetail.status);
  const statusIconElement = getStatusIcon(jobDetail.status);

  const excelUrl = getDownloadUrl(jobDetail.excel_download_url, jobDetail.excel_path);
  const pptUrl = getDownloadUrl(jobDetail.ppt_download_url, jobDetail.ppt_path);
  const hasDownloads = Boolean(excelUrl || pptUrl);

  const registeredDate = new Date(jobDetail.registered_date).toLocaleString();
  const startedDate = jobDetail.started_at
    ? new Date(jobDetail.started_at).toLocaleString()
    : null;
  const completedDate = jobDetail.completed_date
    ? new Date(jobDetail.completed_date).toLocaleString()
    : null;
  const analyzedByName = jobDetail.analyzed_by_name || jobDetail.analyzed_by_email;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          onClick={() => router.push("/report-automation?tab=history")}
          className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          <span className="text-sm font-medium">Back to History</span>
        </button>

        <section className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-gray-900">Consolidation Details</h1>
              <p className="text-sm text-gray-600">
                {jobDetail.client_name} • {jobDetail.ytd_month}
              </p>
              <p className="text-xs text-gray-500">Analyzed by {analyzedByName}</p>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusClasses}`}>
              {statusIconElement}
              <span className="capitalize">{jobDetail.status}</span>
            </span>
          </div>

          <dl className="grid grid-cols-1 gap-4 text-sm text-gray-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Registered</dt>
              <dd className="mt-1 text-gray-900">{registeredDate}</dd>
            </div>
            {startedDate && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Started</dt>
                <dd className="mt-1 text-gray-900">{startedDate}</dd>
              </div>
            )}
            {completedDate && (
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Completed</dt>
                <dd className="mt-1 text-gray-900">{completedDate}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Analyzed By</dt>
              <dd className="mt-1 text-gray-900">{jobDetail.analyzed_by_email}</dd>
            </div>
          </dl>

          {jobDetail.error_message && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {jobDetail.error_message}
            </div>
          )}

          {hasDownloads && (
            <div className="flex flex-wrap gap-3">
              {excelUrl && (
                <button
                  onClick={() => window.open(excelUrl, "_blank")}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  <Download size={18} />
                  Download Excel
                </button>
              )}
              {pptUrl && (
                <button
                  onClick={() => window.open(pptUrl, "_blank")}
                  className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                >
                  <FileText size={18} />
                  Download PowerPoint
                </button>
              )}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Tracker Files</h2>
            <p className="text-sm text-gray-600">Files processed for this consolidation job.</p>
          </div>
          {jobDetail.trackers.length === 0 ? (
            <p className="px-6 py-10 text-center text-gray-500">No tracker files found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-6 py-3 text-left">Market</th>
                    <th className="px-6 py-3 text-left">File Name</th>
                    <th className="px-6 py-3 text-left">Year</th>
                    <th className="px-6 py-3 text-left">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white text-gray-700">
                  {jobDetail.trackers.map((tracker) => (
                    <tr key={tracker.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center rounded-md bg-blue-100 px-2 py-1 text-xs font-semibold uppercase text-blue-700">
                            {tracker.market_code}
                          </span>
                          <span>{tracker.market_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="block truncate" title={formatTrackerFileName(tracker.file_name)}>
                          {formatTrackerFileName(tracker.file_name)}
                        </span>
                      </td>
                      <td className="px-6 py-3">{tracker.year}</td>
                      <td className="px-6 py-3 text-sm text-gray-500">
                        {new Date(tracker.uploaded_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
