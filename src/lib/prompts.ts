import type { Intent } from "./intent";
import type { RetrievedSnippet } from "./retrieve";

export const UNKNOWN_FALLBACK =
  "I don’t have that in my approved knowledge base. " +
  "Please contact the Student Success Desk at success@campus.edu (Campus Hub, 10:00–17:00 IST).";

export function buildSystemPrompt(intent: Intent): string {
  if (intent === "subject_doubt") {
    return [
      "You are Student Support Copilot.",
      "The student asked about a concept or term.",
      "You MUST NOT explain, define, teach, or solve the concept.",
      "Using ONLY the knowledge snippets, tell them which course/module covers it (code, title, semester) and tell them to open that course in the LMS or ask their instructor.",
      "If no course match, say so and point to Student Success Desk / advisor.",
      "Be short and actionable.",
    ].join(" ");
  }

  return [
    "You are Student Support Copilot for a campus LMS demo.",
    "Answer ONLY using the provided knowledge snippets.",
    "Do NOT invent policies, mentors, modules, deadlines, or grades.",
    "Do NOT teach academic subjects or solve homework.",
    "Be concise, friendly, and actionable.",
    `Classified student intent: ${intent}.`,
    "If snippets are empty or insufficient, say you don't have that information and point to Student Success Desk.",
  ].join(" ");
}

export function buildUserPrompt(message: string, snippets: RetrievedSnippet[]): string {
  const block =
    snippets.length === 0
      ? "(no snippets retrieved)"
      : snippets
          .map(
            (s, i) =>
              `[${i + 1}] ${s.title}\nSource: ${s.sourceLabel}\n${s.body}`,
          )
          .join("\n\n");

  return `Student message:\n${message}\n\nApproved knowledge snippets:\n${block}\n\nWrite the reply for the student.`;
}

export function mockReplyFromSnippets(
  intent: Intent,
  message: string,
  snippets: RetrievedSnippet[],
): string {
  if (intent === "subject_doubt") {
    return mockTopicReferral(snippets);
  }

  if (snippets.length === 0) return UNKNOWN_FALLBACK;

  if (intent === "mentor") {
    const top = snippets[0];
    return (
      `For that request, here’s who to contact:\n\n` +
      `**${top.title}**\n${top.body}\n\n` +
      `If this doesn’t match what you need, reply with more detail or contact Student Success Desk.`
    );
  }

  if (intent === "curriculum") {
    const parts = snippets.map((s) => `### ${s.title}\n${s.body}`);
    return (
      `Here’s what I found in the curriculum catalog for your question (“${message.slice(0, 80)}${message.length > 80 ? "…" : ""}”):\n\n` +
      parts.join("\n\n")
    );
  }

  if (intent === "faq") {
    return snippets.map((s) => `${s.body}`).join("\n\n");
  }

  if (intent === "deadline") {
    const isStatus =
      snippets.some((s) => s.sourceLabel === "assignment submissions") ||
      /\b(taken|submitted|done|have i|did i|yet)\b/i.test(message);
    const header = isStatus
      ? "Here’s your assignment submission status:\n\n"
      : "Here are assignment deadlines from your roster:\n\n";
    return header + snippets.map((s) => `**${s.title}**\n${s.body}`).join("\n\n");
  }

  if (intent === "grades") {
    return (
      "Here’s your grades & course progress snapshot:\n\n" +
      snippets.map((s) => `**${s.title}**\n${s.body}`).join("\n\n")
    );
  }

  return (
    snippets.map((s) => `**${s.title}**\n${s.body}`).join("\n\n") +
    `\n\nIf you meant something else, ask about curriculum, grades, progress, deadlines, mentors, or campus FAQs.`
  );
}

function mockTopicReferral(snippets: RetrievedSnippet[]): string {
  if (snippets.length === 0) {
    return (
      "I don’t explain academic concepts here. I also couldn’t match that term to a course topic. " +
      "Please check your LMS course list or ask your instructor / Academic Advisor."
    );
  }

  const unmatched = snippets[0]?.id === "topic-not-mapped";
  if (unmatched) {
    return snippets[0].body;
  }

  const lines = snippets.map((s) => `**${s.title}**\n${s.body}`);
  return (
    "I don’t explain concepts or solve subject doubts here — but I can point you to the right course.\n\n" +
    "This topic appears to be covered in:\n\n" +
    lines.join("\n\n") +
    "\n\nOpen that course in your LMS to learn the material, or ask your instructor if you’re stuck."
  );
}
