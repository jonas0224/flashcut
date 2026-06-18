import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "@/lib/api-utils";
import { findPlayerByToken, syncAndGetRoom } from "@/lib/room-service";
import { loadRoom } from "@/lib/room-store";

type Params = { params: Promise<{ code: string }> };

export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const token = getBearerToken(request);

  let viewerPlayerId: string | undefined;
  if (token) {
    const room = await loadRoom(code);
    if (room) {
      const player = findPlayerByToken(room, token);
      viewerPlayerId = player?.id;
    }
  }

  const state = await syncAndGetRoom(code, viewerPlayerId);
  if (!state) {
    return jsonError("Room not found", "ROOM_NOT_FOUND", 404);
  }

  return NextResponse.json(state);
}
