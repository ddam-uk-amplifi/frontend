'use client';

import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { toast } from 'sonner';
import { TopBar } from '@/components/dashboard/TopBar';
import { QueryBuilderPanel } from '@/components/dashboard/QueryBuilderPanel';
import { GraphRecommendationsPanel } from '@/components/dashboard/GraphRecommendationsPanel';
import { VisualizationCanvas } from '@/components/dashboard/VisualizationCanvas';
import { PPTGenerationBanner } from '@/components/dashboard/PPTGenerationBanner';
import { PPTConfirmationDialog } from '@/components/dashboard/PPTConfirmationDialog';

interface GraphForPPT {
  id: string;
  title: string;
  slideNumber?: number;
}

export default function Dashboard() {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState<'summary' | 'trackers' | ''>('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedYtdMonth, setSelectedYtdMonth] = useState('');
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(true);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [selectedGraphType, setSelectedGraphType] = useState<string | null>(null);
  const [isRecommendationsPanelOpen, setIsRecommendationsPanelOpen] = useState(false);
  
  // PPT Report State
  const [selectedGraphsForPPT, setSelectedGraphsForPPT] = useState<Set<string>>(new Set());
  const [graphsMetadata, setGraphsMetadata] = useState<Map<string, GraphForPPT>>(new Map());
  const [isPPTDialogOpen, setIsPPTDialogOpen] = useState(false);

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

  // PPT Functions
  const handleToggleGraphForPPT = useCallback((graphId: string, graphTitle: string) => {
    setSelectedGraphsForPPT(prev => {
      const newSet = new Set(prev);
      if (newSet.has(graphId)) {
        newSet.delete(graphId);
        toast.info('Graph removed from PPT report');
      } else {
        newSet.add(graphId);
        toast.success('Graph added to PPT report');
      }
      return newSet;
    });

    setGraphsMetadata(prev => {
      const newMap = new Map(prev);
      if (!newMap.has(graphId)) {
        newMap.set(graphId, { id: graphId, title: graphTitle });
      }
      return newMap;
    });
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

  const handleConfirmGenerate = () => {
    toast.success('PowerPoint report generation started!');
    setIsPPTDialogOpen(false);
    // TODO: Implement actual PPT generation logic
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
          selectedGraphsForPPT={selectedGraphsForPPT}
          onToggleGraphForPPT={handleToggleGraphForPPT}
          onUpdateSlideNumber={handleUpdateSlideNumber}
          getSlideNumber={getSlideNumber}
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
        onClose={() => setIsPPTDialogOpen(false)}
        selectedGraphs={selectedGraphsList}
        onConfirm={handleConfirmGenerate}
        onUpdateSlideNumber={handleUpdateSlideNumber}
      />
    </div>
  );
}