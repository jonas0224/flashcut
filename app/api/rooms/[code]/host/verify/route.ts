import { NextResponse } from "next/server";
import { getBearerToken, getHostPin, jsonError } from "@/lib/api-utils";
import { verifyHostAccess } from "@/lib/room-service";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  const hostToken = getBearerToken(request);
  if (!hostToken) {
    return jsonError("Host token required", "UNAUTHORIZED", 401);
  }

  const result = await verifyHostAccess(code, hostToken, getHostPin(request) ?? undefined);
  if ("error" in result) {
    const status =
      result.code === "ROOM_NOT_FOUND"
        ? 404
        : result.code === "HOST_PIN_REQUIRED" || result.code === "WRONG_HOST_PIN"
          ? 403
          : 403;
    return jsonError(result.error, result.code, status);
  }

  return NextResponse.json({ ok: true });
}
