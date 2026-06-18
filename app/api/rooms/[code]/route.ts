import { NextResponse } from "next/server";
import { getBearerToken, jsonError } from "@/lib/api-utils";
import { findPlayerByToken, syncAndGetRoom } from "@/lib/room-service";
import { loadRoom } from "@/lib/room-store";

type Params = { params: Promise<{ code: string }> };

function roomEtag(version: number): string {
  return `"${version}"`;
}

export async function GET(request: Request, { params }: Params) {
  const { code } = await params;
  const token = getBearerToken(request);

  let viewerPlayerId: string | undefined;
  let isHostViewer = false;
  let room = token ? await loadRoom(code) : null;

  if (token && room) {
    if (room.hostToken === token) {
      isHostViewer = true;
    } else {
      const player = findPlayerByToken(room, token);
      viewerPlayerId = player?.id;
    }
  }

  const result = await syncAndGetRoom(
    code,
    viewerPlayerId,
    isHostViewer,
    room,
  );
  if (!result) {
    return jsonError("Room not found", "ROOM_NOT_FOUND", 404);
  }

  const etag = roomEtag(result.version);
  if (request.headers.get("if-none-match") === etag) {
    return new NextResponse(null, {
      status: 304,
      headers: { ETag: etag },
    });
  }

  return NextResponse.json(result.state, { headers: { ETag: etag } });
}
