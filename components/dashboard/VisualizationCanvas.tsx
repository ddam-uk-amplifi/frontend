'use client';

import { useState, useMemo } from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  ReferenceLine,
} from 'recharts';
import { applyOthersLogic, checkDataDensity, arlaFieldMappings } from './utils/dataProcessing';
import { DataDensityWarning } from './DataDensityWarning';
import { GaugeChart } from './GaugeChart';
import arlaData from '@/lib/static/arla-summary-excel.json';

interface VisualizationCanvasProps {
  selectedFields: Record<string, string[]>;
  selectedGraphType: string | null;
  client: string;
  market: string;
  period: string;
  dataSource?: 'summary' | 'trackers' | '';
}

export function VisualizationCanvas({
  selectedFields,
  selectedGraphType,
  client,
  market,
  period,
  dataSource = '',
}: VisualizationCanvasProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [autoSwitchedToTable, setAutoSwitchedToTable] = useState(false);

  const getTotalSelected = () => {
    return Object.values(selectedFields).reduce((sum, arr) => sum + arr.length, 0);
  };

  // Get real Arla data based on data source selection
  const getArlaData = useMemo(() => {
    if (client !== 'Arla') return null;
    
    if (dataSource === 'summary') {
      // Get YTD summary data - aggregate by media type
      const ytdData = arlaData.summary_excel?.ytd_summary || [];
      
      // Filter by market if specified, otherwise aggregate all markets
      const filteredData = market 
        ? ytdData.filter((row: any) => row.market === market)
        : ytdData;
      
      // Aggregate by media type
      const mediaAggregates: Record<string, any> = {};
      filteredData.forEach((row: any) => {
        const media = row.media;
        if (media === 'TOTAL') return; // Skip total rows for chart
        
        if (!mediaAggregates[media]) {
          mediaAggregates[media] = {
            name: media,
            total_net_net_spend: 0,
            total_addressable_net_net_spend: 0,
            total_net_net_measured: 0,
            savings_value: 0,
            measured_spend_percent: 0,
            savings_percent: 0,
            inflation_percent: 0,
            inflation_mitigation_percent: 0,
            count: 0,
          };
        }
        
        mediaAggregates[media].total_net_net_spend += row.total_net_net_spend || 0;
        mediaAggregates[media].total_addressable_net_net_spend += row.total_addressable_net_net_spend || 0;
        mediaAggregates[media].total_net_net_measured += row.total_net_net_measured || 0;
        mediaAggregates[media].savings_value += row.savings_value || 0;
        mediaAggregates[media].measured_spend_percent += row.measured_spend_percent || 0;
        mediaAggregates[media].savings_percent += row.savings_percent || 0;
        mediaAggregates[media].inflation_percent += (typeof row.inflation_percent === 'number' ? row.inflation_percent : 0);
        mediaAggregates[media].inflation_mitigation_percent += (typeof row.inflation_mitigation_percent === 'number' ? row.inflation_mitigation_percent : 0);
        mediaAggregates[media].count += 1;
      });
      
      // Calculate averages for percentages
      return Object.values(mediaAggregates).map((agg: any) => ({
        ...agg,
        measured_spend_percent: agg.count > 0 ? agg.measured_spend_percent / agg.count : 0,
        savings_percent: agg.count > 0 ? agg.savings_percent / agg.count : 0,
        inflation_percent: agg.count > 0 ? agg.inflation_percent / agg.count : 0,
        inflation_mitigation_percent: agg.count > 0 ? agg.inflation_mitigation_percent / agg.count : 0,
      })).filter((item: any) => item.total_net_net_spend > 0 || item.savings_value !== 0);
    }
    
    return null;
  }, [client, dataSource, market]);

  // Generate sample data based on selected fields (simulate large dataset)
  const generateSampleData = () => {
    // Use real Arla data if available
    if (getArlaData && getArlaData.length > 0) {
      return getArlaData;
    }
    
    const mediaTypes = ['TV', 'Digital', 'Radio', 'OOH', 'Print', 'Cinema'];
    const markets = ['Germany', 'UK', 'France', 'Spain', 'Italy'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

    // Check which fields are selected
    const hasMedia = selectedFields['media']?.length > 0;
    const hasGeography = selectedFields['geography']?.length > 0;
    const hasTime = selectedFields['time']?.length > 0;

    // Default to media data if nothing specific is selected
    if (hasTime) {
      return months.map((month) => ({
        name: month,
        spend: 2000 + Math.random() * 1000,
        savings: 150 + Math.random() * 100,
        inflation: 2 + Math.random() * 2,
        index: 95 + Math.random() * 15,
      }));
    }

    if (hasGeography) {
      return markets.map((market) => ({
        name: market,
        spend: 5000 + Math.random() * 3000,
        savings: 300 + Math.random() * 200,
        savingsPct: 5 + Math.random() * 5,
        index: 95 + Math.random() * 15,
      }));
    }

    // Default data structure (media-based)
    return mediaTypes.map((media) => ({
      name: media,
      spend: 3000 + Math.random() * 2000,
      savings: 200 + Math.random() * 150,
      savingsPct: 5 + Math.random() * 5,
      cpu: 5 + Math.random() * 3,
      benchmark: 100 + Math.random() * 20,
      index: 95 + Math.random() * 15,
    }));
  };

  const rawData = generateSampleData();
  
  // Determine which data keys to use based on data type
  const isArlaData = client === 'Arla' && getArlaData && getArlaData.length > 0;
  const dataKeys = {
    spend: isArlaData ? 'total_net_net_spend' : 'spend',
    savings: isArlaData ? 'savings_value' : 'savings',
    savingsPct: isArlaData ? 'savings_percent' : 'savingsPct',
    inflationPct: isArlaData ? 'inflation_percent' : 'inflation',
    measuredPct: isArlaData ? 'measured_spend_percent' : 'measuredPct',
  };
  
  // Apply data density handling
  const getProcessedData = (chartType: string) => {
    if (!chartType) return rawData;
    
    const limits: Record<string, number> = {
      'pie-chart': 9,
      'bar-chart': 20,
      'grouped-bar': 15,
      'stacked-bar': 12,
      'line-chart': 25,
      'area-chart': 20,
    };

    const maxItems = limits[chartType];
    if (maxItems && rawData.length > maxItems) {
      return applyOthersLogic(rawData, maxItems, dataKeys.spend);
    }
    
    return rawData;
  };

  const sampleData = getProcessedData(selectedGraphType || '');
  
  // Check data density and show warnings
  const densityCheck = selectedGraphType 
    ? checkDataDensity(rawData.length, selectedGraphType)
    : { isHigh: false };

  // Filter data if a filter is active
  const filteredData = activeFilter 
    ? sampleData.filter(item => item.name === activeFilter)
    : sampleData;

  const COLORS = ['#004D9F', '#0066CC', '#3385DB', '#66A3E5', '#99C2EF', '#CCE0F7'];

  // Handle clicking on chart elements (cross-filtering)
  const handleChartClick = (dataPoint: any) => {
    if (dataPoint && dataPoint.name) {
      setActiveFilter(activeFilter === dataPoint.name ? null : dataPoint.name);
    }
  };

  // Demo data for chart gallery preview
  const demoData = [
    { name: 'TV', spend: 4200, savings: 320 },
    { name: 'Digital', spend: 3800, savings: 280 },
    { name: 'Radio', spend: 2100, savings: 150 },
    { name: 'OOH', spend: 1800, savings: 120 },
    { name: 'Print', spend: 1200, savings: 90 },
  ];

  const renderChartGallery = () => {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Available Chart Types</h2>
          <p className="text-gray-500">Select fields from the Query Builder, then choose a chart type to visualize your data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* KPI Cards */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-purple-500"></span>
              KPI Cards
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">€24.5M</div>
                <div className="text-xs text-gray-500">Total Spend</div>
                <div className="text-xs text-green-600">↑ 12.3%</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-gray-900">8.5%</div>
                <div className="text-xs text-gray-500">Savings</div>
                <div className="text-xs text-green-600">↑ 0.8pp</div>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span>
              Bar Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" fill="#004D9F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-pink-500"></span>
              Pie Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={demoData} dataKey="spend" cx="50%" cy="50%" outerRadius={50} fill="#EC4899">
                  {demoData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Line Chart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
              Line Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={demoData}>
                <Line type="monotone" dataKey="spend" stroke="#06B6D4" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Area Chart */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500"></span>
              Area Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={demoData}>
                <Area type="monotone" dataKey="spend" stroke="#6366F1" fill="#6366F1" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Grouped Bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Grouped Bar
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" fill="#004D9F" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stacked Bar */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              Stacked Bar
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" stackId="a" fill="#004D9F" />
                <Bar dataKey="savings" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scatter Plot */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500"></span>
              Scatter Plot
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <ScatterChart>
                <Scatter data={demoData.map(d => ({ x: d.spend, y: d.savings }))} fill="#EF4444" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              Data Table
            </h4>
            <div className="text-xs">
              <div className="grid grid-cols-3 gap-1 font-medium text-gray-600 mb-1 pb-1 border-b">
                <span>Media</span>
                <span className="text-right">Spend</span>
                <span className="text-right">Savings</span>
              </div>
              {demoData.slice(0, 3).map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-1 text-gray-900 py-0.5">
                  <span>{row.name}</span>
                  <span className="text-right">€{(row.spend / 1000).toFixed(1)}K</span>
                  <span className="text-right text-green-600">€{row.savings}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gauge */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              Gauge Chart
            </h4>
            <div className="flex items-center justify-center h-[120px]">
              <div className="relative">
                <svg width="100" height="60" viewBox="0 0 100 60">
                  <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 10 55 A 40 40 0 0 1 70 20" fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-end justify-center pb-1">
                  <span className="text-lg font-bold text-gray-900">85%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap placeholder */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-600"></span>
              Heatmap
            </h4>
            <div className="grid grid-cols-5 gap-1 h-[120px]">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded"
                  style={{
                    backgroundColor: `rgba(0, 77, 159, ${0.2 + Math.random() * 0.8})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-8 p-4 bg-blue-50 rounded-xl">
          <p className="text-sm text-blue-800">
            👈 <strong>Step 1:</strong> Select data fields from the Query Builder on the left
            <br />
            👉 <strong>Step 2:</strong> Choose a chart type from the Graph Options on the right
          </p>
        </div>
      </div>
    );
  };

  const renderVisualization = () => {
    // Show chart gallery if no graph type is selected AND no fields are selected
    if (!selectedGraphType && getTotalSelected() === 0) {
      return renderChartGallery();
    }

    // Show message if fields are selected but no graph type chosen
    if (!selectedGraphType && getTotalSelected() > 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <BarChart3 className="w-16 h-16 text-[#004D9F] mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a graph type</h3>
          <p className="text-sm text-gray-500 max-w-md">
            You have selected {getTotalSelected()} field(s). Choose a visualization from the Graph Options panel on the right.
          </p>
        </div>
      );
    }

    const graphTitle = `${client || 'Client'} - ${market || 'All Markets'} - ${period || 'YTD'}`;

    // Calculate KPI values from real data
    const calculateKPIs = () => {
      if (!sampleData || sampleData.length === 0) {
        return { totalSpend: 0, savingsPct: 0, inflationPct: 0 };
      }
      
      const totalSpend = sampleData.reduce((sum, item) => sum + (item[dataKeys.spend] || 0), 0);
      const totalSavings = sampleData.reduce((sum, item) => sum + (item[dataKeys.savings] || 0), 0);
      const avgSavingsPct = sampleData.reduce((sum, item) => sum + (item[dataKeys.savingsPct] || 0), 0) / sampleData.length;
      const avgInflationPct = sampleData.reduce((sum, item) => sum + (item[dataKeys.inflationPct] || 0), 0) / sampleData.length;
      
      return {
        totalSpend,
        totalSavings,
        savingsPct: avgSavingsPct,
        inflationPct: avgInflationPct,
      };
    };
    
    const kpis = calculateKPIs();

    switch (selectedGraphType) {
      case 'kpi-card':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Total Spend</div>
              <div className="text-4xl font-bold text-gray-900 mb-1">
                €{(kpis.totalSpend / 1000000).toFixed(2)}M
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">↑ 12.3%</span>
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Average Savings %</div>
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {kpis.savingsPct.toFixed(1)}%
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">↑ 0.8pp</span>
                <span className="text-gray-500">vs last period</span>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="text-sm text-gray-600 mb-2">Average Inflation %</div>
              <div className="text-4xl font-bold text-gray-900 mb-1">
                {kpis.inflationPct.toFixed(1)}%
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-amber-600">↓ 1.2pp</span>
                <span className="text-gray-500">after mitigation</span>
              </div>
            </div>
          </div>
        );

      case 'pie-chart':
        return (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{graphTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">Click on any slice to filter and see details below</p>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={sampleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: €${(Number(value) / 1000).toFixed(0)}K`}
                  outerRadius={120}
                  fill="#8884d8"
                  dataKey={dataKeys.spend}
                  onClick={handleChartClick}
                  style={{ cursor: 'pointer' }}
                >
                  {sampleData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === activeFilter ? '#F59E0B' : COLORS[index % COLORS.length]}
                      opacity={activeFilter && entry.name !== activeFilter ? 0.3 : 1}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      case 'bar-chart':
        const hasIndexData = sampleData.some(item => item.index !== undefined);
        return (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{graphTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">Click on any bar to filter and see details below</p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sampleData} onClick={(e: any) => e && e.activePayload && handleChartClick(e.activePayload[0].payload)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {hasIndexData && (
                  <ReferenceLine 
                    y={100} 
                    stroke="#EF4444" 
                    strokeDasharray="3 3"
                    label={{ value: 'Benchmark: 100', position: 'right', fill: '#EF4444', fontSize: 12 }}
                  />
                )}
                <Bar 
                  dataKey={dataKeys.spend} 
                  fill="#004D9F" 
                  radius={[8, 8, 0, 0]} 
                  name="Spend (€)"
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'grouped-bar':
        return (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{graphTitle}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sampleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey={dataKeys.spend} fill="#004D9F" radius={[8, 8, 0, 0]} name="Total Spend" />
                <Bar dataKey={dataKeys.savings} fill="#10B981" radius={[8, 8, 0, 0]} name="Savings Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'stacked-bar':
        return (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{graphTitle}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={sampleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                <Legend />
                <Bar dataKey={dataKeys.spend} stackId="a" fill="#004D9F" radius={[0, 0, 0, 0]} name="Total Spend" />
                <Bar dataKey={dataKeys.savings} stackId="a" fill="#10B981" radius={[8, 8, 0, 0]} name="Savings Value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

      case 'line-chart':
        return (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{graphTitle}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={sampleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey={dataKeys.spend} stroke="#004D9F" strokeWidth={2} name="Total Spend" />
                <Line type="monotone" dataKey={dataKeys.savings} stroke="#10B981" strokeWidth={2} name="Savings Value" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        );

      case 'area-chart':
        return (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{graphTitle}</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={sampleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                <Legend />
                <Area type="monotone" dataKey={dataKeys.spend} stackId="1" stroke="#004D9F" fill="#004D9F" fillOpacity={0.6} name="Total Spend" />
                <Area type="monotone" dataKey={dataKeys.savings} stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Savings Value" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );

      case 'scatter':
        return (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">CPU vs Benchmark</h3>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" dataKey="cpu" name="CPU" tick={{ fontSize: 12 }} />
                <YAxis type="number" dataKey="benchmark" name="Benchmark" tick={{ fontSize: 12 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Media" data={sampleData} fill="#004D9F" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        );

      case 'gauge':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-6">{graphTitle} - Performance Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <GaugeChart value={105.3} label="CPU Index" />
              <GaugeChart value={87.2} label="Savings %" thresholds={{ red: 70, yellow: 85, green: 95 }} max={150} />
              <GaugeChart value={98.7} label="Quality Score" />
            </div>
          </div>
        );

      case 'table':
        return (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{graphTitle}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F4F4F4] border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Dimension</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-700">Spend (€K)</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-700">Savings (€K)</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-700">Savings %</th>
                  </tr>
                </thead>
                <tbody>
                  {sampleData.map((row, index) => (
                    <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-900">{row.name}</td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        €{Math.round(row.spend).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        €{Math.round(row.savings || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          {(row.savingsPct || 6.5).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <BarChart3 className="w-16 h-16 text-gray-300" />
          </div>
        );
    }
  };

  return (
    <div className="flex-1 p-8 bg-[#F4F4F4] overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Active Filter Indicator */}
        {activeFilter && (
          <div className="mb-4 flex items-center gap-3">
            <div className="px-4 py-2 bg-[#004D9F] text-white rounded-lg flex items-center gap-2">
              <span className="text-sm">Filtered by: {activeFilter}</span>
              <button
                onClick={() => setActiveFilter(null)}
                className="ml-2 hover:bg-white/20 rounded p-1"
              >
                <span className="text-xs">✕</span>
              </button>
            </div>
          </div>
        )}

        {/* Data Density Warning */}
        {densityCheck.isHigh && densityCheck.message && (
          <DataDensityWarning
            message={densityCheck.message}
            severity={densityCheck.suggestedChart ? 'warning' : 'info'}
            suggestedChart={densityCheck.suggestedChart}
            onSwitchChart={(chartType) => {
              setAutoSwitchedToTable(true);
            }}
          />
        )}

        {renderVisualization()}

        {/* Cross-filtering Detail Table */}
        {activeFilter && selectedGraphType !== 'table' && (
          <div className="mt-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Detailed View: {activeFilter}</h3>
              <p className="text-sm text-gray-500 mt-1">
                Click the filter badge above to clear and see all data
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#F4F4F4] border-b border-gray-200">
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Metric</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-700">Value</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-700">vs Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="px-6 py-4 text-gray-900">Spend</td>
                      <td className="px-6 py-4 text-right text-gray-900">
                        €{Math.round(item.spend).toLocaleString()}K
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-green-600">+12%</span>
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
