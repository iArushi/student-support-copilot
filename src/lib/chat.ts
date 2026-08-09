import OpenAI from "openai";
import type { StudentSession } from "@/lib/student-types";
import { classifyIntent, type Intent } from "@/lib/intent";
import {
  UNKNOWN_FALLBACK,
  buildSystemPrompt,
  buildUserPrompt,
  mockReplyFromSnippets,
} from "@/lib/prompts";
import { retrieveSnippets, sourceLabelFor } from "@/lib/retrieve";
import { understandStudentMessage } from "@/lib/understand";

export type ChatScope =
  | "curriculum"
  | "assignments"
  | "grades"
  | "support"
  | "course_referral";

export type ChatResponse = {
  reply: string;
  intent: string;
  source: string | null;
  mode: "referral" | "openai" | "mock";
};

export async function handleChatMessage(
  message: string,
  student?: StudentSession | null,
  scope?: ChatScope | null,
): Promise<ChatResponse> {
  const trimmed = message.trim();
  if (!trimmed) {
    return {
      reply:
        "Ask about curriculum, grades, progress, deadlines, campus FAQs, or which course covers a topic. I won’t explain subject terminology.",
      intent: "unknown",
      source: null,
      mode: "mock",
    };
  }

  const understood = await understandStudentMessage(trimmed);
  const routingMessage = [
    understood.normalized,
    understood.courseHint,
    understood.topicHint,
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  if (isCapabilityQuestion(routingMessage)) {
    return {
      reply: buildCapabilityReply(scope),
      intent: "unknown",
      source: null,
      mode: "mock",
    };
  }

  if (isDistressMessage(routingMessage)) {
    const intent: Intent = "mentor";
    const snippets = retrieveSnippets(intent, `${routingMessage} stress wellbeing counseling`, {
      student,
    });
    return {
      reply:
        "I’m sorry you’re dealing with this. You don’t have to handle it alone.\n\n" +
        mockReplyFromSnippets(intent, routingMessage, snippets),
      intent,
      source: sourceLabelFor(intent, snippets),
      mode: "mock",
    };
  }

  if (isOffTopic(routingMessage)) {
    return {
      reply:
        "I can only help with your LMS curriculum, assignments, grades and progress, approved FAQs, support contacts, or finding which course covers a topic.",
      intent: "unknown",
      source: null,
      mode: "mock",
    };
  }

  if (isVagueMessage(routingMessage)) {
    return {
      reply:
        "I can help, but I need one more detail. Is this about your curriculum, an assignment or deadline, grades or progress, a support process, or finding where a topic is taught?",
      intent: "unknown",
      source: null,
      mode: "mock",
    };
  }

  const normalizedIntent = classifyIntent(routingMessage);
  const originalIntent = classifyIntent(trimmed);
  const confidentLlmHints =
    understood.mode === "openai" && understood.confidence >= 0.75
      ? understood.intentHints.filter((intent) => intent !== "unknown")
      : [];
  const classifiedIntent =
    originalIntent === "subject_doubt" ||
    normalizedIntent === "subject_doubt" ||
    confidentLlmHints.includes("subject_doubt")
      ? "subject_doubt"
      : normalizedIntent === "unknown" && confidentLlmHints.length === 1
        ? confidentLlmHints[0]
        : normalizedIntent;

  if (
    understood.needsClarification &&
    classifiedIntent === "unknown" &&
    confidentLlmHints.length <= 1
  ) {
    return {
      reply:
        "I’m not fully sure what information you need. Please name the course, assignment, policy, or support issue you mean.",
      intent: "unknown",
      source: null,
      mode: "mock",
    };
  }

  if (classifiedIntent !== "subject_doubt") {
    const combinedIntents = [
      ...new Set([
        ...detectCombinedIntents(routingMessage),
        ...confidentLlmHints.filter((intent) => intent !== "subject_doubt"),
      ]),
    ];
    if (combinedIntents.length > 1) {
      return buildCombinedResponse(combinedIntents, routingMessage, student);
    }
  }

  const intent = resolveIntentForScope(classifiedIntent, routingMessage, scope);
  const snippets = retrieveSnippets(intent, routingMessage, { student });
  const source = sourceLabelFor(intent, snippets);

  if (snippets.length === 0) {
    return {
      reply: UNKNOWN_FALLBACK,
      intent,
      source: null,
      mode: "mock",
    };
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const fallbackMode = intent === "subject_doubt" ? "referral" : "mock";
  const fallbackReply = mockReplyFromSnippets(intent, trimmed, snippets);

  if (!apiKey) {
    return {
      reply: fallbackReply,
      intent,
      source,
      mode: fallbackMode,
    };
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: intent === "subject_doubt" ? 0.1 : 0.2,
      messages: [
        { role: "system", content: buildSystemPrompt(intent) },
        { role: "user", content: buildUserPrompt(trimmed, snippets) },
      ],
    });

    const reply =
      completion.choices[0]?.message?.content?.trim() ||
      fallbackReply;

    return {
      reply,
      intent,
      source,
      mode: "openai",
    };
  } catch {
    return {
      reply: fallbackReply,
      intent,
      source,
      mode: fallbackMode,
    };
  }
}

function resolveIntentForScope(
  classifiedIntent: ReturnType<typeof classifyIntent>,
  message: string,
  scope?: ChatScope | null,
): ReturnType<typeof classifyIntent> {
  // Academic questions always go through the no-tutoring referral path.
  if (classifiedIntent === "subject_doubt") return "subject_doubt";

  // An explicit detected intent outranks the selected UI tile.
  if (classifiedIntent !== "unknown") return classifiedIntent;

  const text = message.toLowerCase();
  if (
    scope === "curriculum" &&
    /\b(course|courses|curriculum|syllabus|unit|program|pathway|subject|semester|schedule|timetable|teacher|elective|grade\s*\d)\b/i.test(
      text,
    )
  ) {
    return "curriculum";
  }
  if (
    scope === "assignments" &&
    /\b(assignment|homework|quiz|project|lab|due|deadline|submit|submitted|pending|overdue)\b/i.test(
      text,
    )
  ) {
    return "deadline";
  }
  if (
    scope === "grades" &&
    /\b(grade|gpa|score|marks?|progress|completion|passing|failed?|points?|algebra|geometry|statistics|science|math|doing|going)\b/i.test(
      text,
    )
  ) {
    return "grades";
  }
  if (
    scope === "support" &&
    /\b(contact|advisor|support|help desk|password|login|leave|absence|fees?|transfer|change|policy|helpline|bug|safety|exam|teacher|late submission)\b/i.test(
      text,
    )
  ) {
    return /\b(contact|advisor|who|support|password|login|leave|transfer|bug|safety)\b/i.test(text)
      ? "mentor"
      : "faq";
  }
  if (scope === "course_referral") return "subject_doubt";

  return classifiedIntent;
}

function isOffTopic(message: string): boolean {
  return /\b(weather|joke|world cup|football score|cricket score|movie|recipe)\b/i.test(message);
}

function isCapabilityQuestion(message: string): boolean {
  return /\b(what should i ask|what can i ask|what can you do|how can you help|help me get started|show me examples?|what do you help with)\b/i.test(
    message,
  );
}

function buildCapabilityReply(scope?: ChatScope | null): string {
  const examples: Record<ChatScope, string[]> = {
    curriculum: [
      "What courses am I enrolled in?",
      "What is covered in Grade 7 Mathematics?",
      "Show me my course pathway.",
    ],
    assignments: [
      "What is due this week?",
      "Have I submitted my algebra assignment?",
      "How many days remain for the geometry lab?",
    ],
    grades: [
      "How am I doing in algebra?",
      "What is my GPA?",
      "Show my course progress.",
    ],
    support: [
      "Who should I contact about leave?",
      "How do I reset my password?",
      "What is the section-change process?",
    ],
    course_referral: [
      "Where is photosynthesis covered?",
      "Which course teaches equivalent fractions?",
      "Where can I learn about equations?",
    ],
  };

  if (scope) {
    return `You can ask questions like:\n\n${examples[scope].map((example) => `• ${example}`).join("\n")}`;
  }

  return [
    "I can help with curriculum and enrolled courses, assignments and deadlines, grades and progress, approved FAQs and support contacts, or finding which course covers a topic.",
    "",
    "Choose an information objective above, then ask a question in your own words.",
  ].join("\n");
}

function isVagueMessage(message: string): boolean {
  return /^(help|i have a question|something'?s wrong|something is wrong|i don'?t know|idk\b.*)$/i.test(
    message.trim(),
  );
}

function isDistressMessage(message: string): boolean {
  return /\b(stressed|stress|overwhelmed|anxious|anxiety|scared|feel stupid|feeling stupid|failing everything|can'?t cope|cannot cope|hopeless)\b/i.test(
    message,
  );
}

function detectCombinedIntents(message: string): Intent[] {
  const intents: Intent[] = [];
  const hasDeadline =
    /\b(due|deadline|assignment|homework|pending|submitted|overdue)\b/i.test(message);
  const hasGrades =
    /\b(my grade|grade wrong|grade did|gpa|score|progress|how am i doing|passing|completed|done with)\b/i.test(
      message,
    );
  const hasCurriculum =
    /\b(curriculum|syllabus|course pathway|what'?s next|what is next|comes next|next unit)\b/i.test(
      message,
    );

  if (hasDeadline) intents.push("deadline");
  if (hasGrades) intents.push("grades");
  if (hasCurriculum) intents.push("curriculum");
  return [...new Set(intents)];
}

function buildCombinedResponse(
  intents: Intent[],
  message: string,
  student?: StudentSession | null,
): ChatResponse {
  const sections: Array<{
    intent: Intent;
    snippets: ReturnType<typeof retrieveSnippets>;
    source: string | null;
    reply: string;
  }> = [];

  for (const intent of intents) {
    let contextualMessage = message;
    if (intent === "grades") {
      const deadlineSection = sections.find((section) => section.intent === "deadline");
      const moduleMatch = deadlineSection?.snippets
        .map((snippet) => snippet.body.match(/\bSSC-G\d-(?:MATH|SCI)-[A-Z0-9]+\b/)?.[0])
        .find(Boolean);
      if (moduleMatch && /\b(that class|that course)\b/i.test(message)) {
        contextualMessage = `${message} ${moduleMatch}`;
      }
    }

    const snippets = retrieveSnippets(intent, contextualMessage, { student });
    sections.push({
      intent,
      snippets,
      source: sourceLabelFor(intent, snippets),
      reply:
        snippets.length > 0
          ? mockReplyFromSnippets(intent, message, snippets)
          : UNKNOWN_FALLBACK,
    });
  }

  return {
    reply: sections
      .map((section) => `**${section.intent.replace("_", " ")}**\n${section.reply}`)
      .join("\n\n"),
    intent: intents.join("+"),
    source:
      [...new Set(sections.map((section) => section.source).filter(Boolean))].join(" + ") || null,
    mode: "mock",
  };
}
