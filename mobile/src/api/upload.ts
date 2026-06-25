import * as FileSystem from "expo-file-system/legacy";
import { presignUploads } from "./endpoints";
import { prepareImageForUpload } from "./imagePipeline";

// PUT a local image file to a presigned R2 URL by streaming the real file bytes.
//
// We deliberately use expo-file-system's uploadAsync (BINARY_CONTENT) rather than
// fetching a Blob and PUTting it via axios: in React Native a Blob built from a
// file:// URI is unreliable as a request body and frequently uploads zero bytes,
// which left the R2 scans bucket empty and made every scan fail upstream.
// Content-Type must be exactly "image/jpeg" to match the presigned signature.
async function putFileToPresignedUrl(url: string, fileUri: string): Promise<void> {
  const res = await FileSystem.uploadAsync(url, fileUri, {
    httpMethod: "PUT",
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": "image/jpeg" },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Upload failed (${res.status}): ${res.body?.slice(0, 200) ?? ""}`);
  }
}

// TEMP diagnostic: label which step throws so on-device errors are pinpointable.
async function stage<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new Error(`${name}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// Presign + PUT a single local image to R2, returning its object key.
// Images are downscaled/compressed by the camera-quality setting first (Phase 11).
export async function uploadImageAsync(localUri: string): Promise<string> {
  const { uploads } = await stage("presign", () => presignUploads(1));
  const target = uploads[0];
  const prepared = await stage("prepare", () => prepareImageForUpload(localUri));
  await stage("put", () => putFileToPresignedUrl(target.url, prepared.uri));
  return target.key;
}

// Presign + PUT several local images in order, returning their object keys.
export async function uploadImagesAsync(localUris: string[]): Promise<string[]> {
  if (localUris.length === 0) return [];
  const { uploads } = await presignUploads(localUris.length);
  const keys: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const prepared = await prepareImageForUpload(localUris[i]);
    await putFileToPresignedUrl(uploads[i].url, prepared.uri);
    keys.push(uploads[i].key);
  }
  return keys;
}
