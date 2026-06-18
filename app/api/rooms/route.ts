import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api-utils";
import { createRoom } from "@/lib/room-service";

export async function POST(request: Request) {
  const body = await parseJson<{ packId?: string }>(request);
  const packId = body?.packId ?? "starter-01";

  const room = await createRoom(packId);
  if (!room) {
    return jsonError("Pack not found", "PACK_NOT_FOUND", 400);
  }

  return NextResponse.json(
    {
      code: room.code,
      hostToken: room.hostToken,
      hostUrl: `/room/${room.code}/host`,
      joinUrl: `/join/${room.code}`,
    },
    { status: 201 },
  );
}
