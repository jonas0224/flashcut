import { NextResponse } from "next/server";
import { jsonError, parseJson } from "@/lib/api-utils";
import { joinRoom } from "@/lib/room-service";

type Params = { params: Promise<{ code: string }> };

export async function POST(request: Request, { params }: Params) {
  const { code } = await params;
  const body = await parseJson<{ nickname?: string; password?: string }>(
    request,
  );

  if (!body?.nickname) {
    return jsonError("Nickname required", "INVALID_NICKNAME", 400);
  }

  const result = await joinRoom(code, body.nickname, body.password);
  if ("error" in result) {
    const status =
      result.code === "ROOM_NOT_FOUND"
        ? 404
        : result.code === "WRONG_PASSWORD"
          ? 403
          : 409;
    return jsonError(result.error, result.code, status);
  }

  return NextResponse.json({
    playerId: result.player.id,
    playerToken: result.player.token,
    nickname: result.player.nickname,
  });
}
