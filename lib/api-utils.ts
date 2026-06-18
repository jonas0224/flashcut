import { NextResponse } from "next/server";
import type { ApiErrorBody } from "./types";

export function jsonError(
  message: string,
  code: string,
  status: number,
): NextResponse<ApiErrorBody> {
  return NextResponse.json({ error: message, code }, { status });
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

export function getHostPin(request: Request): string | null {
  return request.headers.get("x-flashcut-host-pin")?.trim() || null;
}

export async function parseJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
