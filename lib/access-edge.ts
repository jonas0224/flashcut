const ACCESS_SALT = "flashcut-access-v1";

async function edgeAccessToken(secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(ACCESS_SALT));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyEdgeAccessCookie(
  cookie: string | undefined,
): Promise<boolean> {
  const secret = process.env.ROOM_PASSWORD?.trim();
  if (!secret) return true;
  if (!cookie) return false;
  const expected = await edgeAccessToken(secret);
  return cookie === expected;
}

export function isPasswordRequired(): boolean {
  return Boolean(process.env.ROOM_PASSWORD?.trim());
}
