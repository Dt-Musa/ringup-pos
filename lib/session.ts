import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { Role } from "./permissions";

export type SessionData = {
  userId?: string;
  role?: Role;
};

export const SESSION_COOKIE = "pos_session";

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set to a string of at least 32 characters (see .env.example)");
  }
  return {
    password,
    cookieName: SESSION_COOKIE,
    ttl: 60 * 60 * 12, // 12 hours
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.SESSION_COOKIE_SECURE !== undefined
          ? process.env.SESSION_COOKIE_SECURE === "true"
          : process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
