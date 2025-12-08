'use client';

import { useState } from 'react';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Activity, Table2, Grid3x3, TrendingUp, Layers, Map, AlertCircle, Gauge, Star } from 'lucide-react';
import { isChartCompatible, getRecommendedCharts } from './utils/dataProcessing';

interface GraphRecommendationsPanelProps {
  selectedFields: Record<string, string[]>;
  onSelectGraph: (graphType: string) => void;
  selectedGraphType: string | null;
}

export function GraphRecommendationsPanel({
  selectedFields,
  onSelectGraph,
  selectedGraphType,
}: GraphRecommendationsPanelProps) {
  const [hoveredGraph, setHoveredGraph] = useState<string | null>(null);

  const graphTypes = [
    {
      id: 'kpi-card',
      name: 'KPI Card',
      icon: Activity,
      color: '#8B5CF6',
      description: 'Single metric with trend',
      supportedFields: ['Metrics only (Spend, Savings %, etc.)'],
      tooltip: 'Use this to highlight key performance indicators. Perfect for executive dashboards showing critical metrics at a glance.',
    },
    {
      id: 'pie-chart',
      name: 'Pie Chart',
      icon: PieIcon,
      color: '#EC4899',
      description: 'Part-to-whole comparison',
      supportedFields: ['1 dimension + 1 metric (Media × Spend)'],
      tooltip: 'Best for showing composition or market share. Works well with 3-7 categories. Not suitable for time-series data.',
    },
    {
      id: 'bar-chart',
      name: 'Bar Chart',
      icon: BarChart3,
      color: '#004D9F',
      description: 'Compare values across categories',
      supportedFields: ['1 dimension + 1 metric'],
      tooltip: 'Compare values across different categories like markets, media types, or suppliers. Easy to read and versatile.',
    },
    {
      id: 'grouped-bar',
      name: 'Grouped Bar',
      icon: Grid3x3,
      color: '#F59E0B',
      description: 'Compare multiple metrics',
      supportedFields: ['1 dimension + 2+ metrics'],
      tooltip: 'Compare 2-3 metrics side by side (e.g., Spend vs Savings vs Budget). Great for multi-metric analysis.',
    },
    {
      id: 'stacked-bar',
      name: 'Stacked Bar',
      icon: Layers,
      color: '#10B981',
      description: 'Show composition over categories',
      supportedFields: ['2 dimensions + 1 metric'],
      tooltip: 'Show how totals break down into subcategories. Perfect for analyzing spend composition across markets.',
    },
    {
      id: 'line-chart',
      name: 'Line Chart',
      icon: LineIcon,
      color: '#06B6D4',
      description: 'Trend over time',
      supportedFields: ['Time dimension + 1+ metrics'],
      tooltip: 'Track changes over time. Essential for trend analysis, forecasting, and identifying patterns.',
    },
    {
      id: 'area-chart',
      name: 'Area Chart',
      icon: TrendingUp,
      color: '#6366F1',
      description: 'Stacked trend over time',
      supportedFields: ['Time + 2 dimensions + metric'],
      tooltip: 'Show cumulative trends over time. Great for visualizing how different segments contribute to total over time.',
    },
    {
      id: 'scatter',
      name: 'Scatter',
      icon: Activity,
      color: '#EF4444',
      description: 'Correlation between 2 metrics',
      supportedFields: ['2 metrics (CPU vs Benchmark)'],
      tooltip: 'Use this to see if high Spend correlates with high CPU Index. Identify outliers and relationships between metrics.',
    },
    {
      id: 'heatmap',
      name: 'Heatmap',
      icon: Map,
      color: '#F97316',
      description: 'Matrix of values',
      supportedFields: ['2 dimensions + 1 metric'],
      tooltip: 'Visualize data in a color-coded matrix. Perfect for showing spend patterns across Media × Market combinations.',
    },
    {
      id: 'table',
      name: 'Table',
      icon: Table2,
      color: '#64748B',
      description: 'Detailed data view',
      supportedFields: ['Any combination of fields'],
      tooltip: 'View raw data with formatting. Best for detailed analysis, exporting, or when data density is too high for charts.',
    },
    {
      id: 'gauge',
      name: 'Gauge',
      icon: Gauge,
      color: '#FF9900',
      description: 'Circular meter',
      supportedFields: ['Metrics only (Spend, Savings %, etc.)'],
      tooltip: 'Use this to show a single metric in a circular gauge format. Perfect for visualizing performance metrics.',
    },
  ];

  const getTotalSelected = () => {
    return Object.values(selectedFields).reduce((sum, arr) => sum + arr.length, 0);
  };

  // Use the smart recommendation function
  const recommendedGraphIds = getRecommendedCharts(selectedFields);

  // Sort graph types by compatibility score
  const sortedGraphTypes = [...graphTypes].sort((a, b) => {
    const scoreA = isChartCompatible(a.id, selectedFields).score || 0;
    const scoreB = isChartCompatible(b.id, selectedFields).score || 0;
    return scoreB - scoreA;
  });

  return (
    <div className="w-[320px] bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Graph Options</h3>
        <p className="text-sm text-gray-500">
          {getTotalSelected() > 0
            ? `${recommendedGraphIds.length} recommended for your selection`
            : 'Select fields to see recommendations'}
        </p>
      </div>

      <div className="p-4 space-y-3">
        {sortedGraphTypes.map((graph) => {
          const isRecommended = recommendedGraphIds.includes(graph.id);
          const compatibility = isChartCompatible(graph.id, selectedFields);
          const isDisabled = !compatibility.compatible;
          const score = compatibility.score || 0;
          
          return (
            <div key={graph.id} className="relative group">
              <button
                onClick={() => !isDisabled && onSelectGraph(graph.id)}
                disabled={isDisabled}
                onMouseEnter={() => setHoveredGraph(graph.id)}
                onMouseLeave={() => setHoveredGraph(null)}
                className={`
                  w-full p-4 rounded-xl border-2 text-left transition-all relative
                  ${selectedGraphType === graph.id
                    ? 'border-[#004D9F] bg-blue-50 shadow-md'
                    : isDisabled
                    ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 hover:border-[#004D9F] hover:shadow-md bg-white cursor-pointer'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${graph.color}15` }}
                  >
                    <graph.icon className="w-5 h-5" style={{ color: graph.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium text-gray-900">{graph.name}</h4>
                      {isRecommended && score >= 80 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-current" />
                          Best Match
                        </span>
                      )}
                      {isRecommended && score >= 60 && score < 80 && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                          Good
                        </span>
                      )}
                      {isDisabled && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          N/A
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{graph.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {graph.supportedFields.map((field, idx) => (
                        <span key={idx} className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {field}
                        </span>
                      ))}
                    </div>
                    {/* Score indicator */}
                    {!isDisabled && getTotalSelected() > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all"
                            style={{ 
                              width: `${score}%`,
                              backgroundColor: score >= 80 ? '#10B981' : score >= 60 ? '#3B82F6' : '#F59E0B'
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{score}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Tooltip on hover */}
              {hoveredGraph === graph.id && (
                <div className="absolute left-full ml-2 top-0 z-20 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg">
                  {graph.tooltip}
                  {isDisabled && compatibility.reason && (
                    <div className="mt-2 pt-2 border-t border-gray-700 text-red-300">
                      ⚠️ {compatibility.reason}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
