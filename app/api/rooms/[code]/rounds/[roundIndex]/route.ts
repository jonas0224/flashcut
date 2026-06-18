import { NextResponse } from "next/server";
import { getBearerToken, jsonError, parseJson } from "@/lib/api-utils";
import { updateHostRound } from "@/lib/room-service";
import type { RoundDefinition } from "@/lib/types";

type Params = { params: Promise<{ code: string; roundIndex: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { code, roundIndex: roundIndexRaw } = await params;
  const roundIndex = Number.parseInt(roundIndexRaw, 10);
  const hostToken = getBearerToken(request);
  if (!hostToken) {
    return jsonError("Host token required", "UNAUTHORIZED", 401);
  }

  const body = await parseJson<RoundDefinition>(request);
  if (!body) {
    return jsonError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const result = await updateHostRound(code, hostToken, roundIndex, body);
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
