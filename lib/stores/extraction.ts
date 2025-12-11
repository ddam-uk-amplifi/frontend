import { create } from "zustand";

// Types for upload progress tracking
interface TableInfo {
    name: string;
    rows: number;
    columns: number;
}

export interface UploadProgress {
    id: string;
    marketId: number; // UI row ID
    dbMarketId: number; // Database market ID (for consolidation)
    marketCode: string;
    fileName: string;
    progress: number;
    status: "uploading" | "complete" | "failed";
    error?: string;
    // Extraction response data
    jobId?: string;
    tablesExtracted?: number;
    tableInfo?: TableInfo[];
    downloadUrl?: string;
    extractedPath?: string; // Path to extracted file
}

interface ConsolidationResult {
    id?: string;
    status?: string;
    output_path?: string;
    pptx_path?: string;
    ppt_path?: string;
    excel_path?: string;
    excel_download_url?: string;
    ppt_download_url?: string;
    completed_at?: string;
    error?: boolean;
    message?: string;
    error_message?: string;
}

interface ExtractionState {
    // State
    uploadProgress: UploadProgress[];
    isConsolidating: boolean;
    consolidationResult: ConsolidationResult | null;
    activeClientId: string;
    activeBatchId: string | null;
}

interface ExtractionActions {
    // Actions
    setUploadProgress: (progress: UploadProgress[] | ((prev: UploadProgress[]) => UploadProgress[])) => void;
    updateUploadItem: (id: string, updates: Partial<UploadProgress>) => void;
    setIsConsolidating: (value: boolean) => void;
    setConsolidationResult: (result: ConsolidationResult | null) => void;
    setActiveClientId: (clientId: string) => void;
    setActiveBatchId: (batchId: string | null) => void;
    clearExtractionState: () => void;
    hasActiveExtraction: () => boolean;
}

type ExtractionStore = ExtractionState & ExtractionActions;

const initialState: ExtractionState = {
    uploadProgress: [],
    isConsolidating: false,
    consolidationResult: null,
    activeClientId: "arla",
    activeBatchId: null,
};

export const useExtractionStore = create<ExtractionStore>()((set, get) => ({
    ...initialState,

    setUploadProgress: (progress) => {
        if (typeof progress === "function") {
            set((state) => ({ uploadProgress: progress(state.uploadProgress) }));
        } else {
            set({ uploadProgress: progress });
        }
    },

    updateUploadItem: (id, updates) => {
        set((state) => ({
            uploadProgress: state.uploadProgress.map((item) =>
                item.id === id ? { ...item, ...updates } : item
            ),
        }));
    },

    setIsConsolidating: (value) => {
        set({ isConsolidating: value });
    },

    setConsolidationResult: (result) => {
        set({ consolidationResult: result });
    },

    setActiveClientId: (clientId) => {
        set({ activeClientId: clientId });
    },

    setActiveBatchId: (batchId) => {
        set({ activeBatchId: batchId });
    },

    clearExtractionState: () => {
        set(initialState);
    },

    hasActiveExtraction: () => {
        const state = get();
        // Has active extraction if any upload is in progress or consolidation is running
        const hasUploading = state.uploadProgress.some(
            (p) => p.status === "uploading"
        );
        return hasUploading || state.isConsolidating;
    },
}));
