import { NextResponse } from "next/server";
import { SESSION_COOKIE, findStudentByCredentials } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown };
  try {
    body = (await request.json()) as { email?: unknown; password?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const student = findStudentByCredentials(body.email, body.password);
  if (!student) {
    return NextResponse.json({ error: "Invalid student credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ student });
  res.cookies.set(SESSION_COOKIE, student.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
