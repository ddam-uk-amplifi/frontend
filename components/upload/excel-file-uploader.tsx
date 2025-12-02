"use client";

import { useEffect, useState } from "react";
import Uppy from "@uppy/core";
import Dashboard from "@uppy/react/dashboard";
import XHRUpload from "@uppy/xhr-upload";
import { tokenUtils } from "@/lib/utils/token";

// Import Uppy styles
import "@uppy/core/css/style.css";
import "@uppy/dashboard/css/style.css";

interface ExcelFileUploaderProps {
  endpoint: string;
  onUploadSuccess?: (file: unknown, response: unknown) => void;
  onUploadError?: (file: unknown, error: unknown) => void;
  onComplete?: (result: unknown) => void;
  maxFileSize?: number; // in bytes
  maxNumberOfFiles?: number;
  allowedFileTypes?: string[];
  fieldName?: string;
  additionalHeaders?: Record<string, string>;
  note?: string;
  autoProceed?: boolean; // Auto-upload files when added
}

export function ExcelFileUploader({
  endpoint,
  onUploadSuccess,
  onUploadError,
  onComplete,
  maxFileSize = 100 * 1024 * 1024, // 100MB default
  maxNumberOfFiles = 10,
  allowedFileTypes = [".xlsx", ".xls", ".xlsb", ".csv"],
  fieldName = "file",
  additionalHeaders = {},
  note = "Excel files only (XLSX, XLS, XLSB, CSV)",
  autoProceed = true, // Auto-upload by default for easier testing
}: ExcelFileUploaderProps) {
  // Create Uppy instance in state so it persists across renders
  const [uppy] = useState(() => {
    const uppyInstance = new Uppy({
      id: `excel-uploader-${Date.now()}`,
      autoProceed,
      allowMultipleUploadBatches: true,
      restrictions: {
        maxFileSize,
        maxNumberOfFiles,
        allowedFileTypes,
      },
    });

    // Configure XHR Upload
    uppyInstance.use(XHRUpload, {
      endpoint,
      method: "POST",
      formData: true,
      fieldName,
      headers: () => {
        const token = tokenUtils.getAccessToken();
        console.log("Getting token for upload:", token ? "Token exists" : "No token");
        return {
          authorization: token ? `Bearer ${token}` : "",
          ...additionalHeaders,
        };
      },
      limit: 3, // Max concurrent uploads
      timeout: 120000, // 2 minutes timeout
    });

    return uppyInstance;
  });

  // Set up event listeners once
  useEffect(() => {
    const handleSuccess = (file: any, response: any) => {
      console.log("Upload success:", file?.name, response);
      if (onUploadSuccess && file) {
        onUploadSuccess(file, response);
      }
    };

    const handleError = (file: any, error: any) => {
      console.error("Upload error:", file?.name, error);
      if (onUploadError && file) {
        onUploadError(file, error);
      }
    };

    const handleComplete = (result: any) => {
      console.log("Upload complete:", result);
      if (onComplete) {
        onComplete(result);
      }
    };

    const handleRestrictionFailed = (file: any, error: any) => {
      console.error("Restriction failed:", file?.name, error);
    };

    uppy.on("upload-success", handleSuccess);
    uppy.on("upload-error", handleError);
    uppy.on("complete", handleComplete);
    uppy.on("restriction-failed", handleRestrictionFailed);

    // Cleanup only when component unmounts
    return () => {
      uppy.off("upload-success", handleSuccess);
      uppy.off("upload-error", handleError);
      uppy.off("complete", handleComplete);
      uppy.off("restriction-failed", handleRestrictionFailed);
      uppy.cancelAll();
    };
  }, [uppy, onUploadSuccess, onUploadError, onComplete]);

  return (
    <div className="excel-file-uploader not-prose" style={{ minHeight: '450px' }}>
      <Dashboard
        uppy={uppy}
        proudlyDisplayPoweredByUppy={false}
        width="100%"
        height={450}
        note={note}
        theme="light"
      />
    </div>
  );
}
