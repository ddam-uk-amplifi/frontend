"use client";

import { useState, useCallback } from "react";
import { Database } from "lucide-react";
import { DataTableView } from "./DataTableView";
import { ChartGridView } from "./ChartGridView";

interface TableRow {
  id: string;
  mediaType: string;
  type: "Actual" | "Planned";
  level: number;
  isExpanded?: boolean;
  hasChildren?: boolean;
  data: Record<string, any>;
}

interface TableDashboardViewProps {
  selectedClient: string;
  selectedGraphsForPPT?: Set<string>;
  onToggleGraphForPPT?: (
    graphId: string,
    graphTitle: string,
    element?: HTMLElement
  ) => void;
  onUpdateSlideNumber?: (graphId: string, slideNumber: number | undefined) => void;
  getSlideNumber?: (graphId: string) => number | undefined;
}

export function TableDashboardView({
  selectedClient,
  selectedGraphsForPPT = new Set(),
  onToggleGraphForPPT,
  onUpdateSlideNumber,
  getSlideNumber,
}: TableDashboardViewProps) {
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [selectedRows, setSelectedRows] = useState<TableRow[]>([]);

  const handleDataChange = useCallback((columns: string[], rows: TableRow[]) => {
    setSelectedColumns(columns);
    setSelectedRows(rows);
  }, []);

  // Show empty state when no client is selected
  if (!selectedClient) {
    return (
      <div className="h-full overflow-y-auto overflow-x-hidden bg-slate-50 max-w-full">
        {/* Empty State Message */}
        <div className="bg-white border-b border-slate-200 py-12">
          <div className="text-center max-w-md mx-auto px-6">
            <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database className="w-8 h-8 text-violet-600" />
            </div>
            <h3 className="text-slate-900 mb-2">No Client Selected</h3>
            <p className="text-slate-600 text-sm">
              Select a client from the dropdown above to view the data overview
              table and interactive charts.
            </p>
          </div>
        </div>

        {/* Show Chart Placeholders with Empty State */}
        <div className="overflow-hidden max-w-full">
          <ChartGridView
            columns={[]}
            rows={[]}
            selectedGraphsForPPT={selectedGraphsForPPT}
            onToggleGraphForPPT={onToggleGraphForPPT}
            onUpdateSlideNumber={onUpdateSlideNumber}
            getSlideNumber={getSlideNumber}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-slate-50 isolate max-w-full">
      {/* Data Table */}
      <div className="overflow-hidden max-w-full">
        <DataTableView selectedClient={selectedClient} onDataChange={handleDataChange} />
      </div>

      {/* Visualization Section - Always Visible Below Table */}
      <div className="overflow-hidden max-w-full">
        <ChartGridView
          columns={selectedColumns}
          rows={selectedRows}
          selectedGraphsForPPT={selectedGraphsForPPT}
          onToggleGraphForPPT={onToggleGraphForPPT}
          onUpdateSlideNumber={onUpdateSlideNumber}
          getSlideNumber={getSlideNumber}
        />
      </div>
    </div>
  );
}
