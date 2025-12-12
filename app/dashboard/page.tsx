"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { TopBar } from "@/components/dashboard/TopBar";
import { QueryBuilderPanel } from "@/components/dashboard/QueryBuilderPanel";
import { GraphRecommendationsPanel } from "@/components/dashboard/GraphRecommendationsPanel";
import { VisualizationCanvas } from "@/components/dashboard/VisualizationCanvas";
import { PPTGenerationBanner } from "@/components/dashboard/PPTGenerationBanner";
import { PPTConfirmationDialog } from "@/components/dashboard/PPTConfirmationDialog";
import {
  fetchLatestJob,
  generateDashboardPPTX,
  captureChartAsBase64,
  type ChartImageForPPT,
} from "@/lib/api/dashboard";
import { tokenUtils } from "@/lib/utils/token";
import { usePPTStore } from "@/lib/stores/usePPTStore";

interface GraphTitleDialogState {
  isOpen: boolean;
  graphId: string;
  defaultTitle: string;
  element?: HTMLElement;
}

// Client ID mapping - used for tracker API calls
const CLIENT_ID_MAP: Record<string, number> = {
  Arla: 1,
  Carlsberg: 2,
  Kering: 3,
};

export default function Dashboard() {
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedDataSource, setSelectedDataSource] = useState<
    "summary" | "trackers" | ""
  >("");
  const [selectedMarket, setSelectedMarket] = useState("");
  const [selectedYtdMonth, setSelectedYtdMonth] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [isQueryPanelOpen, setIsQueryPanelOpen] = useState(true);
  const [selectedFields, setSelectedFields] = useState<
    Record<string, string[]>
  >({});
  const [selectedGraphType, setSelectedGraphType] = useState<string | null>(
    null,
  );
  const [isRecommendationsPanelOpen, setIsRecommendationsPanelOpen] =
    useState(false);

  // PPT Report State - Using Zustand for persistence
  const {
    selectedGraphsForPPT,
    addGraph,
    removeGraph,
    updateSlideNumber: updateSlideNumberInStore,
    getGraph,
    getAllGraphs,
    isGraphSelected,
  } = usePPTStore();

  const [isPPTDialogOpen, setIsPPTDialogOpen] = useState(false);
  const [isGeneratingPPT, setIsGeneratingPPT] = useState(false);
  const [graphTitleDialog, setGraphTitleDialog] = useState<GraphTitleDialogState>({
    isOpen: false,
    graphId: "",
    defaultTitle: "",
  });
  const [isAddingGraph, setIsAddingGraph] = useState(false);

  // Ref to store chart element references for image capture
  const chartElementRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Get client ID from selected client name
  const selectedClientId = selectedClient
    ? CLIENT_ID_MAP[selectedClient]
    : undefined;

  // Fetch latest job when client changes (for summary data source)
  useEffect(() => {
    const fetchJob = async () => {
      if (!selectedClient || selectedDataSource !== "summary") {
        setSelectedJobId("");
        return;
      }

      try {
        const response = await fetchLatestJob(selectedClient);
        setSelectedJobId(response.consolidation_job_id);
      } catch (error) {
        console.error("Failed to fetch latest job:", error);
        // Don't show toast - it's expected if no jobs exist
        setSelectedJobId("");
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
  const handleDataSourceChange = (source: "summary" | "trackers" | "") => {
    setSelectedDataSource(source);
    if (source === "summary" || source === "") {
      setSelectedMarket(""); // Summary Excel doesn't use market selection
    }
    // Clear fields when switching data source since field sets are different
    setSelectedFields({});
    setSelectedGraphType(null);
  };

  // PPT Functions - capture base64 immediately when user selects a graph
  const handleToggleGraphForPPT = useCallback(
    async (graphId: string, graphTitle: string, element?: HTMLElement) => {
      // Check if already selected (toggling off)
      if (isGraphSelected(graphId)) {
        removeGraph(graphId);
        chartElementRefs.current.delete(graphId);
        toast.info("Graph removed from PPT report");
        return;
      }

      // Adding graph - show title input dialog first
      if (!element) {
        console.error(
          "[handleToggleGraphForPPT] No element provided for graph:",
          graphId,
        );
        toast.error("Could not capture chart. Please try again.");
        return;
      }

      // Open dialog to ask for custom title
      setGraphTitleDialog({
        isOpen: true,
        graphId,
        defaultTitle: graphTitle,
        element,
      });
    },
    [isGraphSelected, removeGraph],
  );

  // Actually add the graph to PPT after user confirms title and slide number
  const handleConfirmGraphTitle = useCallback(
    async (customTitle: string, slideNumber?: number) => {
      const { graphId, element } = graphTitleDialog;

      if (!element) {
        toast.error("Could not capture chart. Please try again.");
        setGraphTitleDialog({ isOpen: false, graphId: "", defaultTitle: "" });
        return;
      }

      setIsAddingGraph(true);

      try {
        console.log("[handleConfirmGraphTitle] Capturing base64 for:", graphId);
        const imageBase64 = await captureChartAsBase64(element);
        console.log(
          "[handleConfirmGraphTitle] Captured! Length:",
          imageBase64.length,
        );

        // Add to Zustand store
        addGraph(graphId, {
          id: graphId,
          title: customTitle,
          slideNumber: slideNumber,
          imageBase64: imageBase64,
        });

        chartElementRefs.current.set(graphId, element);
        toast.success(
          slideNumber
            ? `Graph added to PPT report (Slide ${slideNumber})`
            : "Graph added to PPT report"
        );
        setGraphTitleDialog({ isOpen: false, graphId: "", defaultTitle: "" });
      } catch (error) {
        console.error(
          "[handleConfirmGraphTitle] Failed to capture chart:",
          error,
        );
        toast.error("Failed to capture chart image. Please try again.");
        setGraphTitleDialog({ isOpen: false, graphId: "", defaultTitle: "" });
      } finally {
        setIsAddingGraph(false);
      }
    },
    [graphTitleDialog, addGraph],
  );

  // Register a chart element for later capture
  const registerChartElement = useCallback(
    (graphId: string, element: HTMLElement | null) => {
      if (element) {
        chartElementRefs.current.set(graphId, element);
      } else {
        chartElementRefs.current.delete(graphId);
      }
    },
    [],
  );

  const handleUpdateSlideNumber = useCallback(
    (graphId: string, slideNumber: number | undefined) => {
      updateSlideNumberInStore(graphId, slideNumber);
    },
    [updateSlideNumberInStore],
  );

  const getSlideNumber = useCallback(
    (graphId: string) => {
      return getGraph(graphId)?.slideNumber;
    },
    [getGraph],
  );

  const handleGenerateReport = () => {
    setIsPPTDialogOpen(true);
  };

  const handleConfirmGenerate = async () => {
    console.log("[handleConfirmGenerate] Called!");
    console.log(
      "[handleConfirmGenerate] selectedGraphsForPPT:",
      Array.from(selectedGraphsForPPT),
    );
    console.log("[handleConfirmGenerate] selectedClient:", selectedClient);

    if (selectedGraphsForPPT.size === 0) {
      console.log("[handleConfirmGenerate] No graphs selected, aborting");
      toast.error("No graphs selected for PPT");
      return;
    }

    if (!selectedClient) {
      console.log("[handleConfirmGenerate] No client selected, aborting");
      toast.error("Please select a client first");
      return;
    }

    setIsGeneratingPPT(true);
    const loadingToast = toast.loading("Generating PowerPoint...");

    try {
      // Build chart images from stored base64 (captured when user selected each graph)
      const chartImages: ChartImageForPPT[] = [];
      console.log(
        "[handleConfirmGenerate] Building chart images from stored base64...",
      );

      for (const graphId of selectedGraphsForPPT) {
        console.log(`[handleConfirmGenerate] Processing graphId: ${graphId}`);
        const metadata = getGraph(graphId);
        console.log(`[handleConfirmGenerate] - metadata:`, metadata);

        if (!metadata?.imageBase64) {
          console.warn(
            `[handleConfirmGenerate] No image found for graph ${graphId}, skipping...`,
          );
          continue;
        }

        chartImages.push({
          slide_index: (metadata.slideNumber || chartImages.length + 1) - 1, // Convert to 0-based index
          image_base64: metadata.imageBase64,
          title: metadata.title || graphId,
        });
        console.log(
          `[handleConfirmGenerate] Added to chartImages. Total: ${chartImages.length}`,
        );
      }

      console.log(
        "[handleConfirmGenerate] Total chartImages:",
        chartImages.length,
      );
      chartImages.forEach((img, i) => {
        console.log(
          `[handleConfirmGenerate] Chart ${i}: slide_index=${img.slide_index}, title=${img.title}, imageSize=${img.image_base64?.length || 0}`,
        );
      });

      if (chartImages.length === 0) {
        console.log(
          "[handleConfirmGenerate] No chart images available, aborting",
        );
        toast.dismiss(loadingToast);
        toast.error("No chart images available. Please re-select your charts.");
        setIsGeneratingPPT(false);
        return;
      }

      // Call the API to generate PPTX
      console.log("[handleConfirmGenerate] Calling generateDashboardPPTX...");
      const response = await generateDashboardPPTX({
        client_name: selectedClient.toLowerCase(),
        charts: chartImages,
      });
      console.log("[handleConfirmGenerate] API response received:", response);

      // Dismiss loading toast immediately after response
      toast.dismiss(loadingToast);

      if (response.charts_placed > 0) {
        toast.success(
          `PowerPoint generated successfully! ${response.charts_placed} chart(s) placed.`,
          { duration: 5000 },
        );

        // Download the file with authentication
        if (response.download_url) {
          try {
            // Use fetch with auth token to download the file
            const apiUrl =
              process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const downloadUrl = response.download_url.startsWith("http")
              ? response.download_url
              : `${apiUrl}${response.download_url}`;

            // Get auth token
            const token = tokenUtils.getAccessToken();

            const downloadResponse = await fetch(downloadUrl, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });

            if (downloadResponse.ok) {
              // Create blob and download
              const blob = await downloadResponse.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download =
                response.output_path.split("/").pop() ||
                "dashboard_export.pptx";
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
            } else {
              console.error("Download failed:", downloadResponse.status);
              toast.error("Failed to download PowerPoint file");
            }
          } catch (downloadError) {
            console.error("Download error:", downloadError);
            toast.error("Failed to download PowerPoint file");
          }
        }
      } else {
        toast.warning(
          "PowerPoint generated but no charts were placed successfully.",
        );
      }

      if (response.charts_failed > 0) {
        toast.warning(
          `${response.charts_failed} chart(s) failed to be placed.`,
        );
      }

      setIsPPTDialogOpen(false);

      // Clear the selection after successful generation
      usePPTStore.getState().clearAll();
      chartElementRefs.current.clear();
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Failed to generate PowerPoint:", error);
      toast.error(
        error instanceof Error
          ? `Failed to generate PowerPoint: ${error.message}`
          : "Failed to generate PowerPoint. Please try again.",
      );
    } finally {
      setIsGeneratingPPT(false);
    }
  };

  const selectedGraphsList = getAllGraphs().map((metadata) => ({
    id: metadata.id,
    title: metadata.title,
    slideNumber: metadata.slideNumber,
  }));

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

      {/* Graph Title Input Dialog */}
      {graphTitleDialog.isOpen && (
        <GraphTitleInputDialog
          isOpen={graphTitleDialog.isOpen}
          defaultTitle={graphTitleDialog.defaultTitle}
          onConfirm={handleConfirmGraphTitle}
          onCancel={() => !isAddingGraph && setGraphTitleDialog({ isOpen: false, graphId: "", defaultTitle: "" })}
          isLoading={isAddingGraph}
        />
      )}
    </div>
  );
}

// Graph Title Input Dialog Component
function GraphTitleInputDialog({
  isOpen,
  defaultTitle,
  onConfirm,
  onCancel,
  isLoading = false,
}: {
  isOpen: boolean;
  defaultTitle: string;
  onConfirm: (title: string, slideNumber?: number) => void;
  onCancel: () => void;
  isLoading?: boolean;
}) {
  const [title, setTitle] = useState(defaultTitle);
  const [slideNumber, setSlideNumber] = useState<string>("");

  // Reset fields when dialog opens with new default
  useEffect(() => {
    if (isOpen) {
      setTitle(defaultTitle);
      setSlideNumber("");
    }
  }, [isOpen, defaultTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim() && !isLoading) {
      const slideNum = slideNumber ? parseInt(slideNumber, 10) : undefined;
      onConfirm(title.trim(), slideNum);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isLoading && onCancel()}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Add Graph to PowerPoint
        </h3>
        <p className="text-sm text-slate-500 mb-4">
          Customize the graph title and optionally assign it to a specific slide
        </p>

        <form onSubmit={handleSubmit}>
          {/* Title Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Graph Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Q4 Media Spend by Channel"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
              autoFocus
              disabled={isLoading}
            />
          </div>

          {/* Slide Number Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Slide Number <span className="text-slate-400">(Optional)</span>
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={slideNumber}
              onChange={(e) => setSlideNumber(e.target.value)}
              placeholder="e.g., 3"
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-slate-800 placeholder:text-slate-400"
              disabled={isLoading}
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Leave empty to add at the end of the presentation
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isLoading}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg hover:from-violet-700 hover:to-purple-700 transition-all font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Adding...
                </>
              ) : (
                "Add to PPT"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
