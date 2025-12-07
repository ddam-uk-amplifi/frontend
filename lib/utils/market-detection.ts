import JSZip from "jszip";

export interface Market {
  id: number;
  code: string;
  name: string;
}

export interface DetectedMarket {
  marketId: number | null;
  marketCode: string;
  confidence: "high" | "low" | "none";
}

/**
 * Detects market from filename using market code or name matching
 * Priority: Market code match > Market name match > No match
 */
export const detectMarketFromFilename = (
  fileName: string,
  availableMarkets: Market[]
): DetectedMarket => {
  const normalized = fileName.toLowerCase();

  // First, try exact market code match (higher priority)
  for (const market of availableMarkets) {
    const codePattern = new RegExp(`\\b${market.code.toLowerCase()}\\b`, "i");
    if (codePattern.test(normalized)) {
      return {
        marketId: market.id,
        marketCode: market.code,
        confidence: "high",
      };
    }
  }

  // Second, try market name match (case-insensitive substring)
  for (const market of availableMarkets) {
    const namePattern = new RegExp(market.name.toLowerCase(), "i");
    if (namePattern.test(normalized)) {
      return {
        marketId: market.id,
        marketCode: market.code,
        confidence: "low",
      };
    }
  }

  return {
    marketId: null,
    marketCode: "",
    confidence: "none",
  };
};

/**
 * Extracts Excel/CSV files from a ZIP archive
 */
export const extractZipFiles = async (zipFile: File): Promise<File[]> => {
  try {
    const zip = await JSZip.loadAsync(zipFile);
    const files: File[] = [];

    for (const [filename, zipEntry] of Object.entries(zip.files)) {
      // Skip directories and non-tracker files
      if (zipEntry.dir) continue;

      // Only extract Excel and CSV files
      if (/\.(xlsx|xls|xlsb|csv)$/i.test(filename)) {
        // Skip temporary Excel files (those with $ in the name)
        if (filename.includes("$")) continue;

        const blob = await zipEntry.async("blob");
        const file = new File([blob], filename, {
          type: getFileType(filename),
        });
        files.push(file);
      }
    }

    return files;
  } catch (error) {
    console.error("Failed to extract ZIP file:", error);
    throw new Error("Failed to extract ZIP file. Please ensure it's a valid ZIP archive.");
  }
};

/**
 * Get MIME type based on file extension
 */
const getFileType = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsb":
      return "application/vnd.ms-excel.sheet.binary.macroEnabled.12";
    case "csv":
      return "text/csv";
    default:
      return "application/octet-stream";
  }
};

/**
 * Validates if a file is acceptable for upload
 */
export const validateTrackerFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 50MB.`,
    };
  }

  // Check for temporary Excel files
  if (file.name.includes("$")) {
    return {
      valid: false,
      error: "Excel temporary files (with $ in filename) cannot be uploaded.",
    };
  }

  // Check file extension
  const validExtensions = [".xlsx", ".xls", ".xlsb", ".csv"];
  const hasValidExtension = validExtensions.some((ext) =>
    file.name.toLowerCase().endsWith(ext)
  );

  if (!hasValidExtension) {
    return {
      valid: false,
      error: "Invalid file type. Only Excel (.xlsx, .xls, .xlsb) and CSV files are allowed.",
    };
  }

  return { valid: true };
};
