'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';
import { TopBar } from '@/components/dashboard/TopBar';
import { QueryBuilderPanel } from '@/components/dashboard/QueryBuilderPanel';
import { GraphRecommendationsPanel } from '@/components/dashboard/GraphRecommendationsPanel';
import { VisualizationCanvas } from '@/components/dashboard/VisualizationCanvas';
import { PPTGenerationBanner } from '@/components/dashboard/PPTGenerationBanner';
import { PPTConfirmationDialog } from '@/components/dashboard/PPTConfirmationDialog';
import {
  fetchLatestJob,
  generateDashboardPPTX,
  captureChartAsBase64,
  type ChartImageForPPT,
} from '@/lib/api/dashboard';
import { tokenUtils } from '@/lib/utils/token';

interface GraphForPPT {
  id: string;
  title: string;
  slideNumber?: number;
  imageBase64?: string;  // Captured when graph is selected
}

// Client ID mapping - used for tracker API calls
const CLIENT_ID_MAP: Record<string, number> = {
  'Arla': 1,
  'Carlsberg': 2,
  'Kering': 3,
};

export default function Dashboard() {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState<'summary' | 'trackers' | ''>('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedYtdMonth, setSelectedYtdMonth] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(true);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [selectedGraphType, setSelectedGraphType] = useState<string | null>(null);
  const [isRecommendationsPanelOpen, setIsRecommendationsPanelOpen] = useState(false);
  
  // PPT Report State
  const [selectedGraphsForPPT, setSelectedGraphsForPPT] = useState<Set<string>>(new Set());
  const [graphsMetadata, setGraphsMetadata] = useState<Map<string, GraphForPPT>>(new Map());
  const [isPPTDialogOpen, setIsPPTDialogOpen] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);

  // Ref to store chart element references for image capture
  const chartElementRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Get client ID from selected client name
  const selectedClientId = selectedClient ? CLIENT_ID_MAP[selectedClient] : undefined;

  // Fetch latest job when client changes (for summary data source)
  useEffect(() => {
    const fetchJob = async () => {
      if (!selectedClient || selectedDataSource !== 'summary') {
        setSelectedJobId('');
        return;
      }

      try {
        const response = await fetchLatestJob(selectedClient);
        setSelectedJobId(response.consolidation_job_id);
      } catch (error) {
        console.error('Failed to fetch latest job:', error);
        // Don't show toast - it's expected if no jobs exist
        setSelectedJobId('');
      }
    };

    fetchJob();
  }, [selectedClient, selectedDataSource]);

  const handleFieldToggle = (groupId: string, fieldId: string) => {
    setSelectedFields((prev) => {
      const groupFields = prev[groupId] || [];
      const isSelected = groupFields.includes(fieldId);

      if (isSelected) {
        return {
          ...prev,
          [groupId]: groupFields.filter((id) => id !== fieldId),
        };
      } else {
        return {
          ...prev,
          [groupId]: [...groupFields, fieldId],
        };
      }
    });
  };

  const handleClearAll = () => {
    setSelectedFields({});
    setSelectedGraphType(null);
  };

  // When data source changes, clear market selection if switching to summary
  const handleDataSourceChange = (source: 'summary' | 'trackers' | '') => {
    setSelectedDataSource(source);
    if (source === 'summary' || source === '') {
      setSelectedMarket(''); // Summary Excel doesn't use market selection
    }
    // Clear fields when switching data source since field sets are different
    setSelectedFields({});
    setSelectedGraphType(null);
  };

  // PPT Functions - capture base64 immediately when user selects a graph
  const handleToggleGraphForPPT = useCallback(async (graphId: string, graphTitle: string, element?: HTMLElement) => {
    // Check if already selected (toggling off)
    if (selectedGraphsForPPT.has(graphId)) {
      setSelectedGraphsForPPT(prev => {
        const newSet = new Set(prev);
        newSet.delete(graphId);
        return newSet;
      });
      setGraphsMetadata(prev => {
        const newMap = new Map(prev);
        newMap.delete(graphId);
        return newMap;
      });
      chartElementRefs.current.delete(graphId);
      toast.info('Graph removed from PPT report');
      return;
    }

    // Adding graph - capture base64 immediately while it's visible
    if (!element) {
      console.error('[handleToggleGraphForPPT] No element provided for graph:', graphId);
      toast.error('Could not capture chart. Please try again.');
      return;
    }

    try {
      console.log('[handleToggleGraphForPPT] Capturing base64 for:', graphId);
      const imageBase64 = await captureChartAsBase64(element);
      console.log('[handleToggleGraphForPPT] Captured! Length:', imageBase64.length);

      setSelectedGraphsForPPT(prev => {
        const newSet = new Set(prev);
        newSet.add(graphId);
        return newSet;
      });

      setGraphsMetadata(prev => {
        const newMap = new Map(prev);
        newMap.set(graphId, {
          id: graphId,
          title: graphTitle,
          imageBase64: imageBase64,  // Store the captured image
        });
        return newMap;
      });

      chartElementRefs.current.set(graphId, element);
      toast.success('Graph added to PPT report');
    } catch (error) {
      console.error('[handleToggleGraphForPPT] Failed to capture chart:', error);
      toast.error('Failed to capture chart image. Please try again.');
    }
  }, [selectedGraphsForPPT]);

  // Register a chart element for later capture
  const registerChartElement = useCallback((graphId: string, element: HTMLElement | null) => {
    if (element) {
      chartElementRefs.current.set(graphId, element);
    } else {
      chartElementRefs.current.delete(graphId);
    }
  }, []);

  const handleUpdateSlideNumber = useCallback((graphId: string, slideNumber: number | undefined) => {
    setGraphsMetadata(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(graphId);
      if (existing) {
        newMap.set(graphId, { ...existing, slideNumber });
      }
      return newMap;
    });
  }, []);

  const getSlideNumber = useCallback((graphId: string) => {
    return graphsMetadata.get(graphId)?.slideNumber;
  }, [graphsMetadata]);

  const handleGenerateReport = () => {
    setIsPPTDialogOpen(true);
  };

  const handleConfirmGenerate = async () => {
    console.log('[handleConfirmGenerate] Called!');
    console.log('[handleConfirmGenerate] selectedGraphsForPPT:', Array.from(selectedGraphsForPPT));
    console.log('[handleConfirmGenerate] selectedClient:', selectedClient);
    console.log('[handleConfirmGenerate] graphsMetadata:', Array.from(graphsMetadata.entries()));
    
    if (selectedGraphsForPPT.size === 0) {
      console.log('[handleConfirmGenerate] No graphs selected, aborting');
      toast.error('No graphs selected for PPT');
      return;
    }

    if (!selectedClient) {
      console.log('[handleConfirmGenerate] No client selected, aborting');
      toast.error('Please select a client first');
      return;
    }

    setIsGeneratingPPT(true);
    const loadingToast = toast.loading('Generating PowerPoint...');

    try {
      // Build chart images from stored base64 (captured when user selected each graph)
      const chartImages: ChartImageForPPT[] = [];
      console.log('[handleConfirmGenerate] Building chart images from stored base64...');

      for (const graphId of selectedGraphsForPPT) {
        console.log(`[handleConfirmGenerate] Processing graphId: ${graphId}`);
        const metadata = graphsMetadata.get(graphId);
        console.log(`[handleConfirmGenerate] - metadata:`, metadata);

        if (!metadata?.imageBase64) {
          console.warn(`[handleConfirmGenerate] No image found for graph ${graphId}, skipping...`);
          continue;
        }

        chartImages.push({
          slide_index: (metadata.slideNumber || chartImages.length + 1) - 1, // Convert to 0-based index
          image_base64: metadata.imageBase64,
          title: metadata.title || graphId,
        });
        console.log(`[handleConfirmGenerate] Added to chartImages. Total: ${chartImages.length}`);
      }

      console.log('[handleConfirmGenerate] Total chartImages:', chartImages.length);
      chartImages.forEach((img, i) => {
        console.log(`[handleConfirmGenerate] Chart ${i}: slide_index=${img.slide_index}, title=${img.title}, imageSize=${img.image_base64?.length || 0}`);
      });

      if (chartImages.length === 0) {
        console.log('[handleConfirmGenerate] No chart images available, aborting');
        toast.dismiss(loadingToast);
        toast.error('No chart images available. Please re-select your charts.');
        setIsGeneratingPPT(false);
        return;
      }

      // Call the API to generate PPTX
      console.log('[handleConfirmGenerate] Calling generateDashboardPPTX...');
      const response = await generateDashboardPPTX({
        client_name: selectedClient.toLowerCase(),
        charts: chartImages,
      });
      console.log('[handleConfirmGenerate] API response received:', response);

      // Dismiss loading toast immediately after response
      toast.dismiss(loadingToast);

      if (response.charts_placed > 0) {
        toast.success(
          `PowerPoint generated successfully! ${response.charts_placed} chart(s) placed.`,
          { duration: 5000 }
        );

        // Download the file with authentication
        if (response.download_url) {
          try {
            // Use fetch with auth token to download the file
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const downloadUrl = response.download_url.startsWith('http')
              ? response.download_url
              : `${apiUrl}${response.download_url}`;
            
            // Get auth token
            const token = tokenUtils.getAccessToken();
            
            const downloadResponse = await fetch(downloadUrl, {
              headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            });
            
            if (downloadResponse.ok) {
              // Create blob and download
              const blob = await downloadResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = response.output_path.split('/').pop() || 'dashboard_export.pptx';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } else {
              console.error('Download failed:', downloadResponse.status);
              toast.error('Failed to download PowerPoint file');
            }
          } catch (downloadError) {
            console.error('Download error:', downloadError);
            toast.error('Failed to download PowerPoint file');
          }
        }
      } else {
        toast.warning('PowerPoint generated but no charts were placed successfully.');
      }

      if (response.charts_failed > 0) {
        toast.warning(`${response.charts_failed} chart(s) failed to be placed.`);
      }

      setIsPPTDialogOpen(false);

      // Clear the selection after successful generation
      setSelectedGraphsForPPT(new Set());
      setGraphsMetadata(new Map());
      chartElementRefs.current.clear();

    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Failed to generate PowerPoint:', error);
      toast.error(
        error instanceof Error
          ? `Failed to generate PowerPoint: ${error.message}`
          : 'Failed to generate PowerPoint. Please try again.'
      );
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const selectedGraphsList = Array.from(selectedGraphsForPPT).map(id => {
    const metadata = graphsMetadata.get(id);
    return {
      id,
      title: metadata?.title || id,
      slideNumber: metadata?.slideNumber,
    };
  });

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100/50">
      {/* PPT Generation Banner */}
      <PPTGenerationBanner
        selectedCount={selectedGraphsForPPT.size}
        onGenerateReport={handleGenerateReport}
      />

      {/* Top Bar */}
      <TopBar
        selectedClient={selectedClient}
        selectedDataSource={selectedDataSource}
        selectedMarket={selectedMarket}
        selectedYtdMonth={selectedYtdMonth}
        onClientChange={setSelectedClient}
        onDataSourceChange={handleDataSourceChange}
        onMarketChange={setSelectedMarket}
        onYtdMonthChange={setSelectedYtdMonth}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Query Builder Toggle Button (when collapsed) */}
        {!isQueryPanelOpen && (
          <div className="bg-white/80 backdrop-blur-sm border-r border-slate-200/60 p-4">
            <button
              onClick={() => setIsQueryPanelOpen(true)}
              className="p-3 hover:bg-slate-100 rounded-xl transition-colors"
              title="Open Query Builder"
            >
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
          </div>
        )}

        {/* Query Builder Panel */}
        <QueryBuilderPanel
          isOpen={isQueryPanelOpen}
          onClose={() => setIsQueryPanelOpen(false)}
          selectedFields={selectedFields}
          onFieldToggle={handleFieldToggle}
          onClearAll={handleClearAll}
          dataSource={selectedDataSource}
          selectedClient={selectedClient}
        />

        {/* Visualization Canvas */}
        <VisualizationCanvas
          selectedFields={selectedFields}
          selectedGraphType={selectedGraphType}
          client={selectedClient}
          market={selectedMarket}
          period={selectedYtdMonth}
          dataSource={selectedDataSource}
          jobId={selectedJobId}
          clientId={selectedClientId}
          selectedGraphsForPPT={selectedGraphsForPPT}
          onToggleGraphForPPT={handleToggleGraphForPPT}
          onUpdateSlideNumber={handleUpdateSlideNumber}
          getSlideNumber={getSlideNumber}
          registerChartElement={registerChartElement}
        />

        {/* Graph Recommendations Panel */}
        <GraphRecommendationsPanel
          selectedFields={selectedFields}
          onSelectGraph={setSelectedGraphType}
          selectedGraphType={selectedGraphType}
          isOpen={isRecommendationsPanelOpen}
          onOpenChange={setIsRecommendationsPanelOpen}
        />
      </div>

      {/* PPT Confirmation Dialog */}
      <PPTConfirmationDialog
        isOpen={isPPTDialogOpen}
        onClose={() => !isGeneratingPPT && setIsPPTDialogOpen(false)}
        selectedGraphs={selectedGraphsList}
        onConfirm={handleConfirmGenerate}
        onUpdateSlideNumber={handleUpdateSlideNumber}
        isGenerating={isGeneratingPPT}
      />
    </div>
  );
}