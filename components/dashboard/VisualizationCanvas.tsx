'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { BarChart3, Sparkles, Maximize2, FileText, Check, Loader2 } from 'lucide-react';
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
import { applyOthersLogic, checkDataDensity, arlaFieldMappings, analyzeSelectedFields, getFieldType } from './utils/dataProcessing';
import { DataDensityWarning } from './DataDensityWarning';
import { GaugeChart } from './GaugeChart';
import { GraphModal } from './GraphModal';
import {
  fetchSummaryDataFromSelection,
  ConsolidatedSummaryResponse,
  BACKEND_TO_FRONTEND_FIELD_MAP,
  getSheetTypeFromFields,
  fetchTrackerComplete,
  fetchTrackerSummaryData,
  TrackerCompleteResponse,
  TrackerSummaryItem,
  TrackerMediaType,
  TRACKER_BACKEND_TO_DISPLAY_MAP,
  getTrackerMediaTypeFromFields,
} from '@/lib/api/dashboard';

interface VisualizationCanvasProps {
  selectedFields: Record<string, string[]>;
  selectedGraphType: string | null;
  client: string;
  market: string;
  period: string;
  dataSource?: 'summary' | 'trackers' | '';
  jobId?: string;
  clientId?: number;  // For tracker data - auto-resolves to latest job
  trackerMediaType?: TrackerMediaType;  // For tracker data - which media type
  selectedGraphsForPPT?: Set<string>;
  onToggleGraphForPPT?: (graphId: string, graphTitle: string, element?: HTMLElement) => void;
  onUpdateSlideNumber?: (graphId: string, slideNumber: number | undefined) => void;
  getSlideNumber?: (graphId: string) => number | undefined;
  registerChartElement?: (graphId: string, element: HTMLElement | null) => void;
}

export function VisualizationCanvas({
  selectedFields,
  selectedGraphType,
  client,
  market,
  period,
  dataSource = '',
  jobId = '',
  clientId,
  trackerMediaType,
  selectedGraphsForPPT = new Set(),
  onToggleGraphForPPT,
  onUpdateSlideNumber,
  getSlideNumber,
  registerChartElement,
}: VisualizationCanvasProps) {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [autoSwitchedToTable, setAutoSwitchedToTable] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);

  // Ref to hold the current chart container element for PPT capture
  const chartContainerRef = useRef<HTMLDivElement>(null);
  // Ref for capturing only the chart content (excludes buttons/actions for cleaner PPT export)
  const chartOnlyRef = useRef<HTMLDivElement>(null);

  // API data state - supports both consolidated summary and tracker data
  const [apiData, setApiData] = useState<ConsolidatedSummaryResponse | null>(null);
  const [trackerData, setTrackerData] = useState<TrackerCompleteResponse | null>(null);
  const [trackerSummaryData, setTrackerSummaryData] = useState<TrackerSummaryItem[] | null>(null);
  const [isLoadingApiData, setIsLoadingApiData] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Generate a unique graph ID based on current state (include jobId or clientId)
  const graphId = `${selectedGraphType}-${client}-${market}-${period}-${jobId || clientId}`;
  const graphTitle = `${client || 'Client'} - ${market || 'All Markets'} - ${period || 'YTD'}${trackerMediaType ? ` (${trackerMediaType.toUpperCase()})` : ''}`;
  const isIncludedInReport = selectedGraphsForPPT.has(graphId);
  const slideNumber = getSlideNumber?.(graphId);

  // Register chart element when included in PPT selection
  useEffect(() => {
    if (isIncludedInReport && chartOnlyRef.current && registerChartElement) {
      registerChartElement(graphId, chartOnlyRef.current);
    }
    return () => {
      // Cleanup when unmounting or when no longer included
      if (registerChartElement) {
        registerChartElement(graphId, null);
      }
    };
  }, [isIncludedInReport, graphId, registerChartElement]);

  // Track when chart container is ready (ref is available)
  useEffect(() => {
    // Small delay to ensure DOM is ready after render
    const timer = setTimeout(() => {
      setIsChartReady(!!chartOnlyRef.current);
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedGraphType, client, market, period]); // Re-check when these change

  // Handle toggle with element ref - uses chartOnlyRef for clean capture without buttons
  const handleToggleForPPT = useCallback(() => {
    console.log('[VisualizationCanvas] handleToggleForPPT called');
    console.log('[VisualizationCanvas] graphId:', graphId);
    console.log('[VisualizationCanvas] isChartReady:', isChartReady);
    console.log('[VisualizationCanvas] chartOnlyRef.current:', chartOnlyRef.current);

    // If already included, allow removal without element
    const isCurrentlyIncluded = selectedGraphsForPPT.has(graphId);

    if (!isCurrentlyIncluded && !chartOnlyRef.current) {
      console.warn('[VisualizationCanvas] Cannot add to PPT - chart not ready');
      return;
    }

    if (onToggleGraphForPPT) {
      onToggleGraphForPPT(graphId, graphTitle, chartOnlyRef.current || undefined);
    }
  }, [graphId, graphTitle, onToggleGraphForPPT, isChartReady, selectedGraphsForPPT]);

  // Fetch data from API when data source is selected and fields change
  useEffect(() => {
    const fetchData = async () => {
      const totalSelected = Object.values(selectedFields).reduce((sum, arr) => sum + arr.length, 0);

      // Reset data when no fields selected
      if (totalSelected === 0) {
        setApiData(null);
        setTrackerData(null);
        return;
      }

      // Only fetch for Arla client
      if (client !== 'Arla') {
        setApiData(null);
        setTrackerData(null);
        return;
      }

      setIsLoadingApiData(true);
      setApiError(null);

      try {
        if (dataSource === 'summary' && jobId) {
          // Fetch consolidated summary data
          const response = await fetchSummaryDataFromSelection(
            client,
            jobId,
            selectedFields,
            market ? parseInt(market, 10) : undefined,
            undefined
          );
          setApiData(response);
          setTrackerData(null);
          setTrackerSummaryData(null);
        } else if (dataSource === 'trackers' && clientId) {
          // Auto-detect media type from selected fields if not explicitly provided
          const detectedMediaType = trackerMediaType || getTrackerMediaTypeFromFields(selectedFields);

          if (!detectedMediaType) {
            console.warn('Could not determine tracker media type from selected fields');
            setApiError('Please select fields from a specific media type (Summary, TV, Radio, Print, etc.)');
            setTrackerData(null);
            setTrackerSummaryData(null);
            setApiData(null);
            setIsLoadingApiData(false);
            return;
          }

          const marketId = market ? parseInt(market, 10) : undefined;

          // Handle Summary vs specific media types
          if (detectedMediaType === 'summary') {
            // Fetch tracker summary data (aggregated by media type)
            const response = await fetchTrackerSummaryData(
              client,
              clientId,
              !isNaN(marketId as number) ? marketId : undefined
            );
            setTrackerSummaryData(response);
            setTrackerData(null);
            setApiData(null);
          } else {
            // Fetch complete tracker data using /tracker/{media}/complete endpoint
            const response = await fetchTrackerComplete(
              client,
              clientId,
              detectedMediaType as TrackerMediaType,
              !isNaN(marketId as number) ? marketId : undefined
            );
            setTrackerData(response);
            setTrackerSummaryData(null);
            setApiData(null);
          }
        } else {
          setApiData(null);
          setTrackerData(null);
          setTrackerSummaryData(null);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setApiError(error instanceof Error ? error.message : 'Failed to fetch data');
        setApiData(null);
        setTrackerData(null);
        setTrackerSummaryData(null);
      } finally {
        setIsLoadingApiData(false);
      }
    };

    fetchData();
  }, [client, dataSource, jobId, clientId, trackerMediaType, selectedFields, market]);

  const getTotalSelected = () => {
    return Object.values(selectedFields).reduce((sum, arr) => sum + arr.length, 0);
  };

  // Transform API data into chart-compatible format (for consolidated summary)
  const getApiChartData = useMemo(() => {
    if (!apiData || apiData.data.length === 0) return null;

    // Group data by media_type and aggregate
    const mediaAggregates: Record<string, any> = {};

    apiData.data.forEach((row) => {
      const mediaType = row.media_type || 'Unknown';

      if (!mediaAggregates[mediaType]) {
        mediaAggregates[mediaType] = {
          name: mediaType,
          market_name: row.market_name,
          market_id: row.market_id,
          year: row.year,
        };

        // Initialize all requested fields to 0
        apiData.requested_fields.forEach(field => {
          mediaAggregates[mediaType][field] = 0;
        });
      }

      // Sum up the values for each requested field
      apiData.requested_fields.forEach(field => {
        const value = row[field];
        if (typeof value === 'number') {
          mediaAggregates[mediaType][field] += value;
        }
      });
    });

    return Object.values(mediaAggregates).filter((item: any) => {
      // Filter out items where all numeric fields are 0 or null
      return apiData.requested_fields.some(field => {
        const val = item[field];
        return typeof val === 'number' && val !== 0;
      });
    });
  }, [apiData]);

  // Transform tracker data into chart-compatible format
  // TrackerCompleteResponse has { general, monthly, percentile } arrays
  const getTrackerChartData = useMemo(() => {
    if (!trackerData) return null;

    // Get all available data from the complete response
    const generalData = trackerData.general || [];
    const monthlyData = trackerData.monthly || [];
    const percentileData = trackerData.percentile || [];

    // Check if we have any data
    if (generalData.length === 0 && monthlyData.length === 0 && percentileData.length === 0) {
      return null;
    }

    // Determine which data level to use based on selected fields
    // For now, prioritize monthly data if available (good for time series), else general
    if (monthlyData.length > 0) {
      // Group by month
      const monthAggregates: Record<string, Record<string, unknown>> = {};

      // Get all numeric fields from first row
      const sampleRow = monthlyData[0] as Record<string, unknown>;
      const numericFields = Object.keys(sampleRow).filter(key => {
        const val = sampleRow[key];
        return typeof val === 'number' && !['id', 'market_id', 'tv_data_general_id', 'print_data_general_id', 'ooh_data_general_id', 'radio_data_general_id', 'online_data_general_id', 'cinema_data_general_id'].includes(key);
      });

      monthlyData.forEach((row) => {
        const rowData = row as Record<string, unknown>;
        const month = (rowData.month as string) || 'Unknown';

        if (!monthAggregates[month]) {
          monthAggregates[month] = { name: month };
          numericFields.forEach(field => {
            monthAggregates[month][field] = 0;
          });
        }

        numericFields.forEach(field => {
          const value = rowData[field];
          if (typeof value === 'number') {
            (monthAggregates[month][field] as number) += value;
          }
        });
      });

      // Sort by month order
      const monthOrder = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      return Object.values(monthAggregates).sort((a, b) => {
        return monthOrder.indexOf(a.name as string) - monthOrder.indexOf(b.name as string);
      });
    } else if (generalData.length > 0) {
      // Use general data - each row is a campaign/line item
      // Get all numeric fields from first row
      const sampleRow = generalData[0] as Record<string, unknown>;
      const numericFields = Object.keys(sampleRow).filter(key => {
        const val = sampleRow[key];
        return typeof val === 'number' && !['id', 'market_id', 'row_index', 'extracted_file_id'].includes(key);
      });

      return generalData.map((row, index) => {
        const rowData = row as Record<string, unknown>;
        const result: Record<string, unknown> = {
          name: `Row ${index + 1}`,
        };

        // Try to get a better name from buy_specifics
        const buySpecifics = rowData.buy_specifics as Record<string, unknown> | null;
        if (buySpecifics && typeof buySpecifics === 'object') {
          const campaign = buySpecifics['Campaign Name'] || buySpecifics['campaign_name'];
          if (campaign) {
            result.name = campaign;
          }
        }

        // Copy all numeric fields
        numericFields.forEach(field => {
          result[field] = rowData[field] || 0;
        });

        return result;
      }).filter((item) => {
        // Filter out rows where all numeric fields are 0
        return numericFields.some(field => {
          const val = item[field];
          return typeof val === 'number' && val !== 0;
        });
      });
    }

    return null;
  }, [trackerData]);

  // Transform tracker summary data into chart-compatible format
  // Each row represents a media type with aggregated metrics
  const getTrackerSummaryChartData = useMemo(() => {
    if (!trackerSummaryData || trackerSummaryData.length === 0) return null;

    // Transform each summary row - use media_type as the name
    return trackerSummaryData.map((row) => {
      return {
        name: row.media_type || 'Unknown',
        period: row.period,
        total_net_net_spend: row.total_net_net_spend || 0,
        total_non_addressable_spend: row.total_non_addressable_spend || 0,
        total_addressable_spend: row.total_addressable_spend || 0,
        measured_spend: row.measured_spend || 0,
        measured_spend_pct: row.measured_spend_pct || 0,
        benchmark_equivalent_net_net_spend: row.benchmark_equivalent_net_net_spend || 0,
        value_loss: row.value_loss || 0,
        value_loss_pct: row.value_loss_pct || 0,
      };
    });
  }, [trackerSummaryData]);

  // Static demo data for Arla + Trackers when no API data is available
  const arlaTrackerDemoData = useMemo(() => [
    {
      name: 'TV',
      total_net_net_spend: 4850000,
      total_addressable_spend: 3420000,
      total_non_addressable_spend: 1430000,
      measured_spend: 4120000,
      measured_spend_pct: 85.0,
      benchmark_equivalent_net_net_spend: 4650000,
      value_loss: 200000,
      value_loss_pct: 4.1,
      savings_value: 425000,
      savings_pct: 8.7,
      inflation_pct: 3.2,
      index: 104.3,
    },
    {
      name: 'Digital',
      total_net_net_spend: 3250000,
      total_addressable_spend: 2890000,
      total_non_addressable_spend: 360000,
      measured_spend: 3050000,
      measured_spend_pct: 93.8,
      benchmark_equivalent_net_net_spend: 3100000,
      value_loss: 150000,
      value_loss_pct: 4.6,
      savings_value: 312000,
      savings_pct: 9.6,
      inflation_pct: 2.8,
      index: 105.2,
    },
    {
      name: 'Radio',
      total_net_net_spend: 1420000,
      total_addressable_spend: 980000,
      total_non_addressable_spend: 440000,
      measured_spend: 1180000,
      measured_spend_pct: 83.1,
      benchmark_equivalent_net_net_spend: 1380000,
      value_loss: 40000,
      value_loss_pct: 2.8,
      savings_value: 142000,
      savings_pct: 10.0,
      inflation_pct: 1.5,
      index: 102.9,
    },
    {
      name: 'OOH',
      total_net_net_spend: 1890000,
      total_addressable_spend: 1450000,
      total_non_addressable_spend: 440000,
      measured_spend: 1650000,
      measured_spend_pct: 87.3,
      benchmark_equivalent_net_net_spend: 1820000,
      value_loss: 70000,
      value_loss_pct: 3.7,
      savings_value: 183000,
      savings_pct: 9.7,
      inflation_pct: 2.1,
      index: 103.8,
    },
    {
      name: 'Print',
      total_net_net_spend: 980000,
      total_addressable_spend: 620000,
      total_non_addressable_spend: 360000,
      measured_spend: 780000,
      measured_spend_pct: 79.6,
      benchmark_equivalent_net_net_spend: 950000,
      value_loss: 30000,
      value_loss_pct: 3.1,
      savings_value: 88000,
      savings_pct: 9.0,
      inflation_pct: 0.8,
      index: 103.2,
    },
    {
      name: 'Cinema',
      total_net_net_spend: 420000,
      total_addressable_spend: 350000,
      total_non_addressable_spend: 70000,
      measured_spend: 380000,
      measured_spend_pct: 90.5,
      benchmark_equivalent_net_net_spend: 410000,
      value_loss: 10000,
      value_loss_pct: 2.4,
      savings_value: 42000,
      savings_pct: 10.0,
      inflation_pct: 1.2,
      index: 102.4,
    },
  ], []);

  // Get real Arla data based on data source selection
  // Uses API data when available, falls back to static demo data for trackers
  const getArlaData = useMemo(() => {
    if (client !== 'Arla') return null;

    // Use API data for summary
    if (dataSource === 'summary' && getApiChartData && getApiChartData.length > 0) {
      return getApiChartData;
    }

    // Use tracker data for trackers
    if (dataSource === 'trackers') {
      // Check for tracker summary data first (when Summary category is selected)
      if (getTrackerSummaryChartData && getTrackerSummaryChartData.length > 0) {
        return getTrackerSummaryChartData;
      }
      // Fall back to media-specific tracker data
      if (getTrackerChartData && getTrackerChartData.length > 0) {
        return getTrackerChartData;
      }
      // Fall back to static demo data for trackers
      return arlaTrackerDemoData;
    }

    // No fallback for summary - return null if no API data
    return null;
  }, [client, dataSource, getApiChartData, getTrackerChartData, getTrackerSummaryChartData, arlaTrackerDemoData]);

  // Get chart data - only returns real data, no sample/mock data for Arla
  const getChartData = () => {
    // For Arla, only return real API data
    // For Arla summary data
    if (client === 'Arla' && dataSource === 'summary') {
      if (getArlaData && getArlaData.length > 0) {
        return getArlaData;
      }
      // Return empty array - no mock data
      return [];
    }

    // For Arla tracker data
    if (client === 'Arla' && dataSource === 'trackers') {
      if (getArlaData && getArlaData.length > 0) {
        return getArlaData;
      }
      // Return empty array - no mock data
      return [];
    }

    // For non-Arla clients, can still use sample data (for demo purposes)
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

  const rawData = getChartData();

  // Check if we have actual data to display
  const hasData = rawData.length > 0;

  // Determine which data keys to use based on data type
  const isArlaData = client === 'Arla' && getArlaData && getArlaData.length > 0;
  const isApiData = apiData && apiData.data.length > 0;
  const isTrackerApiData = trackerData && (
    (trackerData.general && trackerData.general.length > 0) ||
    (trackerData.monthly && trackerData.monthly.length > 0) ||
    (trackerData.percentile && trackerData.percentile.length > 0)
  );

  // Get available fields from tracker complete response
  const trackerAvailableFields = useMemo(() => {
    if (!trackerData) return [];

    // Get fields from general, monthly, or percentile data
    const sampleData = trackerData.monthly?.[0] || trackerData.general?.[0] || trackerData.percentile?.[0];
    if (!sampleData) return [];

    // Extract numeric field names
    return Object.keys(sampleData as Record<string, unknown>).filter(key => {
      const val = (sampleData as Record<string, unknown>)[key];
      return typeof val === 'number' && !['id', 'market_id', 'row_index', 'extracted_file_id', 'tv_data_general_id', 'print_data_general_id', 'ooh_data_general_id', 'radio_data_general_id', 'online_data_general_id', 'cinema_data_general_id'].includes(key);
    });
  }, [trackerData]);

  // Get the first field from API response for primary data key (for charts)
  const primaryApiField = isApiData && apiData.requested_fields.length > 0
    ? apiData.requested_fields[0]
    : (isTrackerApiData && trackerAvailableFields.length > 0
      ? trackerAvailableFields[0]
      : null);

  // Get all requested fields from either API source
  const allApiFields = isApiData
    ? apiData.requested_fields
    : (isTrackerApiData ? trackerAvailableFields : []);

  const dataKeys = {
    spend: primaryApiField || (isArlaData ? 'total_net_net_spend' : 'spend'),
    savings: allApiFields.includes('savings_value') ? 'savings_value'
      : allApiFields.includes('fy_total_savings') ? 'fy_total_savings'
        : allApiFields.includes('fy_savings') ? 'fy_savings'
          : (isArlaData ? 'savings_value' : 'savings'),
    savingsPct: allApiFields.includes('savings_pct') ? 'savings_pct'
      : allApiFields.includes('fy_total_savings_pct') ? 'fy_total_savings_pct'
        : allApiFields.includes('fy_savings_pct') ? 'fy_savings_pct'
          : (isArlaData ? 'savings_pct' : 'savingsPct'),
    inflationPct: allApiFields.includes('inflation_pct') ? 'inflation_pct' : (isArlaData ? 'inflation_pct' : 'inflation'),
    measuredPct: allApiFields.includes('measured_spend_pct') ? 'measured_spend_pct' : (isArlaData ? 'measured_spend_pct' : 'measuredPct'),
    index: isArlaData ? 'index' : 'index',
    // All API fields for multi-field charts
    apiFields: allApiFields,
  };

  // Apply data density handling
  const getProcessedData = (chartType: string) => {
    if (!chartType) return rawData;

    const limits: Record<string, number> = {
      'pie-chart': 9,
      'bar-chart': 20,
      'grouped-bar': 15,
      'dual-axis-bar': 15,
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

  const COLORS = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'];

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
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Available Chart Types</h2>
          <p className="text-slate-500">Select fields from the Query Builder, then choose a chart type to visualize your data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* KPI Cards */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-500"></span>
              KPI Cards
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-slate-800">€24.5M</div>
                <div className="text-xs text-slate-500">Total Spend</div>
                <div className="text-xs text-emerald-600">↑ 12.3%</div>
              </div>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-slate-800">8.5%</div>
                <div className="text-xs text-slate-500">Savings</div>
                <div className="text-xs text-emerald-600">↑ 0.8pp</div>
              </div>
            </div>
          </div>

          {/* Bar Chart */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-violet-500"></span>
              Bar Chart
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
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
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Grouped Bar
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Stacked Bar */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              Stacked Bar
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoData}>
                <Bar dataKey="spend" stackId="a" fill="#7C3AED" />
                <Bar dataKey="savings" stackId="a" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Scatter Plot */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500"></span>
              Scatter Plot
            </h4>
            <ResponsiveContainer width="100%" height={120}>
              <ScatterChart>
                <Scatter data={demoData.map(d => ({ x: d.spend, y: d.savings }))} fill="#F43F5E" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-500"></span>
              Data Table
            </h4>
            <div className="text-xs">
              <div className="grid grid-cols-3 gap-1 font-medium text-slate-600 mb-1 pb-1 border-b border-slate-200">
                <span>Media</span>
                <span className="text-right">Spend</span>
                <span className="text-right">Savings</span>
              </div>
              {demoData.slice(0, 3).map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-1 text-slate-800 py-0.5">
                  <span>{row.name}</span>
                  <span className="text-right">€{(row.spend / 1000).toFixed(1)}K</span>
                  <span className="text-right text-emerald-600">€{row.savings}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Gauge */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              Gauge Chart
            </h4>
            <div className="flex items-center justify-center h-[120px]">
              <div className="relative">
                <svg width="100" height="60" viewBox="0 0 100 60">
                  <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#E5E7EB" strokeWidth="8" strokeLinecap="round" />
                  <path d="M 10 55 A 40 40 0 0 1 70 20" fill="none" stroke="#10B981" strokeWidth="8" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-end justify-center pb-1">
                  <span className="text-lg font-bold text-slate-800">85%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Heatmap placeholder */}
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              Heatmap
            </h4>
            <div className="grid grid-cols-5 gap-1 h-[120px]">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded"
                  style={{
                    backgroundColor: `rgba(124, 58, 237, ${0.2 + Math.random() * 0.8})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="text-center mt-8 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl border border-violet-100">
          <p className="text-sm text-violet-800">
            👈 <strong>Step 1:</strong> Select data fields from the Query Builder on the left
            <br />
            👉 <strong>Step 2:</strong> Choose a chart type from the Graph Options on the right
          </p>
        </div>
      </div>
    );
  };

  const renderVisualization = () => {
    // Show loading state when fetching API data
    if (isLoadingApiData && dataSource === 'summary' && client === 'Arla') {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <Loader2 className="w-12 h-12 text-violet-600 animate-spin" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Loading data...</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Fetching consolidated summary data from the server
          </p>
        </div>
      );
    }

    // Show error state if API call failed
    if (apiError && dataSource === 'summary' && client === 'Arla' && getTotalSelected() > 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-red-100 to-orange-100 mb-4">
            <BarChart3 className="w-12 h-12 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Failed to load data</h3>
          <p className="text-sm text-slate-500 max-w-md mb-4">
            {apiError}
          </p>
          <p className="text-xs text-slate-400">
            Make sure a consolidation job is selected and try again
          </p>
        </div>
      );
    }

    // Show "no data" state for Arla summary when fields are selected but no data returned
    if (client === 'Arla' && dataSource === 'summary' && getTotalSelected() > 0 && !hasData && !isLoadingApiData) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-100 to-yellow-100 mb-4">
            <BarChart3 className="w-12 h-12 text-amber-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">No data available</h3>
          <p className="text-sm text-slate-500 max-w-md mb-4">
            The selected fields returned no data for this consolidation job.
          </p>
          <p className="text-xs text-slate-400">
            Try selecting different fields or ensure the consolidation job has been populated.
          </p>
        </div>
      );
    }

    // Show welcome/empty state if no client or data source selected
    if (!client || !dataSource) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-5">
            <BarChart3 className="w-14 h-14 text-slate-400" />
          </div>
          <h3 className="text-2xl font-semibold text-slate-800 mb-3">Welcome to Dashboard</h3>
          <p className="text-sm text-slate-500 max-w-md mb-6">
            Get started by selecting a client and data source from the top bar to visualize your media spend data.
          </p>
          <div className="flex flex-col gap-3 text-left bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-semibold text-sm">1</div>
              <span className="text-sm text-slate-700">Select a <strong>Client</strong> from the dropdown</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-semibold text-sm">2</div>
              <span className="text-sm text-slate-700">Choose a <strong>Data Source</strong> (Summary or Trackers)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-semibold text-sm">3</div>
              <span className="text-sm text-slate-700">Select <strong>Fields</strong> from the Query Builder</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-semibold text-sm">4</div>
              <span className="text-sm text-slate-700">Choose a <strong>Graph Type</strong> to visualize</span>
            </div>
          </div>
        </div>
      );
    }

    // Show message if no graph type selected and no fields selected
    if (!selectedGraphType && getTotalSelected() === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <Sparkles className="w-12 h-12 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Select Fields to Begin</h3>
          <p className="text-sm text-slate-500 max-w-md">
            Use the <strong>Query Builder</strong> on the left to select the data fields you want to visualize,
            then choose a graph type from the <strong>Graph Options</strong> panel on the right.
          </p>
        </div>
      );
    }

    // Show message if fields are selected but no graph type chosen
    if (!selectedGraphType && getTotalSelected() > 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-8">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <BarChart3 className="w-12 h-12 text-violet-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-2">Select a graph type</h3>
          <p className="text-sm text-slate-500 max-w-md">
            You have selected {getTotalSelected()} field(s). Choose a visualization from the Graph Options panel on the right.
          </p>
        </div>
      );
    }

    const graphTitle = `${client || 'Client'} - ${market || 'All Markets'} - ${period || 'YTD'}`;

    // Calculate KPI values from real data with proper fallbacks
    const calculateKPIs = () => {
      if (!sampleData || sampleData.length === 0) {
        return { totalSpend: 0, totalSavings: 0, savingsPct: 0, inflationPct: 0, avgIndex: 100 };
      }

      // Helper to get value with multiple fallback keys
      const getValue = (item: any, ...keys: string[]) => {
        for (const key of keys) {
          if (item[key] !== undefined && item[key] !== null && !isNaN(item[key])) {
            return Number(item[key]);
          }
        }
        return 0;
      };

      const totalSpend = sampleData.reduce((sum, item) =>
        sum + getValue(item, dataKeys.spend, 'total_net_net_spend', 'spend'), 0);
      const totalSavings = sampleData.reduce((sum, item) =>
        sum + getValue(item, dataKeys.savings, 'savings_value', 'savings'), 0);
      const avgSavingsPct = sampleData.reduce((sum, item) =>
        sum + getValue(item, dataKeys.savingsPct, 'savings_pct', 'savingsPct'), 0) / sampleData.length;
      const avgInflationPct = sampleData.reduce((sum, item) =>
        sum + getValue(item, dataKeys.inflationPct, 'inflation_pct', 'inflation'), 0) / sampleData.length;
      const avgIndex = sampleData.reduce((sum, item) =>
        sum + getValue(item, 'index', dataKeys.index), 0) / sampleData.length || 100;

      return {
        totalSpend,
        totalSavings,
        savingsPct: isNaN(avgSavingsPct) ? 0 : avgSavingsPct,
        inflationPct: isNaN(avgInflationPct) ? 0 : avgInflationPct,
        avgIndex: isNaN(avgIndex) ? 100 : avgIndex,
      };
    };

    const kpis = calculateKPIs();

    // PPT Button component to avoid duplication
    const PPTButton = () => (
      <button
        onClick={handleToggleForPPT}
        disabled={!isChartReady && !isIncludedInReport}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isIncludedInReport
          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm'
          : !isChartReady
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        title={isIncludedInReport ? 'Remove from PPT' : !isChartReady ? 'Chart loading...' : 'Add to PPT Report'}
      >
        {isIncludedInReport ? <Check className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
        {isIncludedInReport ? 'In PPT' : 'Add to PPT'}
      </button>
    );

    switch (selectedGraphType) {
      case 'kpi-card':
        return (
          <div ref={chartContainerRef} className="relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-0 right-0 flex items-center gap-2 z-10">
              <PPTButton />
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{graphTitle}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm min-w-0 overflow-hidden">
                  <div className="text-xs sm:text-sm text-slate-500 mb-1.5 truncate">Total Spend</div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-1 truncate">
                    €{kpis.totalSpend >= 1000000
                      ? `${(kpis.totalSpend / 1000000).toFixed(1)}M`
                      : kpis.totalSpend >= 1000
                        ? `${(kpis.totalSpend / 1000).toFixed(0)}K`
                        : kpis.totalSpend.toFixed(0)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap">
                    <span className="text-emerald-600">↑ 12.3%</span>
                    <span className="text-slate-500">vs last period</span>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm min-w-0 overflow-hidden">
                  <div className="text-xs sm:text-sm text-slate-500 mb-1.5 truncate">Avg Savings %</div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-1 truncate">
                    {kpis.savingsPct.toFixed(1)}%
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap">
                    <span className="text-emerald-600">↑ 0.8pp</span>
                    <span className="text-slate-500">vs last period</span>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-4 sm:p-5 shadow-sm min-w-0 overflow-hidden sm:col-span-2 lg:col-span-1">
                  <div className="text-xs sm:text-sm text-slate-500 mb-1.5 truncate">Avg Inflation %</div>
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-1 truncate">
                    {kpis.inflationPct.toFixed(1)}%
                  </div>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap">
                    <span className="text-amber-600">↓ 1.2pp</span>
                    <span className="text-slate-500">after mitigation</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'pie-chart':
        return (
          <div ref={chartContainerRef} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Chart content for PPT capture - includes title and chart only */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{graphTitle}</h3>
              <p className="text-sm text-slate-500 mb-4">Click on any slice to filter and see details below</p>
              <ResponsiveContainer width="100%" height={450}>
                <PieChart>
                  <Pie
                    data={sampleData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: €${(Number(value) / 1000).toFixed(0)}K`}
                    outerRadius={140}
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
          </div>
        );

      case 'bar-chart':
        const hasIndexData = sampleData.some(item => item.index !== undefined);
        return (
          <div ref={chartContainerRef} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button
                onClick={() => setIsModalOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{graphTitle}</h3>
              <p className="text-sm text-slate-500 mb-4">Click on any bar to filter and see details below</p>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={sampleData} onClick={(e: any) => e && e.activePayload && handleChartClick(e.activePayload[0].payload)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
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
                    fill="#7C3AED"
                    radius={[8, 8, 0, 0]}
                    name="Spend (€)"
                    style={{ cursor: 'pointer' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'grouped-bar':
        return (
          <div ref={chartContainerRef} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button onClick={() => setIsModalOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{graphTitle}</h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey={dataKeys.spend} fill="#7C3AED" radius={[8, 8, 0, 0]} name="Total Spend" />
                  <Bar dataKey={dataKeys.savings} fill="#10B981" radius={[8, 8, 0, 0]} name="Savings Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'stacked-bar':
        return (
          <div ref={chartContainerRef} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button onClick={() => setIsModalOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{graphTitle}</h3>
              <ResponsiveContainer width="100%" height={450}>
                <BarChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey={dataKeys.spend} stackId="a" fill="#7C3AED" radius={[0, 0, 0, 0]} name="Total Spend" />
                  <Bar dataKey={dataKeys.savings} stackId="a" fill="#10B981" radius={[8, 8, 0, 0]} name="Savings Value" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'line-chart':
        return (
          <div ref={chartContainerRef} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button onClick={() => setIsModalOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{graphTitle}</h3>
              <ResponsiveContainer width="100%" height={450}>
                <LineChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey={dataKeys.spend} stroke="#7C3AED" strokeWidth={2} name="Total Spend" />
                  <Line type="monotone" dataKey={dataKeys.savings} stroke="#10B981" strokeWidth={2} name="Savings Value" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'area-chart':
        return (
          <div ref={chartContainerRef} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button onClick={() => setIsModalOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">{graphTitle}</h3>
              <ResponsiveContainer width="100%" height={450}>
                <AreaChart data={sampleData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => `€${value.toLocaleString()}`} />
                  <Legend />
                  <Area type="monotone" dataKey={dataKeys.spend} stackId="1" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.6} name="Total Spend" />
                  <Area type="monotone" dataKey={dataKeys.savings} stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} name="Savings Value" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'scatter':
        return (
          <div ref={chartContainerRef} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-6 shadow-sm relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
              <button onClick={() => setIsModalOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                <Maximize2 className="w-4 h-4 text-slate-500" />
              </button>
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">CPU vs Benchmark</h3>
              <ResponsiveContainer width="100%" height={450}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" dataKey="cpu" name="CPU" tick={{ fontSize: 12 }} />
                  <YAxis type="number" dataKey="benchmark" name="Benchmark" tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Media" data={sampleData} fill="#7C3AED" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      case 'gauge':
        // Calculate gauge values from actual data
        const avgIndex = sampleData.length > 0
          ? sampleData.reduce((sum, item) => sum + (item.index || item[dataKeys.index] || 100), 0) / sampleData.length
          : 100;
        const avgSavings = sampleData.length > 0
          ? sampleData.reduce((sum, item) => sum + (item[dataKeys.savingsPct] || item.savings_pct || 0), 0) / sampleData.length
          : 0;
        const avgMeasured = sampleData.length > 0
          ? sampleData.reduce((sum, item) => sum + (item[dataKeys.measuredPct] || item.measured_spend_pct || 85), 0) / sampleData.length
          : 85;

        return (
          <div ref={chartContainerRef} className="relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-0 right-0 flex items-center gap-2 z-10">
              <PPTButton />
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white rounded-xl p-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-800 mb-4">{graphTitle} - Performance Metrics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <GaugeChart
                  value={isNaN(avgIndex) ? 100 : avgIndex}
                  label="Average Index"
                  min={80}
                  max={120}
                  thresholds={{ red: 95, yellow: 100, green: 105 }}
                />
                <GaugeChart
                  value={isNaN(avgSavings) ? 0 : avgSavings}
                  label="Average Savings %"
                  min={0}
                  max={15}
                  thresholds={{ red: 5, yellow: 8, green: 10 }}
                />
                <div className="sm:col-span-2 lg:col-span-1">
                  <GaugeChart
                    value={isNaN(avgMeasured) ? 85 : avgMeasured}
                    label="Measured Spend %"
                    min={60}
                    max={100}
                    thresholds={{ red: 75, yellow: 85, green: 90 }}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'table':
        return (
          <div ref={chartContainerRef} className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden relative">
            {/* Chart Action Buttons - outside chartOnlyRef for clean PPT capture */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
              <PPTButton />
            </div>
            {/* Chart content for PPT capture */}
            <div ref={chartOnlyRef} className="bg-white">
              <div className="p-6 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">{graphTitle}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Dimension</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">Spend (€K)</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">Savings (€K)</th>
                      <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">Savings %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sampleData.map((row, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-6 py-4 text-slate-800">{row.name}</td>
                        <td className="px-6 py-4 text-right text-slate-800">
                          €{Math.round(row.spend).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-800">
                          €{Math.round(row.savings || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-sm">
                            {(row.savingsPct || 6.5).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full">
            <BarChart3 className="w-16 h-16 text-slate-300" />
          </div>
        );
    }
  };

  return (
    <div className="flex-1 p-8 bg-gradient-to-br from-slate-50 to-slate-100/80 overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        {/* Active Filter Indicator */}
        {activeFilter && (
          <div className="mb-4 flex items-center gap-3">
            <div className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl flex items-center gap-2 shadow-sm">
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
          <div className="mt-6 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-800">Detailed View: {activeFilter}</h3>
              <p className="text-sm text-slate-500 mt-1">
                Click the filter badge above to clear and see all data
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-6 py-4 text-sm font-medium text-slate-600">Metric</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">Value</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-slate-600">vs Avg</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="px-6 py-4 text-slate-800">Spend</td>
                      <td className="px-6 py-4 text-right text-slate-800">
                        €{Math.round(item.spend).toLocaleString()}K
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-emerald-600">+12%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Graph Modal - Expanded View with Include in PPT Button */}
        <GraphModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          graphId={graphId}
          title={graphTitle}
          isIncluded={isIncludedInReport}
          onToggleInclude={() => onToggleGraphForPPT?.(graphId, graphTitle)}
          slideNumber={slideNumber}
          onUpdateSlideNumber={(num) => onUpdateSlideNumber?.(graphId, num)}
        >
          <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 shadow-sm">
            {renderVisualization()}
          </div>
        </GraphModal>
      </div>
    </div>
  );
}
