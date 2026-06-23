import { useMutation, useQuery } from "@tanstack/react-query";
import {
  analyze,
  createScan,
  getCategorySteps,
  getHealth,
  identify,
  presignUploads,
  submitCorrection,
} from "./endpoints";
import type {
  AnalyzeRequest,
  CorrectionRequest,
  CreateScanRequest,
} from "./types";

export function useHealth() {
  return useQuery({ queryKey: ["health"], queryFn: getHealth });
}

export function useCategorySteps(categoryId: string | undefined) {
  return useQuery({
    queryKey: ["steps", categoryId],
    queryFn: () => getCategorySteps(categoryId as string),
    enabled: !!categoryId,
  });
}

export function usePresign() {
  return useMutation({ mutationFn: (count: number) => presignUploads(count) });
}

export function useIdentify() {
  return useMutation({ mutationFn: (imageKey: string) => identify(imageKey) });
}

export function useCreateScan() {
  return useMutation({ mutationFn: (body: CreateScanRequest) => createScan(body) });
}

export function useAnalyze() {
  return useMutation({ mutationFn: (body: AnalyzeRequest) => analyze(body) });
}

export function useSubmitCorrection() {
  return useMutation({ mutationFn: (body: CorrectionRequest) => submitCorrection(body) });
}
