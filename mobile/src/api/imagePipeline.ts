import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { useSettingsStore } from "../store/settingsStore";
import type { CameraQuality } from "../store/settingsStore";

// Client-side image pipeline (spec §13, Phase 11):
//  - downscale + JPEG-compress before upload, driven by the camera-quality setting
//  - a cheap blur proxy so we can prompt a retake on low-detail shots
//  - a camera-EXIF check to flag screenshots / stripped images

// Max long-edge width per quality tier. "high" keeps detail for auth checks;
// "standard" trims upload size on slow connections.
const MAX_WIDTH: Record<CameraQuality, number> = { standard: 1280, high: 2048 };
const COMPRESS: Record<CameraQuality, number> = { standard: 0.6, high: 0.82 };

// Blur proxy: a sharp, detailed JPEG packs more high-frequency data, so it has a
// higher bytes-per-pixel ratio than a soft/blurry one. Below this ratio we treat
// the shot as likely blurry. It's a heuristic, not a true Laplacian — kept lean to
// avoid a native vision dependency.
const BLUR_BPP_THRESHOLD = 0.11;
const ASSESS_WIDTH = 900;

export interface PreparedImage {
  uri: string;
  blob: Blob;
  width: number;
  height: number;
  blurScore: number; // 0..1, higher = sharper
  isLikelyBlurry: boolean;
}

async function blobOf(uri: string): Promise<Blob> {
  const res = await fetch(uri);
  return res.blob();
}

function bytesPerPixel(size: number, w: number, h: number): number {
  const px = w * h;
  return px > 0 ? size / px : 0;
}

/**
 * Downscale + compress a captured image for upload using the current camera-quality
 * setting, and compute a blur proxy from the compressed result.
 */
export async function prepareImageForUpload(uri: string): Promise<PreparedImage> {
  const quality = useSettingsStore.getState().cameraQuality;
  const maxWidth = MAX_WIDTH[quality];

  const probe = await manipulateAsync(uri, [], { format: SaveFormat.JPEG });
  const actions = probe.width > maxWidth ? [{ resize: { width: maxWidth } }] : [];
  const out = await manipulateAsync(uri, actions, {
    compress: COMPRESS[quality],
    format: SaveFormat.JPEG,
  });

  const blob = await blobOf(out.uri);
  const bpp = bytesPerPixel(blob.size, out.width, out.height);
  return {
    uri: out.uri,
    blob,
    width: out.width,
    height: out.height,
    blurScore: Math.min(1, bpp / 0.5),
    isLikelyBlurry: bpp < BLUR_BPP_THRESHOLD,
  };
}

export interface CaptureAssessment {
  isLikelyBlurry: boolean;
  hasCameraExif: boolean; // false => probably a screenshot or EXIF-stripped image
}

/**
 * Lightweight capture-time check used to prompt a retake (spec §13): a quick
 * blur proxy on a downscaled copy plus a camera-EXIF presence check.
 */
export async function assessCapture(
  uri: string,
  exif?: Record<string, unknown> | null
): Promise<CaptureAssessment> {
  const out = await manipulateAsync(uri, [{ resize: { width: ASSESS_WIDTH } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
  });
  const blob = await blobOf(out.uri);
  const bpp = bytesPerPixel(blob.size, out.width, out.height);
  const hasCameraExif = !!(
    exif &&
    (exif.Make || exif.LensMake || exif.DateTimeOriginal || exif.FNumber)
  );
  return { isLikelyBlurry: bpp < BLUR_BPP_THRESHOLD, hasCameraExif };
}
