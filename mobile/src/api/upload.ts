import { presignUploads, uploadToPresignedUrl } from "./endpoints";
import { prepareImageForUpload } from "./imagePipeline";

// Presign + PUT a single local image to R2, returning its object key.
// Images are downscaled/compressed by the camera-quality setting first (Phase 11).
export async function uploadImageAsync(localUri: string): Promise<string> {
  const { uploads } = await presignUploads(1);
  const target = uploads[0];
  const prepared = await prepareImageForUpload(localUri);
  await uploadToPresignedUrl(target.url, prepared.blob);
  return target.key;
}

// Presign + PUT several local images in order, returning their object keys.
export async function uploadImagesAsync(localUris: string[]): Promise<string[]> {
  if (localUris.length === 0) return [];
  const { uploads } = await presignUploads(localUris.length);
  const keys: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const prepared = await prepareImageForUpload(localUris[i]);
    await uploadToPresignedUrl(uploads[i].url, prepared.blob);
    keys.push(uploads[i].key);
  }
  return keys;
}
