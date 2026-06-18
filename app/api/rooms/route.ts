import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifyAccess } from "@/lib/access-control";
import { validateHostPin } from "@/lib/host-pin";
import { jsonError, parseJson } from "@/lib/api-utils";
import { createRoom } from "@/lib/room-service";

export async function POST(request: Request) {
  const body = await parseJson<{ packId?: string; password?: string; hostPin?: string }>(request);
  const cookieStore = await cookies();
  const accessCookie = cookieStore.get("flashcut_access")?.value;

  if (!verifyAccess(body?.password, accessCookie)) {
    return jsonError("Wrong team password", "WRONG_PASSWORD", 403);
  }

  const pinError = validateHostPin(body?.hostPin ?? "");
  if (pinError) {
    return jsonError(pinError, "INVALID_HOST_PIN", 400);
  }

  const packId = body?.packId ?? "starter-01";

  const room = await createRoom(packId, body!.hostPin!);
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
