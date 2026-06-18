import { mkdir, writeFile } from "fs/promises";
import path from "path";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function extensionForMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpg";
  }
}

function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN?.trim());
}

async function saveToBlob(
  roomCode: string,
  roundIndex: number,
  file: File,
  buffer: Buffer,
  ext: string,
): Promise<{ imageUrl: string } | { error: string }> {
  try {
    const { put } = await import("@vercel/blob");
    const pathname = `flashcut/${roomCode}/round-${roundIndex}.${ext}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });
    return { imageUrl: blob.url };
  } catch {
    return { error: "Cloud image upload failed" };
  }
}

async function saveToDisk(
  roomCode: string,
  roundIndex: number,
  buffer: Buffer,
  ext: string,
): Promise<{ imageUrl: string }> {
  const dir = path.join(process.cwd(), "public", "uploads", roomCode);
  await mkdir(dir, { recursive: true });

  const filename = `round-${roundIndex}.${ext}`;
  const diskPath = path.join(dir, filename);
  await writeFile(diskPath, buffer);

  return { imageUrl: `/uploads/${roomCode}/${filename}` };
}

export async function saveRoundUpload(
  roomCode: string,
  roundIndex: number,
  file: File,
): Promise<{ imageUrl: string } | { error: string }> {
  if (!ALLOWED.has(file.type)) {
    return { error: "Image must be JPEG, PNG, WebP, or GIF" };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Image must be 5 MB or smaller" };
  }

  const ext = extensionForMime(file.type);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (blobConfigured()) {
    return saveToBlob(roomCode, roundIndex, file, buffer, ext);
  }

  if (process.env.NODE_ENV === "production") {
    return {
      error:
        "Custom uploads need BLOB_READ_WRITE_TOKEN on Vercel (Blob store)",
    };
  }

  return saveToDisk(roomCode, roundIndex, buffer, ext);
}

export function customUploadsAvailable(): boolean {
  return blobConfigured() || process.env.NODE_ENV !== "production";
}
