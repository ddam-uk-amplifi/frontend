'use client';

import { Building2, Database, MapPin, Calendar } from 'lucide-react';

export type DataSource = 'summary' | 'trackers' | '';

interface TopBarProps {
  selectedClient: string;
  selectedDataSource: DataSource;
  selectedMarket: string;
  selectedYtdMonth: string;
  onClientChange: (client: string) => void;
  onDataSourceChange: (source: DataSource) => void;
  onMarketChange: (market: string) => void;
  onYtdMonthChange: (month: string) => void;
}

export function TopBar({
  selectedClient,
  selectedDataSource,
  selectedMarket,
  selectedYtdMonth,
  onClientChange,
  onDataSourceChange,
  onMarketChange,
  onYtdMonthChange,
}: TopBarProps) {
  const clients = ['Arla', 'Carlsberg', 'Kering'];
  
  // Markets available per client (for Trackers data source)
  const marketsByClient: Record<string, string[]> = {
    'Arla': ['Denmark', 'Sweden', 'UK', 'Germany', 'Finland'],
    'Carlsberg': ['Denmark', 'Poland', 'Russia', 'China', 'UK'],
    'Kering': ['France', 'Italy', 'UK', 'US', 'China', 'Japan'],
  };

  const months = [
    { value: 'Jan', label: 'January' },
    { value: 'Feb', label: 'February' },
    { value: 'Mar', label: 'March' },
    { value: 'Apr', label: 'April' },
    { value: 'May', label: 'May' },
    { value: 'Jun', label: 'June' },
    { value: 'Jul', label: 'July' },
    { value: 'Aug', label: 'August' },
    { value: 'Sep', label: 'September' },
    { value: 'Oct', label: 'October' },
    { value: 'Nov', label: 'November' },
    { value: 'Dec', label: 'December' },
  ];

  const availableMarkets = selectedClient ? marketsByClient[selectedClient] || [] : [];

  // When data source changes, reset market if switching to summary
  const handleDataSourceChange = (source: DataSource) => {
    onDataSourceChange(source);
    if (source === 'summary') {
      onMarketChange(''); // Clear market selection for summary (consolidated data)
    }
  };

  return (
    <div className="h-[100px] bg-white border-b border-gray-200 px-8 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-6">
        {/* Client Selector */}
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-[#004D9F]" />
          <div>
            <label className="text-xs text-gray-500 block mb-1">Client</label>
            <select
              value={selectedClient}
              onChange={(e) => onClientChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004D9F] focus:border-transparent bg-white text-gray-900 min-w-[160px]"
            >
              <option value="">Select Client...</option>
              {clients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Source Selector */}
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-[#004D9F]" />
          <div>
            <label className="text-xs text-gray-500 block mb-1">Data Source</label>
            <select
              value={selectedDataSource}
              onChange={(e) => handleDataSourceChange(e.target.value as DataSource)}
              disabled={!selectedClient}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004D9F] focus:border-transparent bg-white text-gray-900 min-w-[180px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Data Source...</option>
              <option value="summary">Summary Excel</option>
              <option value="trackers">Trackers Data</option>
            </select>
          </div>
        </div>

        {/* Market Selector - Only visible when Trackers is selected */}
        {selectedDataSource === 'trackers' && (
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-[#004D9F]" />
            <div>
              <label className="text-xs text-gray-500 block mb-1">Market</label>
              <select
                value={selectedMarket}
                onChange={(e) => onMarketChange(e.target.value)}
                disabled={!selectedClient}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004D9F] focus:border-transparent bg-white text-gray-900 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Markets</option>
                {availableMarkets.map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* YTD Month Selector */}
        <div className="flex items-center gap-3">
          <Calendar className="w-5 h-5 text-[#004D9F]" />
          <div>
            <label className="text-xs text-gray-500 block mb-1">YTD Month</label>
            <select
              value={selectedYtdMonth}
              onChange={(e) => onYtdMonthChange(e.target.value)}
              disabled={!selectedClient}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#004D9F] focus:border-transparent bg-white text-gray-900 min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select Month...</option>
              {months.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Right side info summary */}
      {selectedClient && (
        <div className="text-right">
          <div className="text-sm font-medium text-gray-900">{selectedClient}</div>
          <div className="text-xs text-gray-500">
            {selectedDataSource === 'summary' 
              ? 'Consolidated Summary' 
              : selectedMarket || 'All Markets'
            } 
            {selectedYtdMonth && ` • YTD ${selectedYtdMonth}`}
          </div>
        </div>
      )}
    </div>
  );
}
