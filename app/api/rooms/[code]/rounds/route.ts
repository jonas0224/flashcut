import { NextResponse } from "next/server";
import { getBearerToken, getHostPin, jsonError } from "@/lib/api-utils";
import { getHostRounds } from "@/lib/room-service";

type Params = { params: Promise<{ code: string }> };

export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const hostToken = getBearerToken(request);
  if (!hostToken) {
    return jsonError("Host token required", "UNAUTHORIZED", 401);
  }

  const result = await getHostRounds(code, hostToken, getHostPin(request) ?? undefined);
  if ("error" in result) {
    const status =
      result.code === "ROOM_NOT_FOUND"
        ? 404
        : result.code === "UNAUTHORIZED" ||
            result.code === "HOST_PIN_REQUIRED" ||
            result.code === "WRONG_HOST_PIN"
          ? 403
          : 400;
    return jsonError(result.error, result.code, status);
  }

  return NextResponse.json(result);
}
