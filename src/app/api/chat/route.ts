import { NextResponse } from "next/server";
import { getSessionFromCookies } from "@/lib/auth";
import { handleChatMessage, type ChatScope } from "@/lib/chat";

export const runtime = "nodejs";

type Body = {
  message?: unknown;
  scope?: unknown;
};

const CHAT_SCOPES = new Set<ChatScope>([
  "curriculum",
  "assignments",
  "grades",
  "support",
  "course_referral",
]);

export async function POST(request: Request) {
  const student = await getSessionFromCookies();
  if (!student) {
    return NextResponse.json(
      { error: "Sign in as a student to use Student Support Copilot." },
      { status: 401 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.message !== "string") {
    return NextResponse.json({ error: "Expected { message: string }" }, { status: 400 });
  }

  const scope =
    typeof body.scope === "string" && CHAT_SCOPES.has(body.scope as ChatScope)
      ? (body.scope as ChatScope)
      : null;

  const result = await handleChatMessage(body.message, student, scope);

  console.info(
    JSON.stringify({
      event: "chat_turn",
      studentId: student.id,
      intent: result.intent,
      mode: result.mode,
      scope,
      hasSource: Boolean(result.source),
      messageLength: body.message.trim().length,
      ts: new Date().toISOString(),
    }),
  );

  return NextResponse.json({
    reply: result.reply,
    source: result.source,
  });
}
