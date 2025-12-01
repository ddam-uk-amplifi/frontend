'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { Upload, Trash2, Plus, X, Download } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api/client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface Market {
  id: number;
  name: string;
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
  marketName: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'failed';
  error?: string;
  // Extraction response data
  jobId?: string;
  tablesExtracted?: number;
  tableInfo?: TableInfo[];
  downloadUrl?: string;
}

function ReportAutomationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('data-upload');
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'history') {
      setActiveTab('history');
    }
  }, [searchParams]);

  const [clientId, setClientId] = useState('arla');

  // Client companies - lowercase names for API
  const clients = [
    { id: 'arla', name: 'Arla' },
    { id: 'carlsberg', name: 'Carlsberg' },
    { id: 'kering', name: 'Kering' }
  ];

  const [markets, setMarkets] = useState<Market[]>([
    { id: 1, name: '', file: null },
    { id: 2, name: '', file: null }
  ]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [expandedRows, setExpandedRows] = useState<number[]>([]);

  const historyData = [
    {
      id: 1,
      projectName: 'Q4 Financials',
      analyzedBy: 'Jane Smith',
      registeredDate: '2023-10-15',
      completedDate: '2023-10-16',
      status: 'completed',
      markets: [
        { name: 'North America', fileName: 'NA_sales_data_Q4.xlsx' },
        { name: 'Europe', fileName: 'EU_market_trends_2023.xlsx' }
      ]
    },
    {
      id: 2,
      projectName: 'Annual Marketing Review',
      analyzedBy: 'John Doe',
      registeredDate: '2023-10-12',
      completedDate: '2023-10-12',
      status: 'completed',
      markets: []
    },
    {
      id: 3,
      projectName: 'Product Launch Analysis',
      analyzedBy: 'Emily White',
      registeredDate: '2023-09-28',
      completedDate: '2023-09-29',
      status: 'failed',
      markets: []
    },
  ];

  const toggleRow = (id: number) => {
    if (expandedRows.includes(id)) {
      setExpandedRows(expandedRows.filter(rowId => rowId !== id));
    } else {
      setExpandedRows([...expandedRows, id]);
    }
  };

  const addMarket = () => {
    setMarkets([...markets, { id: Date.now(), name: '', file: null }]);
  };

  const removeMarket = (id: number) => {
    setMarkets(markets.filter(market => market.id !== id));
    // Remove any upload progress for this market
    setUploadProgress(prev => prev.filter(p => p.marketId !== id));
  };

  const updateMarketName = (id: number, name: string) => {
    setMarkets(markets.map(market =>
      market.id === id ? { ...market, name } : market
    ));
  };

  const handleFileSelect = (marketId: number, file: File) => {
    // Just update market with selected file, don't upload yet
    setMarkets(markets.map(market =>
      market.id === marketId ? { ...market, file } : market
    ));
  };

  const handleRunAutomation = async () => {
    // Validate required fields
    if (!clientId) {
      alert('Please select a client before running automation');
      return;
    }

    // Check if there are any markets with files
    const marketsWithFiles = markets.filter(m => m.file !== null);
    if (marketsWithFiles.length === 0) {
      alert('Please add at least one market with a file');
      return;
    }

    // Clear previous upload progress
    setUploadProgress([]);

    // Upload all files
    for (const market of marketsWithFiles) {
      if (!market.file) continue;

      const uploadId = `${market.id}-${Date.now()}`;
      const marketName = market.name || `Market ${market.id}`;

      // Add to upload progress
      setUploadProgress(prev => [
        ...prev,
        {
          id: uploadId,
          marketId: market.id,
          marketName,
          fileName: market.file!.name,
          progress: 0,
          status: 'uploading'
        }
      ]);

      // Create form data for extraction API
      const formData = new FormData();
      formData.append('file', market.file);
      formData.append('client', clientId);

      try {
        const response = await apiClient.post('/api/v1/extraction/extract', formData, {
          onUploadProgress: (progressEvent) => {
            const progress = progressEvent.total
              ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
              : 0;

            setUploadProgress(prev =>
              prev.map(p =>
                p.id === uploadId ? { ...p, progress } : p
              )
            );
          },
        });

        // Mark as complete with extraction data
        const extractionData = response.data;
        setUploadProgress(prev =>
          prev.map(p =>
            p.id === uploadId ? {
              ...p,
              status: 'complete',
              progress: 100,
              jobId: extractionData.job_id,
              tablesExtracted: extractionData.tables_extracted,
              tableInfo: extractionData.table_info,
              downloadUrl: extractionData.download_url
            } : p
          )
        );
      } catch (error: any) {
        console.error('Upload error:', error);
        // Mark as failed
        setUploadProgress(prev =>
          prev.map(p =>
            p.id === uploadId
              ? {
                  ...p,
                  status: 'failed',
                  error: error.response?.data?.message || 'Upload failed'
                }
              : p
          )
        );
      }
    }
  };

  const handleFileInputChange = (marketId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(marketId, file);
    }
  };

  const removeUpload = (uploadId: string) => {
    setUploadProgress(prev => prev.filter(p => p.id !== uploadId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'text-green-600';
      case 'uploading':
        return 'text-blue-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-500';
      case 'uploading':
        return 'bg-blue-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getFileIcon = (status: string) => {
    const baseClasses = "w-8 h-10 flex items-center justify-center rounded";
    switch (status) {
      case 'complete':
        return `${baseClasses} bg-green-100 text-green-600`;
      case 'uploading':
        return `${baseClasses} bg-yellow-100 text-yellow-600`;
      case 'failed':
        return `${baseClasses} bg-red-100 text-red-600`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-600`;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      'in-progress': 'bg-yellow-100 text-yellow-700',
    };
    const labels = {
      completed: 'Completed',
      failed: 'Failed',
      'in-progress': 'In Progress',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Report Automation</h1>
          <p className="text-gray-600">Create new jobs and view past history.</p>
        </div>

        {/* Tabs */}
        <div className="mb-8 border-b border-gray-200">
          <div className="flex gap-8">
            <button
              onClick={() => setActiveTab('data-upload')}
              className={`pb-4 px-1 font-medium transition-colors cursor-pointer ${
                activeTab === 'data-upload'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Data Upload
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 px-1 font-medium transition-colors cursor-pointer ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'data-upload' && (
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
                    onChange={(e) => setClientId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
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
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Market Name
                        </label>
                        <input
                          type="text"
                          placeholder={market.id === 1 ? "e.g., North America" : "e.g., Europe"}
                          value={market.name}
                          onChange={(e) => updateMarketName(market.id, e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>

                      <input
                        ref={(el) => { fileInputRefs.current[market.id] = el; }}
                        type="file"
                        accept=".xlsx,.xls,.xlsb,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.ms-excel.sheet.binary.macroEnabled.12,text/csv"
                        onChange={(e) => handleFileInputChange(market.id, e)}
                        className="hidden"
                      />

                      <button
                        onClick={() => fileInputRefs.current[market.id]?.click()}
                        className="mt-7 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2 font-medium"
                      >
                        <Upload size={18} />
                        Upload Excel File
                      </button>

                      <button
                        onClick={() => removeMarket(market.id)}
                        className="mt-7 p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>

                    {market.file && (
                      <div className="mt-2 ml-0 text-sm text-gray-600 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
                  className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
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
                              ({upload.marketName})
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">{upload.progress}%</span>
                            <span className={`text-sm font-medium ${getStatusColor(upload.status)}`}>
                              {upload.status === 'complete' && 'Complete'}
                              {upload.status === 'uploading' && 'Uploading...'}
                              {upload.status === 'failed' && 'Failed'}
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
                            className={`h-2 rounded-full transition-all ${getProgressColor(upload.status)}`}
                            style={{ width: `${upload.progress}%` }}
                          />
                        </div>

                        {/* Error message */}
                        {upload.error && (
                          <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                        )}

                        {/* Extraction results */}
                        {upload.status === 'complete' && upload.tablesExtracted && (
                          <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-800">
                                  ✓ Extracted {upload.tablesExtracted} table{upload.tablesExtracted !== 1 ? 's' : ''}
                                </p>
                              </div>
                              {upload.downloadUrl && (
                                <button
                                  onClick={() => {
                                    const fullUrl = `${API_BASE_URL}${upload.downloadUrl}`;
                                    window.open(fullUrl, '_blank');
                                  }}
                                  className="ml-3 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
                                >
                                  <Download size={16} />
                                  Download
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run Automation Button */}
            <div className="flex justify-end">
              <button
                onClick={handleRunAutomation}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
              >
                Run Automation
              </button>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
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
                    <>
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {item.projectName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{item.analyzedBy}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{item.registeredDate}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600">{item.completedDate}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(item.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push('/report-automation/details?from=history')}
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
                                  expandedRows.includes(item.id) ? 'rotate-180' : ''
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
                      {expandedRows.includes(item.id) && item.markets.length > 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-gray-50">
                            <div className="space-y-2">
                              {item.markets.map((market, idx) => (
                                <div key={idx} className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Market Name
                                    </span>
                                    <div className="text-gray-900 mt-1">{market.name}</div>
                                  </div>
                                  <div>
                                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      File Name
                                    </span>
                                    <div className="text-gray-900 mt-1">{market.fileName}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
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
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-8">Loading...</div>}>
      <ReportAutomationContent />
    </Suspense>
  );
}
