import { presignUploads, uploadToPresignedUrl } from "./endpoints";

// Presign + PUT a single local image to R2, returning its object key.
// (Phase 11 adds compression/blur scoring before this step.)
export async function uploadImageAsync(localUri: string): Promise<string> {
  const { uploads } = await presignUploads(1);
  const target = uploads[0];
  const res = await fetch(localUri);
  const blob = await res.blob();
  await uploadToPresignedUrl(target.url, blob);
  return target.key;
}

// Presign + PUT several local images in order, returning their object keys.
export async function uploadImagesAsync(localUris: string[]): Promise<string[]> {
  if (localUris.length === 0) return [];
  const { uploads } = await presignUploads(localUris.length);
  const keys: string[] = [];
  for (let i = 0; i < localUris.length; i++) {
    const res = await fetch(localUris[i]);
    const blob = await res.blob();
    await uploadToPresignedUrl(uploads[i].url, blob);
    keys.push(uploads[i].key);
  }
  return keys;
}
