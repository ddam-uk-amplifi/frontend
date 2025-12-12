import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface GraphForPPT {
  id: string;
  title: string;
  slideNumber?: number;
  imageBase64?: string;
}

interface PPTStoreState {
  // Selected graph IDs
  selectedGraphsForPPT: Set<string>;

  // Graph metadata (title, slide number, image)
  graphsMetadata: Map<string, GraphForPPT>;

  // Actions
  addGraph: (graphId: string, metadata: GraphForPPT) => void;
  removeGraph: (graphId: string) => void;
  updateSlideNumber: (graphId: string, slideNumber: number | undefined) => void;
  clearAll: () => void;

  // Getters
  getGraph: (graphId: string) => GraphForPPT | undefined;
  getAllGraphs: () => GraphForPPT[];
  isGraphSelected: (graphId: string) => boolean;
}

export const usePPTStore = create<PPTStoreState>()(
  persist(
    (set, get) => ({
      selectedGraphsForPPT: new Set(),
      graphsMetadata: new Map(),

      addGraph: (graphId, metadata) => {
        set((state) => {
          const newSelectedGraphs = new Set(state.selectedGraphsForPPT);
          newSelectedGraphs.add(graphId);

          const newMetadata = new Map(state.graphsMetadata);
          newMetadata.set(graphId, metadata);

          return {
            selectedGraphsForPPT: newSelectedGraphs,
            graphsMetadata: newMetadata,
          };
        });
      },

      removeGraph: (graphId) => {
        set((state) => {
          const newSelectedGraphs = new Set(state.selectedGraphsForPPT);
          newSelectedGraphs.delete(graphId);

          const newMetadata = new Map(state.graphsMetadata);
          newMetadata.delete(graphId);

          return {
            selectedGraphsForPPT: newSelectedGraphs,
            graphsMetadata: newMetadata,
          };
        });
      },

      updateSlideNumber: (graphId, slideNumber) => {
        set((state) => {
          const newMetadata = new Map(state.graphsMetadata);
          const existing = newMetadata.get(graphId);

          if (existing) {
            newMetadata.set(graphId, { ...existing, slideNumber });
          }

          return { graphsMetadata: newMetadata };
        });
      },

      clearAll: () => {
        set({
          selectedGraphsForPPT: new Set(),
          graphsMetadata: new Map(),
        });
      },

      getGraph: (graphId) => {
        return get().graphsMetadata.get(graphId);
      },

      getAllGraphs: () => {
        return Array.from(get().graphsMetadata.values());
      },

      isGraphSelected: (graphId) => {
        return get().selectedGraphsForPPT.has(graphId);
      },
    }),
    {
      name: "ppt-graph-storage",
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;

          const { state } = JSON.parse(str);
          return JSON.stringify({
            state: {
              ...state,
              selectedGraphsForPPT: new Set(state.selectedGraphsForPPT || []),
              graphsMetadata: new Map(
                Object.entries(state.graphsMetadata || {})
              ),
            },
          });
        },
        setItem: (name, value) => {
          const parsed = JSON.parse(value);
          const state = parsed.state;
          const serialized = JSON.stringify({
            state: {
              ...state,
              selectedGraphsForPPT: Array.from(state.selectedGraphsForPPT),
              graphsMetadata: Object.fromEntries(state.graphsMetadata),
            },
          });
          localStorage.setItem(name, serialized);
        },
        removeItem: (name) => localStorage.removeItem(name),
      })),
    }
  )
);
