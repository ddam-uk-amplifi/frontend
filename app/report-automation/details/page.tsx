"use client";

import { ArrowLeft, Download, FileText, Bell, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SalesAnalysisDetails() {
  const router = useRouter();

  const analysisData = [
    {
      country: "United States",
      status: "Completed",
      metricA: "1,230,000",
      metricB: "85%",
      variance: "+5.2%",
      variancePositive: true,
    },
    {
      country: "Canada",
      status: "Completed",
      metricA: "450,000",
      metricB: "92%",
      variance: "+2.5%",
      variancePositive: true,
    },
    {
      country: "United Kingdom",
      status: "Completed",
      metricA: "680,000",
      metricB: "88%",
      variance: "-1.5%",
      variancePositive: false,
    },
    {
      country: "Germany",
      status: "Completed",
      metricA: "950,000",
      metricB: "91%",
      variance: "+3.8%",
      variancePositive: true,
    },
    {
      country: "France",
      status: "Completed",
      metricA: "720,000",
      metricB: "86%",
      variance: "-0.9%",
      variancePositive: false,
    },
    {
      country: "Japan",
      status: "Completed",
      metricA: "1,100,000",
      metricB: "95%",
      variance: "+7.0%",
      variancePositive: true,
    },
    {
      country: "Australia",
      status: "Completed",
      metricA: "390,000",
      metricB: "89%",
      variance: "+1.2%",
      variancePositive: true,
    },
    {
      country: "Brazil",
      status: "Completed",
      metricA: "560,000",
      metricB: "82%",
      variance: "-3.4%",
      variancePositive: false,
    },
    {
      country: "India",
      status: "Completed",
      metricA: "680,000",
      metricB: "90%",
      variance: "+4.9%",
      variancePositive: true,
    },
    {
      country: "South Korea",
      status: "Completed",
      metricA: "490,000",
      metricB: "93%",
      variance: "+6.1%",
      variancePositive: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">
              Q4 Sales Analysis Detailed Results
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-2 py-2 text-gray-600 hover:text-gray-900 transition-colors">
              Help
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Bell size={20} />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <Settings size={20} />
            </button>
            <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white font-semibold">
              U
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Back Button and Action Buttons */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push("/report-automation?tab=history")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to History</span>
          </button>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2">
              <Download size={18} />
              Download Summary (Excel)
            </button>
            <button className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium flex items-center gap-2">
              <FileText size={18} />
              Download Summary (PPT)
            </button>
          </div>
        </div>

        {/* Title and Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Q4 Sales Analysis Detailed Results
          </h1>
          <p className="text-sm text-gray-600">
            Analysis completed on 2023-10-28 by John Doe
          </p>
        </div>

        {/* Analysis Results by Country */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Analysis Results by Country
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Detailed results for each market included in the analysis.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Country
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key Metric A
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key Metric B
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analysisData.map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {row.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{row.metricA}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{row.metricB}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div
                        className={`text-sm font-medium ${
                          row.variancePositive
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {row.variance}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Generated Graphs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Generated Graphs
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Visualizations generated from the summary data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Key Metric A by Country */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Key Metric A by Country
              </h3>
              <div
                className="bg-gray-100 rounded-lg flex items-center justify-center"
                style={{ height: "300px" }}
              >
                <p className="text-gray-400 text-sm">Bar chart placeholder</p>
              </div>
            </div>

            {/* Variance Overview */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Variance Overview
              </h3>
              <div
                className="bg-gray-100 rounded-lg flex items-center justify-center"
                style={{ height: "300px" }}
              >
                <p className="text-gray-400 text-sm">Pie chart placeholder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
