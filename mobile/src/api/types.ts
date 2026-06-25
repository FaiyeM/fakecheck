// Request/response types mirroring the backend DTOs (backend/FakeCheck.Api/Dtos/Dtos.cs)
// and Core IdentificationResult. Keep in sync with the .NET contract.

export type CategoryId = "sneaker" | "handbag" | "pokemon" | "watch";

// ---- /uploads/presign ----
export interface PresignRequest {
  count: number;
}
export interface PresignItem {
  key: string;
  url: string;
}
export interface PresignResponse {
  uploads: PresignItem[];
}

// ---- /identify (response = Core IdentificationResult) ----
export interface IdentifyRequest {
  imageKey: string;
}
export interface IdentificationAlternative {
  productLine: string;
  displayName: string;
  confidence: number;
}
export interface IdentificationResult {
  category: string;
  brand: string;
  productLine: string | null;
  displayName: string;
  confidence: number;
  alternatives: IdentificationAlternative[];
  model?: string | null;
  year?: string | null;
  retailPrice?: string | null;
}

// ---- /scans ----
export interface CreateScanRequest {
  deviceId: string;
  category: string;
  product?: string | null;
}
export interface CreateScanResponse {
  scanId: string;
}

// ---- /categories/{id}/steps ----
export interface StepDto {
  id: number;
  ordinal: number;
  checkId: string;
  instructionTitle: string;
  tipText: string;
  referenceImageUrl: string | null;
  requirement: "required" | "optional" | "conditional" | string;
  weight: number;
}

// ---- /auth/analyze ----
export interface AnalyzePhoto {
  checkId: string;
  imageKey: string;
}
export interface AnalyzeRequest {
  scanId: string;
  itemCategory: string;
  productId?: string | null;
  photos: AnalyzePhoto[];
}
export interface CheckDto {
  name: string;
  score: number;
  result: "pass" | "fail" | "uncertain" | string;
  observation: string;
}
export interface AnalyzeResponse {
  verdict: string;
  overallConfidence: number;
  hardFailTriggered: boolean;
  canProduceVerdict: boolean;
  missingRequiredSteps: string[];
  uncertainChecks: string[];
  suggestedVerificationServices: string[];
  checks: CheckDto[];
  disclaimer: string;
}

// ---- /corrections ----
export interface CorrectionCheckDto {
  checkId: string;
  score: number;
  result: string;
  observation: string;
}
export interface CorrectionRequest {
  scanId: string;
  userCorrection: "authentic" | "fake" | "unsure" | string;
  explanation: string;
  supportingImageUrls: string[];
  originalVerdict: string;
  originalConfidence: number;
  itemCategory: string;
  productId?: string | null;
  originalChecks: CorrectionCheckDto[];
  allScanImageUrls: string[];
  appVersion: string;
  platform: string;
}
export interface OkResponse {
  ok: boolean;
}
