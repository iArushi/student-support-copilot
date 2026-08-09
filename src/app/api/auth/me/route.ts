import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const student = await getSessionFromCookies();
  if (!student) {
    return NextResponse.json({ student: null }, { status: 401 });
  }
  return NextResponse.json({ student });
}
