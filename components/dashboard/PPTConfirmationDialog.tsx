"use client";

import {
  X,
  Eye,
  BarChart3,
  GripVertical,
  Sparkles,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { toast } from "sonner";

interface PPTConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGraphs: Array<{ id: string; title: string; slideNumber?: number }>;
  onConfirm: () => void;
  onUpdateSlideNumber?: (
    graphId: string,
    slideNumber: number | undefined,
  ) => void;
  isGenerating?: boolean;
}

interface DraggableGraphCardProps {
  graph: { id: string; title: string; slideNumber?: number };
  slideNumber: number;
}

interface DroppableSlideProps {
  slideNumber: number;
  graphsOnSlide: Array<{ id: string; title: string; slideNumber?: number }>;
  onDrop: (graphId: string, targetSlide: number) => void;
}

const ITEM_TYPE = "GRAPH";

// Draggable Graph Card Component
function DraggableGraphCard({ graph, slideNumber }: DraggableGraphCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { graphId: graph.id, currentSlide: slideNumber },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    if (ref.current) {
      drag(ref.current);
    }
  }, [drag]);

  return (
    <div
      ref={ref}
      className={`text-center cursor-move transition-opacity ${isDragging ? "opacity-40" : "opacity-100"
        }`}
    >
      <div className="flex items-center justify-center mb-2 relative">
        <GripVertical className="w-4 h-4 text-violet-500 absolute -left-2 top-0" />
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100">
          <BarChart3 className="w-6 h-6 text-violet-600" />
        </div>
      </div>
      <div className="text-xs text-slate-700 font-medium line-clamp-2">
        {graph.title}
      </div>
    </div>
  );
}

// Droppable Slide Component
function DroppableSlide({
  slideNumber,
  graphsOnSlide,
  onDrop,
}: DroppableSlideProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop: (item: { graphId: string; currentSlide: number }) => {
      if (item.currentSlide !== slideNumber) {
        onDrop(item.graphId, slideNumber);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  useEffect(() => {
    if (ref.current) {
      drop(ref.current);
    }
  }, [drop]);

  const hasGraphs = graphsOnSlide.length > 0;
  const isActive = isOver && canDrop;

  return (
    <div
      ref={ref}
      className={`
        relative border-2 rounded-xl p-3 aspect-[4/3] flex flex-col items-center justify-center
        transition-all
        ${hasGraphs
          ? "border-violet-400 bg-gradient-to-br from-violet-50 to-purple-50 hover:shadow-lg"
          : "border-slate-200 bg-slate-50"
        }
        ${isActive ? "border-cyan-500 bg-cyan-50 scale-105 shadow-lg" : ""}
        ${canDrop && !isActive ? "border-dashed border-violet-300" : ""}
      `}
    >
      {/* Slide Number Badge */}
      <div
        className={`
        absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm
        ${hasGraphs
            ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white"
            : "bg-slate-300 text-white"
          }
        ${isActive ? "bg-gradient-to-br from-cyan-500 to-blue-600" : ""}
      `}
      >
        {slideNumber}
      </div>

      {/* Drop indicator */}
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 rounded-lg">
          <div className="text-xs font-medium text-cyan-700">Drop here</div>
        </div>
      )}

      {/* Graph Content */}
      {hasGraphs && !isActive ? (
        <DraggableGraphCard
          graph={graphsOnSlide[0]}
          slideNumber={slideNumber}
        />
      ) : !hasGraphs && !isActive ? (
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-dashed border-slate-300 rounded-lg mb-2 mx-auto" />
          <div className="text-[10px] text-slate-400">Empty</div>
        </div>
      ) : null}

      {/* Multiple graphs indicator */}
      {graphsOnSlide.length > 1 && !isActive && (
        <div className="text-[10px] text-violet-600 mt-1 font-medium">
          +{graphsOnSlide.length - 1} more
        </div>
      )}
    </div>
  );
}

// Draggable Unassigned Graph
function DraggableUnassignedGraph({
  graph,
  index,
}: {
  graph: { id: string; title: string; slideNumber?: number };
  index: number;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { graphId: graph.id, currentSlide: null },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  useEffect(() => {
    if (ref.current) {
      drag(ref.current);
    }
  }, [drag]);

  return (
    <li
      ref={ref}
      className={`flex items-center gap-2 text-sm text-amber-800 cursor-move transition-all hover:bg-amber-100 p-2.5 rounded-lg ${isDragging ? "opacity-40" : "opacity-100"
        }`}
    >
      <GripVertical className="w-4 h-4 text-amber-500" />
      <div className="w-6 h-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center text-xs flex-shrink-0 font-medium shadow-sm">
        {index + 1}
      </div>
      <span className="flex-1 font-medium">{graph.title}</span>
    </li>
  );
}

function PPTConfirmationDialogContent({
  isOpen,
  onClose,
  selectedGraphs,
  onConfirm,
  onUpdateSlideNumber,
  isGenerating = false,
}: PPTConfirmationDialogProps) {
  const [viewMode, setViewMode] = useState<"list" | "preview">("preview");

  if (!isOpen) return null;

  // Sort graphs by slide number (undefined at the end)
  const sortedGraphs = [...selectedGraphs].sort((a, b) => {
    if (a.slideNumber === undefined && b.slideNumber === undefined) return 0;
    if (a.slideNumber === undefined) return 1;
    if (b.slideNumber === undefined) return -1;
    return a.slideNumber - b.slideNumber;
  });

  // Group graphs by slide number
  const graphsBySlide = sortedGraphs.reduce(
    (acc, graph) => {
      const slideNum = graph.slideNumber || "unassigned";
      if (!acc[slideNum]) acc[slideNum] = [];
      acc[slideNum].push(graph);
      return acc;
    },
    {} as Record<string | number, typeof sortedGraphs>,
  );

  // Get max slide number to create preview range
  const maxSlide = Math.max(
    ...sortedGraphs.map((g) => g.slideNumber || 0).filter((n) => n > 0),
    10, // At least show 10 slides
  );

  const graphsWithoutSlides = sortedGraphs.filter((g) => !g.slideNumber);
  const graphsWithSlides = sortedGraphs.filter((g) => g.slideNumber);

  const handleDrop = (graphId: string, targetSlide: number) => {
    if (onUpdateSlideNumber) {
      const movedGraph = selectedGraphs.find((g) => g.id === graphId);
      const graphTitle = movedGraph?.title || "Graph";

      onUpdateSlideNumber(graphId, targetSlide);
      toast.success(`Moved "${graphTitle}" to slide ${targetSlide}`, {
        duration: 2000,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col border border-slate-200/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                PowerPoint Report Preview
              </h2>
              <p className="text-sm text-slate-500">
                Review your {selectedGraphs.length} graph
                {selectedGraphs.length !== 1 ? "s" : ""} and slide placements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="px-6 py-3 border-b border-slate-200/60 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("preview")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === "preview"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              Slide Preview
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${viewMode === "list"
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {viewMode === "preview" ? (
            <div className="space-y-6">
              {/* Drag and Drop Instruction */}
              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
                <GripVertical className="w-5 h-5 text-violet-600" />
                <p className="text-sm text-violet-800">
                  <strong>Drag & Drop:</strong> Click and drag graphs to move
                  them between slides
                </p>
              </div>

              {/* Graphs with assigned slides */}
              {graphsWithSlides.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 mb-4">
                    Assigned Slides ({graphsWithSlides.length})
                  </h3>
                  <div className="grid grid-cols-5 gap-3">
                    {Array.from({ length: maxSlide }, (_, i) => i + 1).map(
                      (slideNum) => {
                        const graphsOnSlide = graphsBySlide[slideNum] || [];
                        return (
                          <DroppableSlide
                            key={slideNum}
                            slideNumber={slideNum}
                            graphsOnSlide={graphsOnSlide}
                            onDrop={handleDrop}
                          />
                        );
                      },
                    )}
                  </div>
                </div>
              )}

              {/* Graphs without assigned slides */}
              {graphsWithoutSlides.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-500 rounded-full" />
                    Unassigned Graphs ({graphsWithoutSlides.length})
                  </h3>
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-700 mb-3">
                      Drag these graphs to assign them to specific slides:
                    </p>
                    <ul className="space-y-2">
                      {graphsWithoutSlides.map((graph, index) => (
                        <DraggableUnassignedGraph
                          key={graph.id}
                          graph={graph}
                          index={index}
                        />
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // List View
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <ul className="space-y-3">
                  {sortedGraphs.map((graph, index) => (
                    <li
                      key={graph.id}
                      className="flex items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200/60 shadow-sm"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-xl flex items-center justify-center text-sm flex-shrink-0 font-medium shadow-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="text-slate-800 font-medium">
                            {graph.title}
                          </div>
                        </div>
                      </div>
                      {graph.slideNumber ? (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 rounded-lg text-sm font-medium whitespace-nowrap border border-emerald-200">
                          Slide {graph.slideNumber}
                        </span>
                      ) : (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-lg text-sm font-medium whitespace-nowrap border border-amber-200">
                          Unassigned
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4">
            <p className="text-sm text-sky-800">
              <strong>Tip:</strong> Graphs with assigned slide numbers will be
              placed at those specific positions. Unassigned graphs will be
              added at the end of your presentation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200/60 bg-white/80 backdrop-blur-sm rounded-b-2xl">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-violet-600">
              {graphsWithSlides.length}
            </span>{" "}
            assigned ·
            <span className="font-semibold text-amber-600 ml-1">
              {graphsWithoutSlides.length}
            </span>{" "}
            unassigned
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg shadow-emerald-200 hover:shadow-xl hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              Generate PowerPoint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component wrapped with DndProvider
export function PPTConfirmationDialog(props: PPTConfirmationDialogProps) {
  if (!props.isOpen) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <PPTConfirmationDialogContent {...props} />
    </DndProvider>
  );
}
