import { createHmac, timingSafeEqual } from "crypto";

const ACCESS_SALT = "flashcut-access-v1";

export function isPasswordRequired(): boolean {
  return Boolean(process.env.ROOM_PASSWORD?.trim());
}

export function verifyAccessPassword(password?: string): boolean {
  const required = process.env.ROOM_PASSWORD?.trim();
  if (!required) return true;
  return password === required;
}

export function createAccessToken(): string | null {
  const secret = process.env.ROOM_PASSWORD?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update(ACCESS_SALT).digest("hex");
}

export function verifyAccessToken(token: string | undefined | null): boolean {
  if (!isPasswordRequired()) return true;
  const expected = createAccessToken();
  if (!expected || !token) return false;
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(token, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyAccess(
  password?: string,
  accessCookie?: string | null,
): boolean {
  if (!isPasswordRequired()) return true;
  if (verifyAccessPassword(password)) return true;
  return verifyAccessToken(accessCookie);
}

export function getPublicAccessConfig() {
  return {
    passwordRequired: isPasswordRequired(),
    customUploadsEnabled: Boolean(
      process.env.BLOB_READ_WRITE_TOKEN?.trim() ||
        process.env.NODE_ENV !== "production",
    ),
  };
}
