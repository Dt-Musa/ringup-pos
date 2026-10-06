import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";

const schema = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });

// Used to keep timing similar when the email does not exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const SERVER_ERROR = "Server error, try again";

// Failure reasons are logged server-side (never the password or the email) to help debug deployments.
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    console.warn("[login] rejected: invalid request body");
    return NextResponse.json({ error: "Enter a valid email and password" }, { status: 400 });
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok || !user.active) {
      const reason = !user ? "user not found" : !user.active ? "user is inactive" : "wrong password";
      console.warn(`[login] failed: ${reason}`);
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const session = await getSession(); // throws if SESSION_SECRET is missing / too short
    session.userId = user.id;
    session.role = user.role;
    session.sessionVersion = user.sessionVersion;
    await session.save();

    // Raw SQL so a sign-in doesn't bump updatedAt (which tracks edits to the account). Not fatal if it fails.
    await prisma.$executeRaw`UPDATE "User" SET "lastLoginAt" = (NOW() AT TIME ZONE 'UTC') WHERE "id" = ${user.id}`.catch(() =>
      console.warn("[login] could not record lastLoginAt"),
    );

    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const kind = /SESSION_SECRET/.test(msg) ? "config error (SESSION_SECRET missing or too short)" : "database/server error";
    console.error(`[login] failed: ${kind}`);
    return NextResponse.json({ error: SERVER_ERROR }, { status: 500 });
  }
}
