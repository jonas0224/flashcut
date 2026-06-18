import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAccess } from "@/lib/access-control";
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

  const cookieStore = await cookies();
  const accessCookie = cookieStore.get("flashcut_access")?.value;
  if (!verifyAccess(body.password, accessCookie)) {
    return jsonError("Wrong team password", "WRONG_PASSWORD", 403);
  }

  const result = await joinRoom(code, body.nickname);
  if ("error" in result) {
    const status =
      result.code === "ROOM_NOT_FOUND"
        ? 404
        : result.code === "GAME_STARTED" || result.code === "ROOM_FULL"
          ? 409
          : 400;
    return jsonError(result.error, result.code, status);
  }

  return NextResponse.json({
    playerId: result.player.id,
    playerToken: result.player.token,
    nickname: result.player.nickname,
  });
}
