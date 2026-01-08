import { apiClient } from "./client";

// ============================================
// TYPES
// ============================================

export interface BatchExtractionRequest {
  files: File[];
  market_codes: string[];
  client_name: string;
}

export interface ExtractionTracker {
  file_name: string;
  market_code: string;
  status: "pending" | "processing" | "completed" | "failed";
  output_file?: string;
  download_url?: string;
  error_message?: string;
  tables_extracted?: number;
}

// Actual response from backend
export interface BatchExtractionResponse {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  client_name: string;
  created_at: string;
  completed_at?: string;
  total_files: number;
  completed_files: number;
  failed_files: number;
  extracted_paths: string[]; // Array of file paths like "extracted/arla/.../file_DK.xlsx"
  failed_markets: string[]; // Array of market codes that failed
  error_message: string | null;
}

// Legacy single extraction response (for backwards compatibility)
export interface SingleExtractionResponse {
  job_id: string;
  tables_extracted: number;
  table_info: Array<{ name: string; rows: number; columns: number }>;
  download_url: string;
  output_file: string;
}

// Helper to extract market code from path like "extracted/arla/.../extracted_uuid_DK.xlsx"
export function extractMarketCodeFromPath(path: string): string {
  const filename = path.split("/").pop() || "";
  const match = filename.match(/_([A-Z]{2})\.xlsx$/);
  return match ? match[1] : "";
}

// ============================================
// API FUNCTIONS
// ============================================

export const extractionApi = {
  /**
   * Submit a batch extraction job (NEW API)
   * Uploads multiple files at once with their market codes
   */
  async submitBatch(
    files: File[],
    marketCodes: string[],
    clientName: string,
  ): Promise<BatchExtractionResponse> {
    const formData = new FormData();

    // Append all files
    files.forEach((file) => {
      formData.append("files", file);
    });

    // Append market codes as comma-separated string
    formData.append("market_codes", marketCodes.join(","));
    formData.append("client_name", clientName);

    const response = await apiClient.post<BatchExtractionResponse>(
      "/api/v1/extraction/batch",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },

  /**
   * Poll batch extraction status
   */
  async getBatchStatus(batchId: string): Promise<BatchExtractionResponse> {
    if (!batchId) {
      throw new Error("Batch ID is required to get status");
    }
    console.log(`[Extraction API] Getting status for batch: ${batchId}`);
    const response = await apiClient.get<BatchExtractionResponse>(
      `/api/v1/extraction/batch/${batchId}`,
    );
    return response.data;
  },

  /**
   * Poll until batch extraction completes or fails
   * Returns the final status
   */
  async waitForBatchCompletion(
    batchId: string,
    options: {
      pollIntervalMs?: number;
      maxWaitSeconds?: number;
      onProgress?: (status: BatchExtractionResponse) => void;
    } = {},
  ): Promise<BatchExtractionResponse> {
    if (!batchId) {
      throw new Error("Batch ID is required for polling");
    }
    console.log(`[Extraction API] Starting poll for batch: ${batchId}`);

    const { pollIntervalMs = 2000, maxWaitSeconds = 600, onProgress } = options;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      const status = await this.getBatchStatus(batchId);

      // Call progress callback
      onProgress?.(status);

      // Check if completed or failed
      if (status.status === "completed" || status.status === "failed") {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    // Timeout - return last known status
    const finalStatus = await this.getBatchStatus(batchId);
    if (finalStatus.status !== "completed" && finalStatus.status !== "failed") {
      throw new Error(
        `Batch extraction timed out after ${maxWaitSeconds} seconds`,
      );
    }
    return finalStatus;
  },

  /**
   * Legacy single file extraction (for backwards compatibility)
   */
  async extractSingle(
    file: File,
    clientId: number,
    marketId: number,
    onUploadProgress?: (progress: number) => void,
  ): Promise<SingleExtractionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("client_id", clientId.toString());
    formData.append("market_id", marketId.toString());

    const response = await apiClient.post<SingleExtractionResponse>(
      "/api/v1/extraction/extract",
      formData,
      {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onUploadProgress) {
            const progress = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total,
            );
            onUploadProgress(progress);
          }
        },
      },
    );

    return response.data;
  },
};
