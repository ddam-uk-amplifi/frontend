"use client";

import {
  Building2,
  Database,
  MapPin,
  Calendar,
  ChevronDown,
} from "lucide-react";

export type DataSource = "summary" | "trackers" | "";

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
  const clients = ["Arla", "Carlsberg", "Kering"];

  // Markets available per client (for Trackers data source)
  const marketsByClient: Record<string, string[]> = {
    Arla: ["Denmark", "Sweden", "UK", "Germany", "Finland"],
    Carlsberg: ["Denmark", "Poland", "Russia", "China", "UK"],
    Kering: ["France", "Italy", "UK", "US", "China", "Japan"],
  };

  const availableMarkets = selectedClient
    ? marketsByClient[selectedClient] || []
    : [];

  // When data source changes, reset market if switching to summary
  const handleDataSourceChange = (source: DataSource) => {
    onDataSourceChange(source);
    if (source === "summary") {
      onMarketChange(""); // Clear market selection for summary (consolidated data)
    }
  };

  // Modern select component styling
  const selectBaseClass = `
    appearance-none cursor-pointer
    pl-3 pr-8 py-2 
    bg-white/80 backdrop-blur-sm
    border border-slate-200/60
    rounded-xl
    text-sm font-medium text-slate-700
    shadow-sm
    transition-all duration-200
    hover:border-slate-300 hover:bg-white hover:shadow-md
    focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400
    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-sm
  `;

  return (
    <div className="h-[72px] bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/60 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Client Selector */}
        <div className="relative group">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div className="relative">
              <select
                value={selectedClient}
                onChange={(e) => onClientChange(e.target.value)}
                className={`${selectBaseClass} min-w-[130px]`}
              >
                <option value="">Client...</option>
                {clients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="w-px h-8 bg-slate-200/60" />

        {/* Data Source Selector */}
        <div className="relative group">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div className="relative">
              <select
                value={selectedDataSource}
                onChange={(e) =>
                  handleDataSourceChange(e.target.value as DataSource)
                }
                disabled={!selectedClient}
                className={`${selectBaseClass} min-w-[150px]`}
              >
                <option value="">Data Source...</option>
                <option value="summary">Summary Excel</option>
                <option value="trackers">Trackers Data</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Market Selector - Only visible when Trackers is selected */}
        {selectedDataSource === "trackers" && (
          <>
            <div className="w-px h-8 bg-slate-200/60" />
            <div className="relative group">
              <div className="flex items-center gap-2 px-1">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-sm">
                  <MapPin className="w-4 h-4 text-white" />
                </div>
                <div className="relative">
                  <select
                    value={selectedMarket}
                    onChange={(e) => onMarketChange(e.target.value)}
                    disabled={!selectedClient}
                    className={`${selectBaseClass} min-w-[130px]`}
                  >
                    <option value="">All Markets</option>
                    {availableMarkets.map((market) => (
                      <option key={market} value={market}>
                        {market}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </>
        )}

        <div className="w-px h-8 bg-slate-200/60" />
      </div>

      {/* Right side - Context Badge */}
      {selectedClient && (
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-900 rounded-xl shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div>
                <span className="text-sm font-semibold text-white">
                  {selectedClient}
                </span>
                <span className="text-slate-400 mx-2">•</span>
                <span className="text-sm text-slate-300">
                  {selectedDataSource === "summary"
                    ? "Summary"
                    : selectedMarket || "Trackers"}
                </span>
                {selectedYtdMonth && (
                  <>
                    <span className="text-slate-400 mx-2">•</span>
                    <span className="text-sm text-slate-300">
                      YTD {selectedYtdMonth}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
