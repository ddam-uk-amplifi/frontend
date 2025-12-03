"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, Calendar, Clock, User, CheckCircle, XCircle, Loader } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => router.push("/report-automation?tab=history")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to History
        </button>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">
              Consolidation Details
            </h1>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium ${getStatusColor(jobDetail.status)}`}>
              {getStatusIcon(jobDetail.status)}
              <span className="capitalize">{jobDetail.status}</span>
            </div>
          </div>
          <p className="text-gray-500">Job ID: {jobDetail.id}</p>
        </div>

        {/* Job Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Job Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-start gap-3 mb-4">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Client</p>
                  <p className="text-base text-gray-900 capitalize">{jobDetail.client_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 mb-4">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Analyzed By</p>
                  <p className="text-base text-gray-900">{jobDetail.analyzed_by_email}</p>
                  <p className="text-sm text-gray-500">{jobDetail.analyzed_by_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">YTD Month</p>
                  <p className="text-base text-gray-900">{jobDetail.ytd_month}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-start gap-3 mb-4">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Registered Date</p>
                  <p className="text-base text-gray-900">
                    {new Date(jobDetail.registered_date).toLocaleString()}
                  </p>
                </div>
              </div>
              {jobDetail.started_at && (
                <div className="flex items-start gap-3 mb-4">
                  <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Started At</p>
                    <p className="text-base text-gray-900">
                      {new Date(jobDetail.started_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {jobDetail.completed_date && (
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Completed Date</p>
                    <p className="text-base text-gray-900">
                      {new Date(jobDetail.completed_date).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message */}
          {jobDetail.error_message && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-1">Error Message:</p>
              <p className="text-sm text-red-700">{jobDetail.error_message}</p>
            </div>
          )}

          {/* Download Buttons */}
          {jobDetail.status === "completed" && (jobDetail.excel_download_url || jobDetail.excel_path || jobDetail.ppt_download_url || jobDetail.ppt_path) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-3">Download Results:</p>
              <div className="flex gap-3">
                {(jobDetail.excel_download_url || jobDetail.excel_path) && (
                  <button
                    onClick={() => {
                      const url = getDownloadUrl(jobDetail.excel_download_url, jobDetail.excel_path);
                      if (url) window.open(url, '_blank');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Download size={18} />
                    Download Excel
                  </button>
                )}
                {(jobDetail.ppt_download_url || jobDetail.ppt_path) && (
                  <button
                    onClick={() => {
                      const url = getDownloadUrl(jobDetail.ppt_download_url, jobDetail.ppt_path);
                      if (url) window.open(url, '_blank');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    <Download size={18} />
                    Download PowerPoint
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tracker Files */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Tracker Files ({jobDetail.trackers.length})
          </h2>
          {jobDetail.trackers.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tracker files found.</p>
          ) : (
            <div className="space-y-3">
              {jobDetail.trackers.map((tracker) => (
                <div
                  key={tracker.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Market Code</p>
                      <p className="text-sm font-semibold text-gray-900 bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
                        {tracker.market_code}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Market Name</p>
                      <p className="text-sm text-gray-900">{tracker.market_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">File Name</p>
                      <p className="text-sm text-gray-900 truncate" title={tracker.file_name}>
                        {tracker.file_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Year</p>
                      <p className="text-sm text-gray-900">{tracker.year}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Uploaded: {new Date(tracker.uploaded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
