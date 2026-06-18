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
  const dir = path.join(process.cwd(), "public", "uploads", roomCode);
  await mkdir(dir, { recursive: true });

  const filename = `round-${roundIndex}.${ext}`;
  const diskPath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);

  return { imageUrl: `/uploads/${roomCode}/${filename}` };
}
