import { NextResponse } from "next/server";
import { getBearerToken, getHostPin, jsonError } from "@/lib/api-utils";
import { setHostRoundImageUrl } from "@/lib/room-service";
import { saveRoundUpload } from "@/lib/upload-round-image";

type Params = { params: Promise<{ code: string; roundIndex: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code, roundIndex: roundIndexRaw } = await params;
  const roundIndex = Number.parseInt(roundIndexRaw, 10);
  const hostToken = getBearerToken(request);
  if (!hostToken) {
    return jsonError("Host token required", "UNAUTHORIZED", 401);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Expected multipart form data", "INVALID_BODY", 400);
  }

  const file = form.get("image");
  if (!(file instanceof File)) {
    return jsonError("Missing image file", "INVALID_BODY", 400);
  }

  const saved = await saveRoundUpload(code.toUpperCase(), roundIndex, file);
  if ("error" in saved) {
    return jsonError(saved.error, "INVALID_IMAGE", 400);
  }

  const result = await setHostRoundImageUrl(
    code,
    hostToken,
    roundIndex,
    saved.imageUrl,
    getHostPin(request) ?? undefined,
  );
  if ("error" in result) {
    const status =
      result.code === "ROOM_NOT_FOUND"
        ? 404
        : result.code === "UNAUTHORIZED"
          ? 403
          : result.code === "GAME_STARTED"
            ? 409
            : 400;
    return jsonError(result.error, result.code, status);
  }

  return NextResponse.json(result);
}
