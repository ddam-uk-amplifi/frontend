'use client';

import { useState } from 'react';
import { Target, FolderOpen, Calendar, ChevronDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const [selectedMarket, setSelectedMarket] = useState('All');
  const [selectedProject, setSelectedProject] = useState('All');
  const [selectedTimeRange, setSelectedTimeRange] = useState('Last 30 Days');

  // Daily trend data
  const dailyTrendData = [
    { day: 1, value: 45 },
    { day: 2, value: 52 },
    { day: 3, value: 48 },
    { day: 4, value: 61 },
    { day: 5, value: 55 },
    { day: 6, value: 58 },
    { day: 7, value: 62 },
    { day: 8, value: 68 },
    { day: 9, value: 72 },
    { day: 10, value: 75 },
    { day: 11, value: 79 },
    { day: 12, value: 85 },
  ];

  // Pie chart data
  const statusData = [
    { name: 'Succeeded', value: 98.2, color: '#4ECCA3' },
    { name: 'Failed', value: 0.8, color: '#FF6B6B' },
    { name: 'In Progress', value: 1.0, color: '#FFA726' },
  ];

  // Bar chart data
  const marketVolumeData = [
    { market: 'USA', volume: 450 },
    { market: 'EMEA', volume: 380 },
    { market: 'APAC', volume: 520 },
    { market: 'LATAM', volume: 290 },
    { market: 'Other', volume: 410 },
  ];

  // Latest automation runs
  const automationRuns = [
    {
      id: 1,
      reportName: 'Q3 Sales Performance',
      project: 'Project Alpha',
      market: 'USA',
      status: 'succeeded',
      timestamp: '2023-10-27 10:15 AM',
    },
    {
      id: 2,
      reportName: 'Weekly Marketing KPIs',
      project: 'Project Beta',
      market: 'EMEA',
      status: 'succeeded',
      timestamp: '2023-10-27 09:30 AM',
    },
    {
      id: 3,
      reportName: 'Daily Operations Summary',
      project: 'Project Gamma',
      market: 'APAC',
      status: 'failed',
      timestamp: '2023-10-27 08:00 AM',
    },
    {
      id: 4,
      reportName: 'Monthly Financial Close',
      project: 'Project Alpha',
      market: 'LATAM',
      status: 'in-progress',
      timestamp: '2023-10-27 07:45 AM',
    },
    {
      id: 5,
      reportName: 'Customer Engagement Report',
      project: 'Project Beta',
      market: 'USA',
      status: 'succeeded',
      timestamp: '2023-10-26 11:00 PM',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      succeeded: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      'in-progress': 'bg-yellow-100 text-yellow-700',
    };
    const labels = {
      succeeded: 'Succeeded',
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2">
              Create Report
            </button>
            <div className="w-10 h-10 rounded-full bg-orange-400 flex items-center justify-center text-white font-semibold">
              U
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-8 py-4">
        <div className="flex items-center gap-4">
          {/* Market Filter */}
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Target size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Market: {selectedMarket}</span>
              <ChevronDown size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Project Filter */}
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <FolderOpen size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Project: {selectedProject}</span>
              <ChevronDown size={16} className="text-gray-600" />
            </button>
          </div>

          {/* Time Range Filter */}
          <div className="relative">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Calendar size={16} className="text-gray-600" />
              <span className="text-sm font-medium text-gray-700">{selectedTimeRange}</span>
              <ChevronDown size={16} className="text-gray-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Total Reports Automated */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total Reports Automated</h3>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-gray-900">1,482</div>
              <div className="text-sm font-medium text-green-600 mb-1">+5.2%</div>
            </div>
          </div>

          {/* Overall Success Rate */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Overall Success Rate</h3>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-gray-900">98.2%</div>
              <div className="text-sm font-medium text-red-600 mb-1">-0.1%</div>
            </div>
          </div>

          {/* Reports Requiring Attention */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Reports Requiring Attention</h3>
            <div className="flex items-end gap-2">
              <div className="text-3xl font-bold text-gray-900">12</div>
              <div className="text-sm font-medium text-yellow-600 mb-1">+2</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Automation Trend */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Automation Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Automation Status Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Status Breakdown</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">98.2%</div>
                  <div className="text-sm text-gray-600">Success</div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#4ECCA3]"></div>
                <span className="text-sm text-gray-600">Succeeded</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF6B6B]"></div>
                <span className="text-sm text-gray-600">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FFA726]"></div>
                <span className="text-sm text-gray-600">In Progress</span>
              </div>
            </div>
          </div>
        </div>

        {/* Automation Volume by Market */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Automation Volume by Market</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={marketVolumeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="market" stroke="#9CA3AF" />
              <YAxis hide />
              <Tooltip />
              <Bar dataKey="volume" fill="#DBEAFE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Latest Automation Runs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Latest Automation Runs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Report Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Market
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {automationRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{run.reportName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{run.project}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{run.market}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(run.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{run.timestamp}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}