import { api } from "./client";
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CorrectionRequest,
  CreateScanRequest,
  CreateScanResponse,
  IdentificationResult,
  OkResponse,
  PresignResponse,
  StepDto,
} from "./types";

// Thin typed wrappers over the backend routes (see Dtos.cs / controllers).

export async function getHealth(): Promise<{ status: string }> {
  const { data } = await api.get("/health");
  return data;
}

export async function presignUploads(count: number): Promise<PresignResponse> {
  const { data } = await api.post<PresignResponse>("/uploads/presign", { count });
  return data;
}

export async function identify(imageKey: string): Promise<IdentificationResult> {
  const { data } = await api.post<IdentificationResult>("/identify", { imageKey });
  return data;
}

export async function getCategorySteps(categoryId: string): Promise<StepDto[]> {
  const { data } = await api.get<StepDto[]>(`/categories/${categoryId}/steps`);
  return data;
}

export async function createScan(body: CreateScanRequest): Promise<CreateScanResponse> {
  const { data } = await api.post<CreateScanResponse>("/scans", body);
  return data;
}

export async function analyze(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  const { data } = await api.post<AnalyzeResponse>("/auth/analyze", body);
  return data;
}

export async function submitCorrection(body: CorrectionRequest): Promise<OkResponse> {
  const { data } = await api.post<OkResponse>("/corrections", body);
  return data;
}

// Uploads a binary blob to a presigned R2 PUT URL (no auth header, raw body).
export async function uploadToPresignedUrl(url: string, blob: Blob): Promise<void> {
  await api.put(url, blob, {
    baseURL: "",
    headers: { "Content-Type": blob.type || "image/jpeg" },
    transformRequest: (d) => d,
  });
}
