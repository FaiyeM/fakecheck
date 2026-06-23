import { create } from "zustand";
import type {
  AnalyzeResponse,
  IdentificationResult,
  StepDto,
} from "../api/types";

// In-memory state for the active scan flow (identify -> steps -> analyze -> verdict).
// Persistent history lives in SQLite (src/db); this store is the current session only.

export interface CapturedPhoto {
  checkId: string;
  localUri: string;
  imageKey?: string; // set after upload to R2
}

interface ScanState {
  scanId?: string;
  primaryPhotoUri?: string;
  identification?: IdentificationResult;
  categoryId?: string;
  productId?: string | null;
  steps: StepDto[];
  photos: CapturedPhoto[];
  verdict?: AnalyzeResponse;

  setPrimaryPhoto: (uri: string) => void;
  setIdentification: (r: IdentificationResult) => void;
  setCategory: (categoryId: string, productId?: string | null) => void;
  setScanId: (id: string) => void;
  setSteps: (steps: StepDto[]) => void;
  addPhoto: (photo: CapturedPhoto) => void;
  setVerdict: (v: AnalyzeResponse) => void;
  reset: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  steps: [],
  photos: [],

  setPrimaryPhoto: (uri) => set({ primaryPhotoUri: uri }),
  setIdentification: (r) =>
    set({
      identification: r,
      categoryId: r.category,
      productId: r.productLine ?? null,
    }),
  setCategory: (categoryId, productId = null) => set({ categoryId, productId }),
  setScanId: (id) => set({ scanId: id }),
  setSteps: (steps) => set({ steps }),
  addPhoto: (photo) => set((s) => ({ photos: [...s.photos, photo] })),
  setVerdict: (v) => set({ verdict: v }),
  reset: () =>
    set({
      scanId: undefined,
      primaryPhotoUri: undefined,
      identification: undefined,
      categoryId: undefined,
      productId: undefined,
      steps: [],
      photos: [],
      verdict: undefined,
    }),
}));
