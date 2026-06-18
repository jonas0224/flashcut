import { NextResponse } from "next/server";
import { getBearerToken, jsonError, parseJson } from "@/lib/api-utils";
import { submitAnswer } from "@/lib/room-service";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  const playerToken = getBearerToken(request);
  if (!playerToken) {
    return jsonError("Player token required", "UNAUTHORIZED", 401);
  }

  const body = await parseJson<{ choice?: string }>(request);
  if (!body?.choice) {
    return jsonError("Choice required", "INVALID_CHOICE", 400);
  }

  const result = await submitAnswer(code, playerToken, body.choice);
  if ("error" in result) {
    const status =
      result.code === "ROOM_NOT_FOUND"
        ? 404
        : result.code === "UNAUTHORIZED"
          ? 401
          : 400;
    return jsonError(result.error, result.code, status);
  }

  return NextResponse.json({ ok: true });
}
