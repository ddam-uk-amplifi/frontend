"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function ReportValidationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("data-upload");
  const [uploadResults, setUploadResults] = useState<
    Array<{
      fileName: string;
      status: "success" | "error";
      data?: unknown;
      error?: unknown;
    }>
  >([]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "history") {
      setActiveTab("history");
    }
  }, [searchParams]);

  const historyData = [
    {
      id: 1,
      fileName: "Annual_Sales_Report.xlsx",
      uploadedBy: "Jane Smith",
      uploadedDate: "2023-10-15",
      validationDate: "2023-10-15",
      status: "failed",
      errorCount: 12,
      warningCount: 5,
    },
    {
      id: 2,
      fileName: "Q3_Financial_Data.xlsx",
      uploadedBy: "John Doe",
      uploadedDate: "2023-10-12",
      validationDate: "2023-10-12",
      status: "success",
      errorCount: 0,
      warningCount: 0,
    },
    {
      id: 3,
      fileName: "Product_Inventory_Oct.xlsx",
      uploadedBy: "Emily White",
      uploadedDate: "2023-09-28",
      validationDate: "2023-09-28",
      status: "failed",
      errorCount: 5,
      warningCount: 2,
    },
    {
      id: 4,
      fileName: "Customer_Database_2023.xlsx",
      uploadedBy: "Michael Brown",
      uploadedDate: "2023-09-11",
      validationDate: "2023-09-11",
      status: "success",
      errorCount: 0,
      warningCount: 3,
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      success: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      "in-progress": "bg-yellow-100 text-yellow-700",
    };
    const labels = {
      success: "Passed",
      failed: "Failed",
      "in-progress": "In Progress",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const clearResults = () => {
    setUploadResults([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Report Validation
          </h1>
          <p className="text-gray-600">
            Upload and validate your tracker files.
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Upload Tracker File</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <p className="text-sm text-gray-500 mb-4">
                      Upload tracker Excel files for validation (max 50MB each)
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.xlsb"
                      multiple
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Results Section */}
            <div>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Validation Results</CardTitle>
                  {uploadResults.length > 0 && (
                    <button
                      onClick={clearResults}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Clear
                    </button>
                  )}
                </CardHeader>
                <CardContent>
                  {uploadResults.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No uploads yet. Upload a file to see validation results
                      here.
                    </p>
                  ) : (
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {uploadResults.map((result, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                result.status === "success"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <span className="font-medium text-sm">
                              {result.fileName}
                            </span>
                          </div>

                          {result.status === "success" ? (
                            <div className="bg-green-50 border border-green-200 rounded p-3">
                              <p className="font-semibold mb-2 text-green-800 text-sm">
                                ✓ Validation Successful
                              </p>
                              <pre className="text-xs bg-white p-2 rounded border border-green-200 overflow-x-auto">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            <div className="bg-red-50 border border-red-200 rounded p-3">
                              <p className="font-semibold mb-2 text-red-800 text-sm">
                                ✗ Validation Failed
                              </p>
                              <pre className="text-xs bg-white p-2 rounded border border-red-200 overflow-x-auto">
                                {JSON.stringify(result.error, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
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
                      File Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Uploaded By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Upload Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Validation Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Issues
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {item.fileName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {item.uploadedBy}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {item.uploadedDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {item.validationDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {item.errorCount > 0 && (
                            <span className="text-red-600 font-medium">
                              {item.errorCount} errors
                            </span>
                          )}
                          {item.errorCount > 0 && item.warningCount > 0 && ", "}
                          {item.warningCount > 0 && (
                            <span className="text-yellow-600 font-medium">
                              {item.warningCount} warnings
                            </span>
                          )}
                          {item.errorCount === 0 && item.warningCount === 0 && (
                            <span className="text-green-600 font-medium">
                              No issues
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            router.push("/report-validation/details")
                          }
                          className="text-gray-400 hover:text-gray-600"
                          title="View details"
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
                      </td>
                    </tr>
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

export default function ReportValidation() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-gray-50 p-8">Loading...</div>}
    >
      <ReportValidationContent />
    </Suspense>
  );
}
