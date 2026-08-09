import OpenAI from "openai";
import type { Intent } from "./intent";

export type UnderstandingMode = "openai" | "local" | "original";

export type UnderstoodMessage = {
  normalized: string;
  mode: UnderstandingMode;
  intentHints: Intent[];
  courseHint: string | null;
  topicHint: string | null;
  confidence: number;
  needsClarification: boolean;
};

const ALLOWED_INTENTS = new Set<Intent>([
  "curriculum",
  "mentor",
  "faq",
  "deadline",
  "grades",
  "subject_doubt",
  "unknown",
]);

const LOCAL_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bmera grade kya hai english mein\b/gi, "what is my grade in english"],
  [/\bassignment ka deadline kab hai\b/gi, "when is the assignment deadline"],
  [/\bsir kab tak assignment submit karna hai\b/gi, "when is the assignment due"],
  [/\bsir\b/gi, ""],
  [/\bkab tak\b/gi, "when is"],
  [/\bkarna hai\b/gi, ""],
  [/\bmera\b/gi, "my"],
  [/\bkya hai\b/gi, "what is"],
  [/\byo\b/gi, ""],
  [/\bhows\b/gi, "how is"],
  [/\bgoin\b/gi, "going"],
  [/\bwats\b|\bwhats\b/gi, "what is"],
  [/\bwat\b/gi, "what"],
  [/\balg\b/gi, "algebra"],
  [/\bhw\b/gi, "homework"],
  [/\bstats\b/gi, "statistics"],
  [/\bbio\b/gi, "biology"],
  [/\bchem\b/gi, "chemistry"],
  [/\bpls\b|\bplz\b/gi, "please"],
  [/\bping\b/gi, "contact"],
  [/\bgradez\b/gi, "grades"],
  [/\bprogres\b/gi, "progress"],
  [/\bassignmnts?\b/gi, "assignments"],
];

function normalizeLocally(message: string): string {
  let normalized = message;
  for (const [pattern, replacement] of LOCAL_REPLACEMENTS) {
    normalized = normalized.replace(pattern, replacement);
  }

  normalized = normalized.replace(
    /\btell me what\s+(.+?)\s+is\b/i,
    (_match, topic: string) => `what is ${topic}`,
  );

  return normalized.replace(/\s+/g, " ").trim();
}

function localUnderstanding(original: string, local: string): UnderstoodMessage {
  return {
    normalized: local || original,
    mode: local !== original ? "local" : "original",
    intentHints: [],
    courseHint: null,
    topicHint: null,
    confidence: 0,
    needsClarification: false,
  };
}

function cleanOptionalString(value: unknown, maxLength = 100): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > maxLength) return null;
  return cleaned;
}

export function parseUnderstandingJson(
  content: string,
  original: string,
): UnderstoodMessage | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const normalized = cleanOptionalString(
      parsed.normalized,
      Math.max(500, original.length * 3),
    );
    if (!normalized) return null;

    const intentHints = Array.isArray(parsed.intents)
      ? parsed.intents.filter(
          (intent): intent is Intent =>
            typeof intent === "string" && ALLOWED_INTENTS.has(intent as Intent),
        )
      : [];
    const rawConfidence =
      typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
        ? parsed.confidence
        : 0;

    return {
      normalized,
      mode: "openai",
      intentHints: [...new Set(intentHints)],
      courseHint: cleanOptionalString(parsed.courseHint),
      topicHint: cleanOptionalString(parsed.topicHint),
      confidence: Math.max(0, Math.min(1, rawConfidence)),
      needsClarification: parsed.needsClarification === true,
    };
  } catch {
    return null;
  }
}

/**
 * Converts slang, typos, and conversational phrasing into a clearer query.
 * The result is used only for routing and retrieval, never as an answer.
 */
export async function understandStudentMessage(message: string): Promise<UnderstoodMessage> {
  const original = message.trim();
  const local = normalizeLocally(original);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return localUnderstanding(original, local);
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0,
      max_tokens: 220,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You are a language-understanding layer for a student LMS assistant.",
            "Interpret slang, typos, fragments, and code-switched language without answering the question.",
            "Return one JSON object with exactly these fields:",
            '"normalized" (clear English rewrite),',
            '"intents" (array containing only curriculum, mentor, faq, deadline, grades, subject_doubt, or unknown),',
            '"courseHint" (course code/name/subject or null),',
            '"topicHint" (academic topic or null),',
            '"confidence" (number from 0 to 1),',
            '"needsClarification" (boolean).',
            "Preserve course codes exactly. Do not invent course codes or facts.",
            "Concept explanations and homework-solving requests must include subject_doubt.",
          ].join(" "),
        },
        { role: "user", content: local || original },
      ],
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return localUnderstanding(original, local);

    return parseUnderstandingJson(content, original) ?? localUnderstanding(original, local);
  } catch {
    return localUnderstanding(original, local);
  }
}
