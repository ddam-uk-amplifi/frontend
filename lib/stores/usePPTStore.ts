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

// Helper to clear corrupted store data
export const clearPPTStore = () => {
  try {
    localStorage.removeItem('ppt-graph-storage');
    console.log('[usePPTStore] Store cleared successfully');
  } catch (error) {
    console.error('[usePPTStore] Failed to clear store:', error);
  }
};

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
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;

            const { state } = JSON.parse(str);

            // Convert Array to Set
            const selectedGraphsSet = Array.isArray(state.selectedGraphsForPPT)
              ? new Set(state.selectedGraphsForPPT)
              : new Set();

            // Convert Object to Map
            let graphsMetadataMap = new Map();
            if (state.graphsMetadata && typeof state.graphsMetadata === 'object') {
              graphsMetadataMap = new Map(Object.entries(state.graphsMetadata));
            }

            return JSON.stringify({
              state: {
                ...state,
                selectedGraphsForPPT: selectedGraphsSet,
                graphsMetadata: graphsMetadataMap,
              },
            });
          } catch (error) {
            console.error('[usePPTStore] getItem error:', error);
            return null;
          }
        },
        setItem: (name, value) => {
          try {
            const parsed = JSON.parse(value);
            const state = parsed.state;

            // Convert Set to Array
            const selectedGraphsArray = state.selectedGraphsForPPT
              ? Array.from(state.selectedGraphsForPPT)
              : [];

            // Convert Map to Object
            let graphsMetadataObj = {};
            if (state.graphsMetadata) {
              if (state.graphsMetadata instanceof Map) {
                // It's a Map, convert it
                graphsMetadataObj = Object.fromEntries(state.graphsMetadata);
              } else if (typeof state.graphsMetadata === 'object') {
                // It's already an object, use as is
                graphsMetadataObj = state.graphsMetadata;
              }
            }

            const serialized = JSON.stringify({
              state: {
                ...state,
                selectedGraphsForPPT: selectedGraphsArray,
                graphsMetadata: graphsMetadataObj,
              },
            });
            localStorage.setItem(name, serialized);
          } catch (error) {
            console.error('[usePPTStore] setItem error:', error);
            // Don't throw - just log the error to prevent breaking the app
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      })),
    }
  )
);
