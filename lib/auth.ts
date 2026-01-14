import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "talker_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

const getAuthSecret = () => {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production.");
    }
    return "dev-secret";
  }
  return secret;
};

const getSecretKey = () => new TextEncoder().encode(getAuthSecret());

export const createSessionToken = async (userId: number) => {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(getSecretKey());
};

export const verifySessionToken = async (token?: string) => {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = Number(payload.sub);
    if (!userId || Number.isNaN(userId)) {
      return null;
    }
    return { userId };
  } catch {
    return null;
  }
};

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
});
