"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { Upload, Trash2, Plus, X, Download } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// --- Client ID Mapping to satisfy API's integer client_id requirement ---
const clientMap = {
  arla: 1,
  carlsberg: 2,
  kering: 3,
};
type ClientIdString = keyof typeof clientMap;

interface Market {
  id: number; // UI row ID
  marketId: number | null; // DB market ID (required by backend)
  code?: string; // Market code from DB
  name?: string; // Market name from DB
  file: File | null;
}

interface TableInfo {
  name: string;
  rows: number;
  columns: number;
}

interface UploadProgress {
  id: string;
  marketId: number;
  marketCode: string;
  fileName: string;
  progress: number;
  status: "uploading" | "complete" | "failed";
  error?: string;
  // Extraction response data
  jobId?: string;
  tablesExtracted?: number;
  tableInfo?: TableInfo[];
  downloadUrl?: string;
  extractedPath?: string; // Path to extracted file
}

function ReportAutomationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("data-upload");
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "history") {
      setActiveTab("history");
    }
  }, [searchParams]);

  // Use the key type for safer state management
const [clientId, setClientId] = useState<ClientIdString>("arla");
const clientNumberId = clientMap[clientId]; // <-- FIX


  // Client companies - lowercase names for API
  const clients = [
    { id: "arla", name: "Arla" },
    { id: "carlsberg", name: "Carlsberg" },
    { id: "kering", name: "Kering" },
  ];

  const [markets, setMarkets] = useState<Market[]>([]);
  const [availableMarkets, setAvailableMarkets] = useState<
    { id: number; code: string; name: string }[]
  >([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  // Consolidation parameters
  const [ytdMonth, setYtdMonth] = useState("Dec");
  const [includePpt, setIncludePpt] = useState(false);
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState<any>(null);
  
  // Track total markets to upload for accurate consolidation triggering
  const totalMarketsToUploadRef = useRef(0);

  // Fetch available markets on mount
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await apiClient.get("/api/v1/markets");
        setAvailableMarkets(response.data.markets || []);
      } catch (error) {
        console.error("Failed to fetch markets:", error);
      }
    };
    fetchMarkets();
  }, []);

  // --- Mock History Data (unchanged) ---
  const historyData = [
    {
      id: 1,
      projectName: "Q4 Financials",
      analyzedBy: "Jane Smith",
      registeredDate: "2023-10-15",
      completedDate: "2023-10-16",
      status: "completed",
      markets: [
        { name: "North America", fileName: "NA_sales_data_Q4.xlsx" },
        { name: "Europe", fileName: "EU_market_trends_2023.xlsx" },
      ],
    },
    {
      id: 2,
      projectName: "Annual Marketing Review",
      analyzedBy: "John Doe",
      registeredDate: "2023-10-12",
      completedDate: "2023-10-12",
      status: "completed",
      markets: [],
    },
    {
      id: 3,
      projectName: "Product Launch Analysis",
      analyzedBy: "Emily White",
      registeredDate: "2023-09-28",
      completedDate: "2023-09-29",
      status: "failed",
      markets: [],
    },
  ];
  // --- End Mock History Data ---

  const toggleRow = (id: number) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(expandedRows.filter((rowId) => rowId !== id));
    } else {
      setExpandedRows([...expandedRows, id]);
    }
  };

  const addMarket = () => {
    setMarkets([
      ...markets,
      {
        id: Date.now(),
        marketId: null,
        code: "",
        name: "",
        file: null,
      },
    ]);
  };

  const removeMarket = (id: number) => {
    setMarkets(markets.filter((market) => market.id !== id));
    // Remove any upload progress for this market
    setUploadProgress((prev) => prev.filter((p) => p.marketId !== id));
  };

  // FIX: Renamed from updateMarketCode to be clearer (Market Code is the API field)
  const updateMarketCode = (id: number, marketCode: string) => {
    setMarkets(
      markets.map((market) =>
        market.id === id
          ? { ...market, marketCode: marketCode.toUpperCase() }
          : market
      )
    );
  };


  const updateMarketId = (rowId: number, selectedMarketId: number) => {
    const marketInfo = availableMarkets.find((m) => m.id === selectedMarketId);

    setMarkets(
      markets.map((m) =>
        m.id === rowId
          ? {
              ...m,
              marketId: selectedMarketId,
              code: marketInfo?.code || "",
              name: marketInfo?.name || "",
            }
          : m
      )
    );
  };

  const handleFileSelect = (marketId: number, file: File) => {
    // Just update market with selected file, don't upload yet
    setMarkets(
      markets.map((market) =>
        market.id === marketId ? { ...market, file } : market
      )
    );
  };

  const handleConsolidation = async (completedUploads: UploadProgress[]) => {
    // Filter only successful extractions
    const successfulExtractions = completedUploads.filter(
      (p) => p.status === "complete" && p.extractedPath
    );

    if (successfulExtractions.length === 0) {
      console.log("No successful extractions to consolidate");
      return;
    }

    setIsConsolidating(true);
    console.log("Starting consolidation...");

    try {
      // Collect extracted paths and market names
      const extractedPaths = successfulExtractions.map((p) => p.extractedPath!);
      const marketNames = successfulExtractions.map((p) => p.marketCode);

      // Prepare consolidation request
      const consolidationData = {
        client_name: clientId, // lowercase client name
        // markets: marketNames,
        extracted_paths: extractedPaths,
        ytd_month: ytdMonth,
        include_ppt: includePpt,
      };

      console.log("Consolidation request:", consolidationData);

      const response = await apiClient.post(
        "/api/v1/consolidation",
        consolidationData
      );

      console.log("Consolidation job created:", response.data);
      const jobId = response.data.id;

      // Poll for consolidation completion
      const maxWaitSeconds = 300; // 5 minutes
      const pollIntervalMs = 2000; // 2 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitSeconds * 1000) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

        const statusResponse = await apiClient.get(`/api/v1/consolidation/${jobId}`);
        const job = statusResponse.data;

        console.log(`Consolidation status: ${job.status}`);

        if (job.status === 'completed') {
          console.log("Consolidation completed successfully!");
          setConsolidationResult(job);
          break;
        } else if (job.status === 'failed') {
          console.error("Consolidation failed:", job.error_message);
          setConsolidationResult({
            error: true,
            message: job.error_message || "Consolidation failed"
          });
          break;
        }
        // Continue polling if status is still 'pending' or 'processing'
      }
    } catch (error: any) {
      console.error("Consolidation error:", error);
      setConsolidationResult({
        error: true,
        message: error.response?.data?.detail || error.response?.data?.message || "Consolidation failed"
      });
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleRunAutomation = async () => {
    const marketsToUpload = markets.filter(
     (m) => m.file !== null && m.marketId !== null
    );

    if (marketsToUpload.length === 0) {
      alert("Please select at least one market and upload a file.");
      return;
    }

    // Clear previous results and set expected count
    setUploadProgress([]);
    setConsolidationResult(null);
    totalMarketsToUploadRef.current = marketsToUpload.length;

    // Upload all files
    for (const market of marketsToUpload) {
      if (!market.file) continue;

      const uploadId = `${market.id}-${Date.now()}`;
      const marketCode = market.code || "";


      // Add to upload progress
      setUploadProgress((prev) => [
        ...prev,
        {
          id: uploadId,
          marketId: market.id,
          marketCode,
          fileName: market.file!.name,
          progress: 0,
          status: "uploading",
        },
      ]);

      // Create form data for extraction API
      const formData = new FormData();
      formData.append("file", market.file);
      formData.append("client_id", clientNumberId.toString());
      formData.append("market_id", market.marketId!.toString());

      try {
        // FIX: The API endpoint is correct, but removing redundant query param as data is in form-data
        const response = await apiClient.post(
          "/api/v1/extraction/extract",
          formData,
          {
            onUploadProgress: (progressEvent) => {
              const progress = progressEvent.total
                ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                : 0;

              setUploadProgress((prev) =>
                prev.map((p) => (p.id === uploadId ? { ...p, progress } : p))
              );
            },
          }
        );

        // Mark as complete with extraction data (mapping API response fields)
        const extractionData = response.data;
        console.log('✅ Extraction completed for:', market.code);
        console.log('📦 Full extraction response:', extractionData);
        console.log('📄 Output file path:', extractionData.output_file);
        console.log('📥 Download URL:', extractionData.download_url);

        setUploadProgress((prev) => {
          const updated = prev.map((p) =>
            p.id === uploadId
              ? {
                  ...p,
                  status: "complete" as const,
                  progress: 100,
                  jobId: extractionData.job_id,
                  tablesExtracted: extractionData.tables_extracted || 0,
                  tableInfo: extractionData.table_info || [],
                  downloadUrl: extractionData.download_url,
                  extractedPath: extractionData.output_file, // Store for consolidation
                }
              : p
          );

          // Check if all extractions are complete - compare with EXPECTED count
          const completedCount = updated.filter((p) => p.status === "complete").length;
          const failedCount = updated.filter((p) => p.status === "failed").length;
          const totalProcessed = completedCount + failedCount;
          const expectedTotal = totalMarketsToUploadRef.current;

          console.log(`📊 Progress: ${completedCount} completed, ${failedCount} failed, ${totalProcessed}/${expectedTotal} total`);

          // Only trigger consolidation when we've processed ALL expected markets
          if (totalProcessed === expectedTotal && completedCount > 0) {
            console.log('🎯 All extractions done! Triggering consolidation...');
            // Trigger consolidation after a short delay to ensure UI updates
            setTimeout(() => handleConsolidation(updated), 500);
          }

          return updated;
        });
      } catch (error: any) {
        console.error("Upload error:", error);
        // Mark as failed
        setUploadProgress((prev) => {
          const updated = prev.map((p) =>
            p.id === uploadId
              ? {
                  ...p,
                  status: "failed" as const,
                  error:
                    error.response?.data?.message ||
                    error.response?.data?.detail ||
                    "Upload failed",
                }
              : p
          );

          // Check if all extractions are complete after failure too
          const completedCount = updated.filter((p) => p.status === "complete").length;
          const failedCount = updated.filter((p) => p.status === "failed").length;
          const totalProcessed = completedCount + failedCount;
          const expectedTotal = totalMarketsToUploadRef.current;

          console.log(`📊 Progress after error: ${completedCount} completed, ${failedCount} failed, ${totalProcessed}/${expectedTotal} total`);

          // Only trigger consolidation when we've processed ALL expected markets
          if (totalProcessed === expectedTotal && completedCount > 0) {
            console.log('🎯 All extractions done (some failed)! Triggering consolidation...');
            setTimeout(() => handleConsolidation(updated), 500);
          }

          return updated;
        });
      }
    }
  };

  const handleFileInputChange = (
    marketId: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(marketId, file);
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploadProgress((prev) => prev.filter((p) => p.id !== uploadId));
  };

  const handleDownloadConsolidation = (type: 'excel' | 'ppt' = 'excel') => {
    if (!consolidationResult || consolidationResult.error) return;

    const downloadUrl = type === 'excel'
      ? consolidationResult.excel_download_url
      : consolidationResult.ppt_download_url;

    if (!downloadUrl) {
      console.error(`No ${type} download URL in consolidation result`);
      return;
    }

    console.log(`Downloading ${type} file from:`, downloadUrl);

    // Open download URL directly (signed S3 URL)
    window.open(downloadUrl, '_blank');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
        return "text-green-600";
      case "uploading":
        return "text-blue-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-500";
      case "uploading":
        return "bg-blue-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getFileIcon = (status: string) => {
    const baseClasses = "w-8 h-10 flex items-center justify-center rounded";
    switch (status) {
      case "complete":
        return `${baseClasses} bg-green-100 text-green-600`;
      case "uploading":
        return `${baseClasses} bg-yellow-100 text-yellow-600`;
      case "failed":
        return `${baseClasses} bg-red-100 text-red-600`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      "in-progress": "bg-yellow-100 text-yellow-700",
    };
    const labels = {
      completed: "Completed",
      failed: "Failed",
      "in-progress": "In Progress",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Report Automation
          </h1>
          <p className="text-gray-600">
            Create new jobs and view past history.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab("data-upload")}
              className={`pb-4 px-1 font-medium transition-colors cursor-pointer ${
                activeTab === "data-upload"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Data Upload
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-4 px-1 font-medium transition-colors cursor-pointer ${
                activeTab === "history"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === "data-upload" && (
          <div className="space-y-6">
            {/* Create New Automation Job */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Create New Automation Job
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Client Company <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) =>
                      setClientId(e.target.value as ClientIdString)
                    }
                    className="w-full px-4 py-2 border  rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
                    required
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Consolidation Options */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      YTD Month <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ytdMonth}
                      onChange={(e) => setYtdMonth(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white cursor-pointer"
                    >
                      <option value="Jan">January</option>
                      <option value="Feb">February</option>
                      <option value="Mar">March</option>
                      <option value="Apr">April</option>
                      <option value="May">May</option>
                      <option value="Jun">June</option>
                      <option value="Jul">July</option>
                      <option value="Aug">August</option>
                      <option value="Sep">September</option>
                      <option value="Oct">October</option>
                      <option value="Nov">November</option>
                      <option value="Dec">December</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-7">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includePpt}
                        onChange={(e) => setIncludePpt(e.target.checked)}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-900">
                        Include PowerPoint
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Market Data */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Add Market Data
              </h2>

              <div className="space-y-4">
                {markets.map((market) => (
                  <div key={market.id}>
                    <div className="flex items-start gap-3">
                      {/* Market Code Input (Required by API) */}
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Market Code <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={market.marketId ?? ""}
                          onChange={(e) =>
                            updateMarketId(market.id, Number(e.target.value))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select Market</option>
                          {availableMarkets.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.code} — {m.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[market.id] = el;
                        }}
                        type="file"
                        accept=".xlsx,.xls,.xlsb,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.ms-excel.sheet.binary.macroEnabled.12,text/csv"
                        onChange={(e) => handleFileInputChange(market.id, e)}
                        className="hidden"
                      />

                      {/* Upload Button */}
                      <button
                        onClick={() =>
                          fileInputRefs.current[market.id]?.click()
                        }
                        className="mt-7 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium cursor-pointer whitespace-nowrap"
                      >
                        <Upload size={18} />
                        Upload File
                      </button>

                      {/* Remove Button */}
                      <button
                        onClick={() => removeMarket(market.id)}
                        className="mt-7 p-2 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    {market.file && (
                      <div className="mt-2 ml-0 text-sm text-gray-600 flex items-center gap-2">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>{market.file.name}</span>
                        <span className="text-gray-400">
                          ({(market.file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    )}
                  </div>
                ))}

                <button
                  onClick={addMarket}
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium cursor-pointer"
                >
                  <Plus size={18} />
                  Add Another Market
                </button>
              </div>
            </div>

            {/* File Upload Status */}
            {uploadProgress.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  File Upload Status
                </h2>

                <div className="space-y-4">
                  {uploadProgress.map((upload) => (
                    <div key={upload.id} className="flex items-center gap-4">
                      <div className={getFileIcon(upload.status)}>
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm font-medium text-gray-900">
                              {upload.fileName}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              ({upload.marketCode})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">
                              {upload.progress}%
                            </span>
                            <span
                              className={`text-sm font-medium ${getStatusColor(
                                upload.status
                              )}`}
                            >
                              {upload.status === "complete" && "Complete"}
                              {upload.status === "uploading" && "Uploading..."}
                              {upload.status === "failed" && "Failed"}
                            </span>
                            <button
                              onClick={() => removeUpload(upload.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${getProgressColor(
                              upload.status
                            )}`}
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>

                        {/* Error message */}
                        {upload.error && (
                          <p className="text-xs text-red-600 mt-1">
                            {upload.error}
                          </p>
                        )}

                        {/* Extraction results */}
                        {upload.status === "complete" && upload.jobId && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-800">
                                  ✓ Extraction Completed (ID: {upload.jobId})
                                </p>
                                {upload.extractedPath && (
                                  <p className="text-xs text-green-700 mt-1 font-mono break-all">
                                    📂 {upload.extractedPath}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extraction Summary - Show when all extractions complete */}
            {uploadProgress.length > 0 &&
              uploadProgress.every((p) => p.status === "complete" || p.status === "failed") &&
              uploadProgress.some((p) => p.status === "complete") &&
              !isConsolidating && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-900 mb-2">
                    ✅ All Extractions Completed!
                  </h3>
                  <div className="text-xs text-green-800 space-y-1">
                    <p>
                      • Successfully extracted:{" "}
                      {uploadProgress.filter((p) => p.status === "complete").length} file(s)
                    </p>
                    <p>
                      • Markets: {uploadProgress.filter((p) => p.status === "complete").map((p) => p.marketCode).join(", ")}
                    </p>
                    <p className="mt-2 font-medium">
                      Consolidation will start automatically...
                    </p>
                  </div>
                </div>
              )}

            {/* Consolidation Status */}
            {isConsolidating && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Consolidating reports...
                    </p>
                    <p className="text-xs text-blue-700">
                      Please wait while we combine all extracted data.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Consolidation Result */}
            {consolidationResult && (
              <div className={`rounded-lg p-4 ${
                consolidationResult.error
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {consolidationResult.error ? (
                      <>
                        <h3 className="text-sm font-semibold text-red-900 mb-2">
                          ❌ Consolidation Failed
                        </h3>
                        <p className="text-xs text-red-800">
                          {consolidationResult.message}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold text-green-900 mb-2">
                          ✅ Consolidation Completed Successfully!
                        </h3>
                        <div className="text-xs text-green-800 space-y-1">
                          {consolidationResult.id && (
                            <p>• Job ID: {consolidationResult.id}</p>
                          )}
                          {consolidationResult.status && (
                            <p>• Status: <span className="font-semibold capitalize">{consolidationResult.status}</span></p>
                          )}
                          {consolidationResult.excel_download_url && (
                            <p>• ✅ Excel file ready for download</p>
                          )}
                          {consolidationResult.ppt_download_url && (
                            <p>• ✅ PowerPoint file ready for download</p>
                          )}
                          {consolidationResult.completed_at && (
                            <p>• Completed: {new Date(consolidationResult.completed_at).toLocaleString()}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setConsolidationResult(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* Run Automation Button */}
            <div className="flex justify-end gap-3">
              {consolidationResult && !consolidationResult.error && consolidationResult.excel_download_url && (
                <>
                  <button
                    onClick={() => handleDownloadConsolidation('excel')}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm cursor-pointer flex items-center gap-2"
                  >
                    <Download size={18} />
                    Download Excel
                  </button>
                  {consolidationResult.ppt_download_url && (
                    <button
                      onClick={() => handleDownloadConsolidation('ppt')}
                      className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold shadow-sm cursor-pointer flex items-center gap-2"
                    >
                      <Download size={18} />
                      Download PowerPoint
                    </button>
                  )}
                </>
              )}
              <button
                onClick={handleRunAutomation}
                disabled={isConsolidating}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConsolidating ? "Processing..." : "Run Automation"}
              </button>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analyzed By User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analysis Registered Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Analysis Completed Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyData.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.projectName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {item.analyzedBy}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {item.registeredDate}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">
                            {item.completedDate}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                router.push(
                                  "/report-automation/details?from=history"
                                )
                              }
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => toggleRow(item.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <svg
                                className={`w-5 h-5 transition-transform ${
                                  expandedRows.includes(item.id)
                                    ? "rotate-180"
                                    : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 9l-7 7-7-7"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedRows.includes(item.id) &&
                        item.markets.length > 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-4 bg-gray-50">
                              <div className="space-y-2">
                                {item.markets.map((market, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-2 gap-4 text-sm"
                                  >
                                    <div>
                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Market Name
                                      </span>
                                      <div className="text-gray-900 mt-1">
                                        {market.name}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        File Name
                                      </span>
                                      <div className="text-gray-900 mt-1">
                                        {market.fileName}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportAutomation() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-gray-50 p-8">Loading...</div>}
    >
      <ReportAutomationContent />
    </Suspense>
  );
}
