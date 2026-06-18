import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPasswordRequired, verifyEdgeAccessCookie } from "@/lib/access-edge";

const PUBLIC_PATHS = ["/login", "/robots.txt", "/icon.svg"];

function isPublicAsset(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/packs/")) return true;
  if (pathname.startsWith("/uploads/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  if (!isPasswordRequired()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    isPublicAsset(pathname)
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get("flashcut_access")?.value;
  if (await verifyEdgeAccessCookie(cookie)) {
    return NextResponse.next();
  }

  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
