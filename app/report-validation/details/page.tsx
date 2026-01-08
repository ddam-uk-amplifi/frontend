"use client";

import { useState } from "react";
import { X, ArrowLeft, Search, AlertCircle, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ValidationIssue {
  id: string;
  type: "critical" | "warning";
  message: string;
  location: string;
}

interface DataRow {
  id: number;
  orderID: string;
  date: string;
  amount: string;
  status: string;
  hasError?: boolean;
}

export default function ReportValidationDetails() {
  const router = useRouter();
  const [activeSheet, setActiveSheet] = useState("Sheet1");
  const [filterText, setFilterText] = useState("");

  const validationIssues: ValidationIssue[] = [
    {
      id: "1",
      type: "critical",
      message: "Missing required field",
      location: "Location: Sheet2, Row 15",
    },
    {
      id: "2",
      type: "warning",
      message: "Invalid date format",
      location: "Location: Sheet1, Cell D25",
    },
    {
      id: "3",
      type: "critical",
      message: "Duplicate entry found",
      location: "Location: Sheet1, Row 32",
    },
    {
      id: "4",
      type: "critical",
      message: "Value out of range",
      location: "Location: Sheet2, Cell C14",
    },
    {
      id: "5",
      type: "warning",
      message: "Potential typo detected",
      location: "Location: Sheet1, Cell B8",
    },
    {
      id: "6",
      type: "critical",
      message: "Incorrect data type",
      location: "Location: Sheet3, Row 5",
    },
  ];

  const tableData: DataRow[] = [
    {
      id: 13,
      orderID: "ORD-1248",
      date: "2023-05-18",
      amount: "450.00",
      status: "Shipped",
    },
    {
      id: 14,
      orderID: "ORD-1249",
      date: "2023-05-18",
      amount: "25.00",
      status: "Pending",
      hasError: true,
    },
    {
      id: 15,
      orderID: "ORD-1250",
      date: "",
      amount: "1200.00",
      status: "Shipped",
      hasError: true,
    },
    {
      id: 16,
      orderID: "ORD-1251",
      date: "2023-05-19",
      amount: "75.50",
      status: "Delivered",
    },
    {
      id: 17,
      orderID: "ORD-1252",
      date: "2023-05-20",
      amount: "300.00",
      status: "Shipped",
    },
  ];

  const filteredIssues = validationIssues.filter(
    (issue) =>
      issue.message.toLowerCase().includes(filterText.toLowerCase()) ||
      issue.location.toLowerCase().includes(filterText.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">
          Report Validation Details
        </h1>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Download Report
          </button>
          <button
            onClick={() => router.push("/report-validation")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {/* Back Button */}
        <button
          onClick={() => router.push("/report-validation?tab=history")}
          className="flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to History</span>
        </button>

        {/* Title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Validation Details for Annual_Sales_Report.xlsx
          </h2>
          <p className="text-red-600 font-medium">
            Validation Failed: 12 Critical Errors and 5 Warnings found
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Validation Issues */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Validation Issues
              </h3>

              {/* Search Filter */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter errors by type or message"
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Issues List */}
              <div className="space-y-2">
                {filteredIssues.map((issue, index) => (
                  <div
                    key={issue.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      index === 0
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {issue.type === "critical" ? (
                        <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm mb-1">
                          {issue.type === "critical"
                            ? "Critical: "
                            : "Warning: "}
                          {issue.message}
                        </p>
                        <p className="text-xs text-gray-600">
                          {issue.location}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - File Preview */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* File Preview Header */}
              <div className="border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-6">
                  <h3 className="text-base font-semibold text-gray-900">
                    File Preview: Annual_Sales_Report.xlsx
                  </h3>
                  <div className="flex gap-1">
                    {["Sheet1", "Sheet2", "Sheet3"].map((sheet) => (
                      <button
                        key={sheet}
                        onClick={() => setActiveSheet(sheet)}
                        className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                          activeSheet === sheet
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {sheet}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider"></th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        A
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        B
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        C
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                        D
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row) => (
                      <tr
                        key={row.id}
                        className={
                          row.hasError ? "bg-red-50" : "hover:bg-gray-50"
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.orderID}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.date}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span
                            className={
                              row.hasError && row.amount
                                ? "border-2 border-red-400 px-2 py-1 rounded"
                                : ""
                            }
                          >
                            {row.amount}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
