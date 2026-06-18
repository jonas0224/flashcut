import { NextResponse } from "next/server";
import {
  createAccessToken,
  getPublicAccessConfig,
  verifyAccessPassword,
} from "@/lib/access-control";

const COOKIE_NAME = "flashcut_access";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;

  if (!verifyAccessPassword(body?.password)) {
    return NextResponse.json(
      { error: "Wrong team password", code: "WRONG_PASSWORD" },
      { status: 403 },
    );
  }

  const token = createAccessToken();
  if (!token) {
    return NextResponse.json({ ok: true, passwordRequired: false });
  }

  const response = NextResponse.json({ ok: true, passwordRequired: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export async function GET() {
  return NextResponse.json(getPublicAccessConfig());
}
