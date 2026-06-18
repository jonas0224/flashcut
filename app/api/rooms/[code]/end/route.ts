import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "@/lib/api-utils";
import { endGame } from "@/lib/room-service";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  const hostToken = getBearerToken(request);
  if (!hostToken) {
    return jsonError("Host token required", "UNAUTHORIZED", 401);
  }

  const result = await endGame(code, hostToken);
  if ("error" in result) {
    const status = result.code === "ROOM_NOT_FOUND" ? 404 : 403;
    return jsonError(result.error, result.code, status);
  }

  return NextResponse.json({ ok: true });
}
