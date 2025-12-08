'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { TopBar } from '@/components/dashboard/TopBar';
import { QueryBuilderPanel } from '@/components/dashboard/QueryBuilderPanel';
import { GraphRecommendationsPanel } from '@/components/dashboard/GraphRecommendationsPanel';
import { VisualizationCanvas } from '@/components/dashboard/VisualizationCanvas';

export default function Dashboard() {
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedDataSource, setSelectedDataSource] = useState<'summary' | 'trackers' | ''>('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [selectedYtdMonth, setSelectedYtdMonth] = useState('');
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(true);
  const [selectedFields, setSelectedFields] = useState<Record<string, string[]>>({});
  const [selectedGraphType, setSelectedGraphType] = useState<string | null>(null);

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

  return (
    <div className="h-screen flex flex-col bg-white">
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
          <div className="bg-white border-r border-gray-200 p-4">
            <button
              onClick={() => setIsQueryPanelOpen(true)}
              className="p-3 hover:bg-gray-100 rounded-lg transition-colors"
              title="Open Query Builder"
            >
              <Menu className="w-6 h-6 text-gray-600" />
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
        />

        {/* Graph Recommendations Panel */}
        <GraphRecommendationsPanel
          selectedFields={selectedFields}
          onSelectGraph={setSelectedGraphType}
          selectedGraphType={selectedGraphType}
        />
      </div>
    </div>
  );
}