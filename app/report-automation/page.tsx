"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Upload,
  Trash2,
  Plus,
  X,
  Download,
  ChevronDown,
  FileUp,
  CheckCircle,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import {
  consolidationApi,
  type ConsolidationJob,
  type ConsolidationHistoryResponse,
} from "@/lib/api/consolidation";
import {
  extractionApi,
  extractMarketCodeFromPath,
  type BatchExtractionResponse,
} from "@/lib/api/extraction";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  detectMarketFromFilename,
  extractZipFiles,
  validateTrackerFile,
  type Market as MarketUtil,
} from "@/lib/utils/market-detection";
import {
  FileReviewModal,
  type FileWithMarket,
} from "@/components/upload/file-review-modal";
import {
  useExtractionStore,
  type UploadProgress,
} from "@/lib/stores/extraction";

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

function ReportAutomationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("data-upload");
  const [tabLoading, setTabLoading] = useState(false);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "history") {
      setActiveTab("history");
    }
  }, [searchParams]);

  // Handle tab switching with loading animation
  const handleTabChange = (tab: string) => {
    setTabLoading(true);
    setActiveTab(tab);
    // Simulate loading for smooth transition
    setTimeout(() => setTabLoading(false), 300);
  };

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
  // Use global store for extraction state (persists across navigation)
  const {
    uploadProgress,
    setUploadProgress,
    isConsolidating,
    setIsConsolidating,
    consolidationResult,
    setConsolidationResult,
  } = useExtractionStore();
  const [filesToReview, setFilesToReview] = useState<FileWithMarket[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Consolidation parameters
  const [ytdMonth, setYtdMonth] = useState("Dec");
  const [includePpt, setIncludePpt] = useState(false);
  // Track total markets to upload for accurate consolidation triggering
  const totalMarketsToUploadRef = useRef(0);

  // Consolidation history state
  const [historyData, setHistoryData] = useState<ConsolidationJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [expandedHistoryRows, setExpandedHistoryRows] = useState<
    Record<string, boolean>
  >({});
  const [downloadingFile, setDownloadingFile] = useState<
    "excel" | "ppt" | null
  >(null);

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

  // Fetch consolidation history when history tab is active
  useEffect(() => {
    if (activeTab === "history") {
      fetchConsolidationHistory();
    }
  }, [activeTab, historyPagination.page]);

  const fetchConsolidationHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await consolidationApi.getHistory({
        page: historyPagination.page,
        page_size: historyPagination.pageSize,
        my_jobs_only: true, // Only show current user's jobs
      });

      setHistoryData(response.items);
      setExpandedHistoryRows({});
      setHistoryPagination((prev) => ({
        ...prev,
        total: response.total,
        totalPages: response.total_pages,
      }));
    } catch (error) {
      console.error("Failed to fetch consolidation history:", error);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    setHistoryPagination((prev) => ({ ...prev, page: newPage }));
  };

  const toggleHistoryRow = (rowId: string | number) => {
    const key = String(rowId);
    setExpandedHistoryRows((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const formatTrackerFileName = (fileName: string | undefined): string => {
    if (!fileName) return "";
    return fileName.replace(/^extracted_[^_]+_/, "");
  };

  // Handle dropzone file drop
  const handleFileDrop = async (acceptedFiles: File[]) => {
    const allFiles: File[] = [];
    const errors: string[] = [];

    // Process all files (extract ZIPs, validate files)
    for (const file of acceptedFiles) {
      if (file.type === "application/zip" || file.name.endsWith(".zip")) {
        try {
          const extracted = await extractZipFiles(file);
          allFiles.push(...extracted);
        } catch (error: any) {
          errors.push(`Failed to extract ${file.name}: ${error.message}`);
        }
      } else {
        const validation = validateTrackerFile(file);
        if (validation.valid) {
          allFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error}`);
        }
      }
    }

    // Show errors if any
    if (errors.length > 0) {
      toast.error("Some files could not be processed", {
        description: errors.join("\n"),
      });
    }

    // If no valid files, return
    if (allFiles.length === 0) {
      if (errors.length === 0) {
        toast.error("No valid tracker files found");
      }
      return;
    }

    // Auto-detect markets for each file
    const filesWithMarkets: FileWithMarket[] = allFiles.map((file) => {
      const detected = detectMarketFromFilename(
        file.name,
        availableMarkets as MarketUtil[],
      );
      return {
        file,
        detectedMarketId: detected.marketId,
        detectedMarketCode: detected.marketCode,
        confidence: detected.confidence,
        selectedMarketId: detected.marketId, // Pre-fill with detection
      };
    });

    // Show review modal
    setFilesToReview(filesWithMarkets);
    setShowReviewModal(true);
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.ms-excel.sheet.binary.macroEnabled.12": [".xlsb"],
      "text/csv": [".csv"],
      "application/zip": [".zip"],
    },
    multiple: true,
    onDrop: handleFileDrop,
  });

  // Update market selection in review modal
  const handleUpdateMarketInReview = (index: number, marketId: number) => {
    setFilesToReview((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selectedMarketId: marketId } : item,
      ),
    );
  };

  // Confirm files from review modal
  const handleConfirmFiles = (confirmedFiles: FileWithMarket[]) => {
    // Convert to old Market format for compatibility with existing upload logic
    const newMarkets: Market[] = confirmedFiles.map((fileItem) => ({
      id: Date.now() + Math.random(), // Unique ID
      marketId: fileItem.selectedMarketId,
      code:
        availableMarkets.find((m) => m.id === fileItem.selectedMarketId)
          ?.code || "",
      name:
        availableMarkets.find((m) => m.id === fileItem.selectedMarketId)
          ?.name || "",
      file: fileItem.file,
    }));

    setMarkets(newMarkets);
    setShowReviewModal(false);
    setFilesToReview([]);

    toast.success(
      `${confirmedFiles.length} file${confirmedFiles.length > 1 ? "s" : ""
      } ready to process`,
      {
        description: "Click 'Run Automation' to begin",
      },
    );
  };

  // Cancel file review
  const handleCancelReview = () => {
    setShowReviewModal(false);
    setFilesToReview([]);
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

  const handleConsolidation = async (completedUploads: UploadProgress[]) => {
    // Filter only successful extractions
    const successfulExtractions = completedUploads.filter(
      (p) => p.status === "complete" && p.extractedPath,
    );

    if (successfulExtractions.length === 0) {
      console.log("No successful extractions to consolidate");
      return;
    }

    setIsConsolidating(true);
    console.log("Starting consolidation...");

    try {
      // Build extracted_paths array (simple string array of paths)
      const extractedPaths = successfulExtractions.map((p) => p.extractedPath!);

      // Prepare consolidation request
      const consolidationData = {
        client_name: clientId, // lowercase client name
        extracted_paths: extractedPaths, // Simple array of path strings
        ytd_month: ytdMonth,
        include_ppt: includePpt,
      };

      console.log("Consolidation request:", consolidationData);

      const response = await apiClient.post(
        "/api/v1/consolidation",
        consolidationData,
      );

      console.log("Consolidation job created:", response.data);
      const jobId = response.data.id;

      // Poll for consolidation completion
      const maxWaitSeconds = 300; // 5 minutes
      const pollIntervalMs = 2000; // 2 seconds
      const startTime = Date.now();

      while (Date.now() - startTime < maxWaitSeconds * 1000) {
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

        const statusResponse = await apiClient.get(
          `/api/v1/consolidation/${jobId}`,
        );
        const job = statusResponse.data;

        console.log(`Consolidation status: ${job.status}`);

        if (job.status === "completed") {
          console.log("Consolidation completed successfully!");
          toast.success("Report consolidation complete", {
            description: "Your consolidated reports are ready to download",
          });
          setConsolidationResult(job);

          // Populate trackers data after successful consolidation
          try {
            console.log("Populating trackers data...");
            await apiClient.post(
              `/api/v1/client/${clientId}/populate/trackers`,
              null,
              {
                params: {
                  consolidation_job_id: jobId,
                  ytd_month: ytdMonth,
                },
              },
            );
            console.log("Trackers data populated successfully!");
            toast.success("Trackers data populated", {
              description: "Dashboard trackers data is now available",
            });
          } catch (populateError: any) {
            console.error("Failed to populate trackers:", populateError);
            toast.warning("Trackers population failed", {
              description:
                "Consolidation succeeded but trackers data couldn't be populated",
            });
          }

          break;
        } else if (job.status === "failed") {
          console.error("Consolidation failed:", job.error_message);
          toast.error("Consolidation failed", {
            description:
              job.error_message || "An error occurred during consolidation",
          });
          setConsolidationResult({
            error: true,
            message: job.error_message || "Consolidation failed",
          });
          break;
        }
        // Continue polling if status is still 'pending' or 'processing'
      }
    } catch (error: any) {
      console.error("Consolidation error:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to consolidate reports";
      toast.error("Consolidation error", {
        description: errorMessage,
      });
      setConsolidationResult({
        error: true,
        message: errorMessage,
      });
    } finally {
      setIsConsolidating(false);
    }
  };

  const handleRunAutomation = async () => {
    const marketsToUpload = markets.filter(
      (m) => m.file !== null && m.marketId !== null,
    );

    if (marketsToUpload.length === 0) {
      toast.error("Please select at least one market and upload a file");
      return;
    }

    // Clear previous results and set expected count
    setUploadProgress([]);
    setConsolidationResult(null);
    totalMarketsToUploadRef.current = marketsToUpload.length;

    // Prepare files and market codes for batch upload
    const files: File[] = [];
    const marketCodes: string[] = [];
    const marketMap = new Map<
      string,
      { id: number; dbMarketId: number; code: string }
    >();

    marketsToUpload.forEach((market) => {
      if (market.file && market.code) {
        files.push(market.file);
        marketCodes.push(market.code);
        marketMap.set(market.file.name, {
          id: market.id,
          dbMarketId: market.marketId!,
          code: market.code,
        });
      }
    });

    // Initialize upload progress for all files
    marketsToUpload.forEach((market) => {
      if (market.file) {
        setUploadProgress((prev) => [
          ...prev,
          {
            id: `${market.id}-${Date.now()}`,
            marketId: market.id,
            dbMarketId: market.marketId!,
            marketCode: market.code || "",
            fileName: market.file!.name,
            progress: 0,
            status: "uploading",
          },
        ]);
      }
    });

    try {
      // Step 1: Submit batch extraction
      console.log("🚀 Submitting batch extraction...");
      console.log(
        "📁 Files:",
        files.map((f) => f.name),
      );
      console.log("🌍 Market codes:", marketCodes);
      console.log("🏢 Client:", clientId);

      toast.info("Uploading files...", {
        description: `Submitting ${files.length} file(s) for extraction`,
      });

      const batchResponse = await extractionApi.submitBatch(
        files,
        marketCodes,
        clientId,
      );

      console.log("📦 Batch job created:", batchResponse);
      console.log("📦 Batch ID:", batchResponse.id);

      // Validate response has required ID
      if (!batchResponse.id) {
        throw new Error("Backend did not return a batch ID");
      }

      toast.success("Files uploaded successfully", {
        description: `• Processing ${files.length} file(s)`,
      });

      // Update progress to show uploading complete, now processing with varied percentages
      setUploadProgress((prev) =>
        prev.map((p, index) => {
          // Generate varied progress (35% to 55%) to feel realistic
          const variedProgress =
            35 + ((index * 11 + p.marketCode.charCodeAt(0)) % 21);
          return {
            ...p,
            progress: variedProgress,
            status: "uploading" as const,
          };
        }),
      );

      // Step 2: Poll for completion
      console.log("⏳ Polling for extraction completion...");
      const finalStatus = await extractionApi.waitForBatchCompletion(
        batchResponse.id,
        {
          pollIntervalMs: 2000,
          maxWaitSeconds: 1800,
          onProgress: (status: BatchExtractionResponse) => {
            console.log(
              `📊 Batch status: ${status.status}, ${status.completed_files}/${status.total_files} completed`,
            );

            // Calculate base progress percentage for overall batch
            const batchProgressPct =
              status.total_files > 0
                ? Math.round(
                  (status.completed_files / status.total_files) * 100,
                )
                : 0;

            // Update progress based on extracted_paths
            if (status.extracted_paths && status.extracted_paths.length > 0) {
              setUploadProgress((prev) =>
                prev.map((p, index) => {
                  // Find matching path by market code
                  const matchingPath = status.extracted_paths.find(
                    (path) => extractMarketCodeFromPath(path) === p.marketCode,
                  );
                  if (matchingPath) {
                    return {
                      ...p,
                      progress: 100,
                      status: "complete" as const,
                      extractedPath: matchingPath,
                    };
                  }
                  // Check if this market failed
                  if (status.failed_markets?.includes(p.marketCode)) {
                    return {
                      ...p,
                      status: "failed" as const,
                      error: "Extraction failed for this market",
                    };
                  }
                  // Still processing - show varied progress per file to feel realistic
                  // Each file gets a unique offset based on its index and market code
                  const baseProgress = 15 + batchProgressPct * 0.7; // 15% to 85%
                  const variance =
                    ((index * 17 + p.marketCode.charCodeAt(0)) % 25) - 12; // -12 to +12 variance
                  const fileProgress = Math.max(
                    10,
                    Math.min(90, Math.round(baseProgress + variance)),
                  );
                  return { ...p, progress: fileProgress };
                }),
              );
            } else {
              // No paths yet, show varied initial processing progress
              setUploadProgress((prev) =>
                prev.map((p, index) => {
                  // Generate varied progress (8% to 25%) for initial state
                  const initialProgress =
                    8 + ((index * 13 + p.marketCode.charCodeAt(0)) % 18);
                  return { ...p, progress: initialProgress };
                }),
              );
            }
          },
        },
      );

      console.log("✅ Batch extraction completed:", finalStatus);

      // Step 3: Handle completion
      if (finalStatus.status === "completed") {
        const successCount = finalStatus.completed_files;
        const failedCount = finalStatus.failed_files;

        if (successCount > 0) {
          toast.success("Extraction completed", {
            description: `${successCount} file(s) extracted${failedCount > 0 ? `, ${failedCount} failed` : ""
              } • Starting consolidation`,
          });

          // Build final progress directly from marketsToUpload and finalStatus
          // (avoiding stale closure issue with uploadProgress state)
          const finalProgress: UploadProgress[] = marketsToUpload
            .filter((m) => m.file && m.code)
            .map((market) => {
              const matchingPath = finalStatus.extracted_paths?.find(
                (path) => extractMarketCodeFromPath(path) === market.code,
              );
              const isFailed = finalStatus.failed_markets?.includes(
                market.code || "",
              );

              return {
                id: `${market.id}-final`,
                marketId: market.id,
                dbMarketId: market.marketId!,
                marketCode: market.code || "",
                fileName: market.file!.name,
                progress: matchingPath ? 100 : 0,
                status: matchingPath
                  ? ("complete" as const)
                  : isFailed
                    ? ("failed" as const)
                    : ("uploading" as const),
                extractedPath: matchingPath,
                error: isFailed ? "Extraction failed" : undefined,
              };
            });

          // Update UI with final status
          setUploadProgress(finalProgress);

          // Log for debugging
          console.log("📋 Final progress for consolidation:", finalProgress);
          console.log(
            "📋 Successful extractions:",
            finalProgress.filter(
              (p) => p.status === "complete" && p.extractedPath,
            ),
          );

          setTimeout(() => handleConsolidation(finalProgress), 500);
        } else {
          toast.error("All extractions failed", {
            description:
              finalStatus.error_message ||
              "No files were successfully extracted",
          });
        }
      } else if (finalStatus.status === "failed") {
        toast.error("Batch extraction failed", {
          description:
            finalStatus.error_message || "An error occurred during extraction",
        });

        // Mark all as failed
        setUploadProgress((prev) =>
          prev.map((p) => ({
            ...p,
            status: "failed" as const,
            error: finalStatus.error_message || "Batch extraction failed",
          })),
        );
      }
    } catch (error: any) {
      console.error("Batch extraction error:", error);
      const errorMessage =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Batch extraction failed";

      toast.error("Extraction error", {
        description: errorMessage,
      });

      // Mark all as failed
      setUploadProgress((prev) =>
        prev.map((p) => ({
          ...p,
          status: "failed" as const,
          error: errorMessage,
        })),
      );
    }
  };

  // Legacy single-file extraction (fallback)
  const handleRunAutomationLegacy = async () => {
    const marketsToUpload = markets.filter(
      (m) => m.file !== null && m.marketId !== null,
    );

    if (marketsToUpload.length === 0) {
      toast.error("Please select at least one market and upload a file");
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
      const dbMarketId = market.marketId!; // DB market ID

      // Add to upload progress
      setUploadProgress((prev) => [
        ...prev,
        {
          id: uploadId,
          marketId: market.id,
          dbMarketId,
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
                prev.map((p) => (p.id === uploadId ? { ...p, progress } : p)),
              );
            },
          },
        );

        // Mark as complete with extraction data (mapping API response fields)
        const extractionData = response.data;
        console.log("✅ Extraction completed for:", market.code);
        console.log("📦 Full extraction response:", extractionData);
        console.log("📄 Output file path:", extractionData.output_file);
        console.log("📥 Download URL:", extractionData.download_url);

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
              : p,
          );

          // Check if all extractions are complete - compare with EXPECTED count
          const completedCount = updated.filter(
            (p) => p.status === "complete",
          ).length;
          const failedCount = updated.filter(
            (p) => p.status === "failed",
          ).length;
          const totalProcessed = completedCount + failedCount;
          const expectedTotal = totalMarketsToUploadRef.current;

          console.log(
            `📊 Progress: ${completedCount} completed, ${failedCount} failed, ${totalProcessed}/${expectedTotal} total`,
          );

          // Only trigger consolidation when we've processed ALL expected markets
          if (totalProcessed === expectedTotal && completedCount > 0) {
            console.log("🎯 All extractions done! Triggering consolidation...");
            toast.success("All files processed successfully", {
              description: `${completedCount} file${completedCount > 1 ? "s" : ""
                } extracted • Starting consolidation`,
            });
            // Trigger consolidation after a short delay to ensure UI updates
            setTimeout(() => handleConsolidation(updated), 500);
          }

          return updated;
        });
      } catch (error: any) {
        console.error("Upload error:", error);
        const errorMessage =
          error.response?.data?.message ||
          error.response?.data?.detail ||
          "Upload failed";
        toast.error("File upload failed", {
          description: `${market.file!.name}: ${errorMessage}`,
        });
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
              : p,
          );

          // Check if all extractions are complete after failure too
          const completedCount = updated.filter(
            (p) => p.status === "complete",
          ).length;
          const failedCount = updated.filter(
            (p) => p.status === "failed",
          ).length;
          const totalProcessed = completedCount + failedCount;
          const expectedTotal = totalMarketsToUploadRef.current;

          console.log(
            `📊 Progress after error: ${completedCount} completed, ${failedCount} failed, ${totalProcessed}/${expectedTotal} total`,
          );

          // Only trigger consolidation when we've processed ALL expected markets
          if (totalProcessed === expectedTotal && completedCount > 0) {
            console.log(
              "🎯 All extractions done (some failed)! Triggering consolidation...",
            );
            setTimeout(() => handleConsolidation(updated), 500);
          }

          return updated;
        });
      }
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploadProgress((prev) => prev.filter((p) => p.id !== uploadId));
  };

  const handleDownloadConsolidation = async (
    type: "excel" | "ppt" = "excel",
  ) => {
    if (!consolidationResult || consolidationResult.error) return;

    setDownloadingFile(type);

    try {
      // Check for S3 presigned URL first, then fall back to local path
      let downloadUrl =
        type === "excel"
          ? consolidationResult.excel_download_url
          : consolidationResult.ppt_download_url;

      // For local storage, construct download URL from path
      if (!downloadUrl) {
        const filePath =
          type === "excel"
            ? consolidationResult.excel_path
            : consolidationResult.ppt_path;

        if (!filePath) {
          console.error(`No ${type} file path in consolidation result`);
          return;
        }

        // Extract filename from path and construct local download URL
        const fileName = filePath.split("/").pop();
        downloadUrl = `${API_BASE_URL}/api/v1/consolidation/download/${fileName}`;
      }

      console.log(`Downloading ${type} file from:`, downloadUrl);

      // Create a hidden anchor element and trigger download
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = ""; // This triggers download instead of navigation
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Small delay to show loading state for UX
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setDownloadingFile(null);
    }
  };

  // Helper to get download URL (S3 presigned or local endpoint)
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
      pending: "bg-gray-100 text-gray-700",
      processing: "bg-blue-100 text-blue-700",
    };
    const labels = {
      completed: "Completed",
      failed: "Failed",
      pending: "Pending",
      processing: "Processing",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || "bg-gray-100 text-gray-700"
          }`}
      >
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Report Automation
          </h1>
          <p className="text-sm text-gray-600">
            Create new jobs and view past history.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => handleTabChange("data-upload")}
              className={`pb-3 px-1 text-sm font-medium transition-colors cursor-pointer ${activeTab === "data-upload"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              Data Upload
            </button>
            <button
              onClick={() => handleTabChange("history")}
              className={`pb-3 px-1 text-sm font-medium transition-colors cursor-pointer ${activeTab === "history"
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-gray-700"
                }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Content */}
        {tabLoading ? (
          // Skeleton Loader
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <Skeleton className="h-6 w-1/4 mb-4" />
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <Skeleton className="h-6 w-1/3 mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        ) : activeTab === "data-upload" ? (
          <div className="space-y-4">
            {/* Compact Form - Side by Side Layout */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Create New Automation Job
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Side - Form Inputs */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Client Company <span className="text-red-500">*</span>
                    </label>
                    <Select
                      value={clientId}
                      onValueChange={(value) =>
                        setClientId(value as ClientIdString)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      YTD Month <span className="text-red-500">*</span>
                    </label>
                    <Select value={ytdMonth} onValueChange={setYtdMonth}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Jan">January</SelectItem>
                        <SelectItem value="Feb">February</SelectItem>
                        <SelectItem value="Mar">March</SelectItem>
                        <SelectItem value="Apr">April</SelectItem>
                        <SelectItem value="May">May</SelectItem>
                        <SelectItem value="Jun">June</SelectItem>
                        <SelectItem value="Jul">July</SelectItem>
                        <SelectItem value="Aug">August</SelectItem>
                        <SelectItem value="Sep">September</SelectItem>
                        <SelectItem value="Oct">October</SelectItem>
                        <SelectItem value="Nov">November</SelectItem>
                        <SelectItem value="Dec">December</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
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

                {/* Right Side - File Upload */}
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Tracker Files <span className="text-red-500">*</span>
                  </label>

                  {/* Dropzone Area - Compact */}
                  <div
                    {...getRootProps()}
                    className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${isDragActive
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50"
                      }`}
                  >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-blue-100 p-2">
                        <FileUp className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {isDragActive
                            ? "Drop files here..."
                            : "Drag & drop or click to browse"}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-600">
                          Excel, CSV files or ZIP archive
                        </p>
                      </div>
                      <div className="mt-1 flex flex-wrap justify-center gap-1.5 text-xs text-gray-500">
                        <span className="rounded bg-gray-200 px-1.5 py-0.5">
                          .xlsx
                        </span>
                        <span className="rounded bg-gray-200 px-1.5 py-0.5">
                          .xls
                        </span>
                        <span className="rounded bg-gray-200 px-1.5 py-0.5">
                          .csv
                        </span>
                        <span className="rounded bg-gray-200 px-1.5 py-0.5">
                          .zip
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Selected Files Preview - Compact */}
                  {markets.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">
                          {markets.length} file{markets.length > 1 ? "s" : ""}{" "}
                          selected
                        </span>
                        <button
                          onClick={() => setMarkets([])}
                          className="text-xs text-gray-600 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="max-h-[180px] overflow-y-auto space-y-2">
                        {markets.map((market) => (
                          <div
                            key={market.id}
                            className="flex items-center justify-between rounded border border-gray-200 bg-white p-2"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-blue-100">
                                <svg
                                  className="w-4 h-4 text-blue-600"
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
                              <div className="flex-1 min-w-0">
                                <p
                                  className="text-xs font-medium text-gray-900 truncate"
                                  title={market.file?.name}
                                >
                                  {market.file?.name}
                                </p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="inline-flex items-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
                                    {market.code}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {market.file
                                      ? (
                                        market.file.size /
                                        1024 /
                                        1024
                                      ).toFixed(1)
                                      : "0"}{" "}
                                    MB
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => removeMarket(market.id)}
                              className="ml-2 flex-shrink-0 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* File Review Modal */}
            {showReviewModal && (
              <FileReviewModal
                files={filesToReview}
                availableMarkets={availableMarkets as MarketUtil[]}
                onConfirm={handleConfirmFiles}
                onCancel={handleCancelReview}
                onUpdateMarket={handleUpdateMarketInReview}
              />
            )}

            {/* File Upload Status - Only show files that are uploading */}
            {uploadProgress.length > 0 &&
              uploadProgress.some((p) => p.status === "uploading") && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="space-y-2">
                    {uploadProgress
                      .filter((upload) => upload.status === "uploading")
                      .map((upload) => (
                        <div
                          key={upload.id}
                          className="flex items-center gap-3"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-blue-100">
                            <svg
                              className="w-4 h-4 text-blue-600"
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
                              <span className="text-sm font-medium text-gray-900">
                                {upload.fileName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {upload.progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full transition-all bg-blue-500"
                                style={{ width: `${upload.progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Uploaded Files - Show completed uploads */}
            {uploadProgress.length > 0 &&
              uploadProgress.some((p) => p.status === "complete") && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Uploaded Files (
                      {
                        uploadProgress.filter((p) => p.status === "complete")
                          .length
                      }
                      )
                    </h3>
                    <button
                      onClick={() => setUploadProgress([])}
                      className="text-xs text-gray-600 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-2">
                    {uploadProgress
                      .filter((upload) => upload.status === "complete")
                      .map((upload) => (
                        <div
                          key={upload.id}
                          className="flex items-center gap-3 p-2 rounded bg-green-50 border border-green-200"
                        >
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-green-100">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {upload.fileName}
                            </p>
                            <p className="text-xs text-gray-600">
                              {upload.marketCode} • Uploaded successfully
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            {/* Consolidation Status */}
            {isConsolidating && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2.5">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
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
              <div
                className={`rounded-lg p-3 ${consolidationResult.error
                    ? "bg-red-50 border border-red-200"
                    : "bg-green-50 border border-green-200"
                  }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-1">
                    {consolidationResult.error ? (
                      <>
                        <h3 className="text-sm font-semibold text-red-900 mb-1.5">
                          ❌ Consolidation Failed
                        </h3>
                        <p className="text-xs text-red-800">
                          {consolidationResult.message}
                        </p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-semibold text-green-900 mb-1.5">
                          ✅ Consolidation Completed Successfully!
                        </h3>
                        <div className="text-xs text-green-800 space-y-0.5">
                          {consolidationResult.id && (
                            <p>• Job ID: {consolidationResult.id}</p>
                          )}
                          {consolidationResult.status && (
                            <p>
                              • Status:{" "}
                              <span className="font-semibold capitalize">
                                {consolidationResult.status}
                              </span>
                            </p>
                          )}
                          {consolidationResult.excel_download_url && (
                            <p>• ✅ Excel file ready for download</p>
                          )}
                          {consolidationResult.ppt_download_url && (
                            <p>• ✅ PowerPoint file ready for download</p>
                          )}
                          {consolidationResult.completed_at && (
                            <p>
                              • Completed:{" "}
                              {new Date(
                                consolidationResult.completed_at,
                              ).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => setConsolidationResult(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Run Automation / Download Buttons - Only show when files are selected */}
            {(markets.length > 0 || consolidationResult) && (
              <div className="flex justify-end gap-3">
                {consolidationResult &&
                  !consolidationResult.error &&
                  (consolidationResult.excel_download_url ||
                    consolidationResult.excel_path) ? (
                  <>
                    <button
                      onClick={() => handleDownloadConsolidation("excel")}
                      disabled={downloadingFile !== null}
                      className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold shadow-sm cursor-pointer flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {downloadingFile === "excel" ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Downloading...
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Download Excel
                        </>
                      )}
                    </button>
                    {(consolidationResult.ppt_download_url ||
                      consolidationResult.ppt_path) && (
                        <button
                          onClick={() => handleDownloadConsolidation("ppt")}
                          disabled={downloadingFile !== null}
                          className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold shadow-sm cursor-pointer flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloadingFile === "ppt" ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download size={16} />
                              Download PowerPoint
                            </>
                          )}
                        </button>
                      )}
                  </>
                ) : (
                  markets.length > 0 && (
                    <button
                      onClick={handleRunAutomation}
                      disabled={
                        isConsolidating ||
                        uploadProgress.some((p) => p.status === "uploading")
                      }
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {uploadProgress.some((p) => p.status === "uploading")
                        ? "Extracting..."
                        : isConsolidating
                          ? "Consolidating..."
                          : "Run Automation"}
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ) : activeTab === "history" ? (
          <div className="space-y-4">
            {historyLoading ? (
              // Loading skeleton
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </div>
            ) : historyData.length === 0 ? (
              // Empty state
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-10 text-center">
                <div className="text-gray-400 mb-3">
                  <svg
                    className="w-14 h-14 mx-auto"
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
                <h3 className="text-base font-medium text-gray-900 mb-1.5">
                  No consolidation history
                </h3>
                <p className="text-sm text-gray-500">
                  Your completed consolidation jobs will appear here.
                </p>
              </div>
            ) : (
              <>
                {/* History Table */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Client
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Analyzed By
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Registered
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Completed
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {historyData.map((item) => {
                          const rowKey = String(item.id);
                          const isExpanded = !!expandedHistoryRows[rowKey];
                          const canExpand = item.trackers.length > 0;

                          return (
                            <React.Fragment key={item.id}>
                              <tr className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm font-medium text-gray-900 capitalize">
                                    {item.client_name}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-600">
                                    {item.analyzed_by_email}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-600">
                                    {new Date(
                                      item.registered_date,
                                    ).toLocaleDateString()}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="text-sm text-gray-600">
                                    {item.completed_date
                                      ? new Date(
                                        item.completed_date,
                                      ).toLocaleDateString()
                                      : "-"}
                                  </div>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {getStatusBadge(item.status)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {/* Eye/Details button - shown first if there are trackers */}
                                    {item.trackers.length > 0 && (
                                      <button
                                        onClick={() =>
                                          router.push(
                                            `/report-automation/history/${item.id}`,
                                          )
                                        }
                                        className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                                        title="View consolidation details"
                                      >
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
                                    )}
                                    {/* Dropdown toggle replaces download icon */}
                                    {item.status === "completed" &&
                                      canExpand && (
                                        <button
                                          onClick={() =>
                                            toggleHistoryRow(rowKey)
                                          }
                                          className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                                          title={
                                            isExpanded
                                              ? "Hide markets"
                                              : "Show markets"
                                          }
                                          aria-expanded={isExpanded}
                                          aria-controls={`history-row-${rowKey}`}
                                        >
                                          <span
                                            className={`block transition-transform duration-200 ${isExpanded ? "rotate-180" : ""
                                              }`}
                                          >
                                            <ChevronDown size={16} />
                                          </span>
                                        </button>
                                      )}
                                  </div>
                                </td>
                              </tr>
                              <AnimatePresence initial={false}>
                                {isExpanded && canExpand && (
                                  <motion.tr
                                    key={`history-row-${rowKey}`}
                                    id={`history-row-${rowKey}`}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="bg-gray-50"
                                  >
                                    <motion.td
                                      colSpan={6}
                                      className="px-4 py-0"
                                      style={{ overflow: "hidden" }}
                                      initial={{ height: 0 }}
                                      animate={{ height: "auto" }}
                                      exit={{ height: 0 }}
                                      transition={{ duration: 0.2 }}
                                    >
                                      <div className="overflow-hidden">
                                        <div className="py-3">
                                          <div className="overflow-hidden rounded border border-gray-200 bg-white">
                                            <table className="w-full text-sm text-gray-700">
                                              <tbody>
                                                {item.trackers.map(
                                                  (tracker, trackerIndex) => (
                                                    <tr
                                                      key={`${tracker.market_code}-${tracker.file_name}-${trackerIndex}`}
                                                      className={`bg-white ${trackerIndex !== 0
                                                          ? "border-t border-gray-200"
                                                          : ""
                                                        }`}
                                                    >
                                                      <td className="w-1/2 px-3 py-2 align-top">
                                                        <div className="flex items-center gap-2">
                                                          <span className="inline-flex items-center justify-center rounded bg-blue-100 px-1.5 py-0.5 text-xs font-semibold uppercase text-blue-700">
                                                            {
                                                              tracker.market_code
                                                            }
                                                          </span>
                                                          <span className="text-sm font-medium text-gray-900">
                                                            {tracker.market_name ||
                                                              "-"}
                                                          </span>
                                                        </div>
                                                      </td>
                                                      <td className="px-3 py-2">
                                                        <span
                                                          className="block truncate text-sm text-gray-600"
                                                          title={formatTrackerFileName(
                                                            tracker.file_name,
                                                          )}
                                                        >
                                                          {formatTrackerFileName(
                                                            tracker.file_name,
                                                          )}
                                                        </span>
                                                      </td>
                                                    </tr>
                                                  ),
                                                )}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </div>
                                    </motion.td>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pagination Controls */}
                {historyPagination.totalPages > 1 && (
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-700">
                        Showing page {historyPagination.page} of{" "}
                        {historyPagination.totalPages} (
                        {historyPagination.total} total jobs)
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handlePageChange(historyPagination.page - 1)
                          }
                          disabled={historyPagination.page === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() =>
                            handlePageChange(historyPagination.page + 1)
                          }
                          disabled={
                            historyPagination.page >=
                            historyPagination.totalPages
                          }
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
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
