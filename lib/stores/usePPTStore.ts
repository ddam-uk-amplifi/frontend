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
    localStorage.removeItem("ppt-graph-storage");
    console.log("[usePPTStore] Store cleared successfully");
    // Force page reload to reinitialize store
    window.location.reload();
  } catch (error) {
    console.error("[usePPTStore] Failed to clear store:", error);
  }
};

// Auto-clear corrupted data on load
if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem("ppt-graph-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      // Check if data looks corrupted (not proper structure)
      if (parsed?.state) {
        const state = parsed.state;
        // If graphsMetadata is not an object or is an array, it's corrupted
        if (
          state.graphsMetadata &&
          (Array.isArray(state.graphsMetadata) ||
            typeof state.graphsMetadata !== "object")
        ) {
          console.warn("[usePPTStore] Detected corrupted data, clearing...");
          localStorage.removeItem("ppt-graph-storage");
        }
      }
    }
  } catch (error) {
    console.error("[usePPTStore] Error checking store:", error);
    localStorage.removeItem("ppt-graph-storage");
  }
}

export const usePPTStore = create<PPTStoreState>()(
  persist(
    (set, get) => ({
      selectedGraphsForPPT: new Set(),
      graphsMetadata: new Map(),

      addGraph: (graphId, metadata) => {
        set((state) => {
          // Ensure we're working with proper Set and Map
          const currentSelected =
            state.selectedGraphsForPPT instanceof Set
              ? state.selectedGraphsForPPT
              : new Set(
                  Array.isArray(state.selectedGraphsForPPT)
                    ? state.selectedGraphsForPPT
                    : [],
                );

          const currentMetadata =
            state.graphsMetadata instanceof Map
              ? state.graphsMetadata
              : new Map(
                  Object.entries(state.graphsMetadata || {}) as [
                    string,
                    GraphForPPT,
                  ][],
                );

          const newSelectedGraphs = new Set(currentSelected);
          newSelectedGraphs.add(graphId);

          const newMetadata = new Map(currentMetadata);
          newMetadata.set(graphId, metadata);

          return {
            selectedGraphsForPPT: newSelectedGraphs,
            graphsMetadata: newMetadata,
          };
        });
      },

      removeGraph: (graphId) => {
        set((state) => {
          // Ensure we're working with proper Set and Map
          const currentSelected =
            state.selectedGraphsForPPT instanceof Set
              ? state.selectedGraphsForPPT
              : new Set(
                  Array.isArray(state.selectedGraphsForPPT)
                    ? state.selectedGraphsForPPT
                    : [],
                );

          const currentMetadata =
            state.graphsMetadata instanceof Map
              ? state.graphsMetadata
              : new Map(
                  Object.entries(state.graphsMetadata || {}) as [
                    string,
                    GraphForPPT,
                  ][],
                );

          const newSelectedGraphs = new Set(currentSelected);
          newSelectedGraphs.delete(graphId);

          const newMetadata = new Map(currentMetadata);
          newMetadata.delete(graphId);

          return {
            selectedGraphsForPPT: newSelectedGraphs,
            graphsMetadata: newMetadata,
          };
        });
      },

      updateSlideNumber: (graphId, slideNumber) => {
        set((state) => {
          // Ensure we're working with a proper Map
          const currentMetadata =
            state.graphsMetadata instanceof Map
              ? state.graphsMetadata
              : new Map(
                  Object.entries(state.graphsMetadata || {}) as [
                    string,
                    GraphForPPT,
                  ][],
                );

          const newMetadata = new Map(currentMetadata);
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
        const metadata = get().graphsMetadata;
        // Handle case where it's not a Map (e.g., from localStorage)
        if (metadata instanceof Map) {
          return metadata.get(graphId);
        } else if (typeof metadata === "object" && metadata !== null) {
          // @ts-ignore - accessing as plain object
          return metadata[graphId];
        }
        return undefined;
      },

      getAllGraphs: () => {
        const metadata = get().graphsMetadata;
        // Handle case where it's not a Map
        if (metadata instanceof Map) {
          return Array.from(metadata.values());
        } else if (typeof metadata === "object" && metadata !== null) {
          // @ts-ignore - accessing as plain object
          return Object.values(metadata);
        }
        return [];
      },

      isGraphSelected: (graphId) => {
        const selected = get().selectedGraphsForPPT;
        // Handle case where it's not a Set
        if (selected instanceof Set) {
          return selected.has(graphId);
        } else if (Array.isArray(selected)) {
          return (selected as string[]).includes(graphId);
        }
        return false;
      },
    }),
    {
      name: "ppt-graph-storage",
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert rehydrated arrays/objects back to Set/Map
          if (Array.isArray(state.selectedGraphsForPPT)) {
            state.selectedGraphsForPPT = new Set(state.selectedGraphsForPPT);
          }
          if (
            state.graphsMetadata &&
            typeof state.graphsMetadata === "object" &&
            !(state.graphsMetadata instanceof Map)
          ) {
            state.graphsMetadata = new Map(
              Object.entries(state.graphsMetadata) as [string, GraphForPPT][],
            );
          }
        }
      },
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          try {
            const str = localStorage.getItem(name);
            if (!str) return null;

            const parsed = JSON.parse(str);
            const state = parsed.state;

            // Convert stored arrays/objects back to serializable format for zustand
            // Zustand will handle the conversion to Set/Map internally
            const selectedGraphsArray = Array.isArray(
              state.selectedGraphsForPPT,
            )
              ? state.selectedGraphsForPPT
              : [];

            const graphsMetadataObj =
              state.graphsMetadata && typeof state.graphsMetadata === "object"
                ? state.graphsMetadata
                : {};

            return JSON.stringify({
              state: {
                ...state,
                selectedGraphsForPPT: selectedGraphsArray,
                graphsMetadata: graphsMetadataObj,
              },
            });
          } catch (error) {
            console.error("[usePPTStore] getItem error:", error);
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
              } else if (typeof state.graphsMetadata === "object") {
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
            console.error("[usePPTStore] setItem error:", error);
            // Don't throw - just log the error to prevent breaking the app
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      })),
    },
  ),
);
