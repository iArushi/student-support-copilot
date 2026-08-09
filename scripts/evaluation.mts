import { findStudentByCredentials } from "../src/lib/auth";
import { handleChatMessage, type ChatScope } from "../src/lib/chat";
import { parseUnderstandingJson } from "../src/lib/understand";

// Keep evaluation deterministic even if the developer has configured an API key.
delete process.env.OPENAI_API_KEY;

type EvalCase = {
  id: string;
  message: string;
  scope?: ChatScope;
  expectedIntent: string;
  expectedSource?: string | null;
  includes?: string[];
  excludes?: string[];
};

const priya = findStudentByCredentials("priya.patel@school.edu", "student123");
const neha = findStudentByCredentials("neha.desai@school.edu", "student123");

if (!priya || !neha) {
  throw new Error("Required demo students are missing");
}

const cases: EvalCase[] = [
  {
    id: "curriculum-happy",
    message: "What's in Grade 7 Mathematics?",
    expectedIntent: "curriculum",
    expectedSource: "curriculum catalog",
    includes: ["Grade 7 Mathematics", "SSC-G7-MATH-ALG"],
  },
  {
    id: "curriculum-what-is-wording",
    message: "What is the DUSD curriculum for grade 7 math?",
    scope: "curriculum",
    expectedIntent: "curriculum",
    expectedSource: "curriculum catalog",
    includes: ["Grade 7 Mathematics", "SSC-G7-MATH-ALG"],
    excludes: ["I don’t explain concepts"],
  },
  {
    id: "curriculum-enrollment",
    message: "Which courses am I enrolled in?",
    expectedIntent: "curriculum",
    expectedSource: "curriculum catalog",
    includes: ["Your enrolled courses", "SSC-G7-MATH-NUM"],
  },
  {
    id: "curriculum-missing-schedule",
    message: "Can you show me my class schedule?",
    scope: "curriculum",
    expectedIntent: "curriculum",
    expectedSource: "curriculum catalog",
    includes: ["unavailable", "LMS catalog"],
    excludes: ["Grade 3 Common Core"],
  },
  {
    id: "assignment-deadline",
    message: "What are my assignment deadlines?",
    expectedIntent: "deadline",
    expectedSource: "assignment deadlines",
    includes: ["Deadline", "SSC-G7-MATH-NUM"],
  },
  {
    id: "assignment-status-paraphrase",
    message: "Have I taken any assignments yet?",
    expectedIntent: "deadline",
    expectedSource: "assignment submissions",
    includes: ["Already taken/submitted: 3", "Still pending: 2"],
  },
  {
    id: "assignment-status-typo",
    message: "have i done nay assignments yet",
    scope: "assignments",
    expectedIntent: "deadline",
    expectedSource: "assignment submissions",
    includes: ["Your assignment activity"],
  },
  {
    id: "grades-happy",
    message: "What are my grades?",
    expectedIntent: "grades",
    expectedSource: "grades & progress",
    includes: ["Priya Patel", "Overall GPA: 3.55"],
    excludes: ["Neha Desai", "Arjun Sharma"],
  },
  {
    id: "progress-specific-course",
    message: "How is my course progress in SSC-G7-MATH-ALG?",
    scope: "grades",
    expectedIntent: "grades",
    expectedSource: "grades & progress",
    includes: ["SSC-G7-MATH-ALG", "Progress: 72%"],
    excludes: ["SSC-G7-SCI-CHEM"],
  },
  {
    id: "progress-natural-language-algebra",
    message: "How am I doing in algebra?",
    scope: "grades",
    expectedIntent: "grades",
    expectedSource: "grades & progress",
    includes: ["SSC-G7-MATH-ALG", "Progress: 72%", "Current grade: B+"],
    excludes: ["SSC-G7-MATH-NUM", "SSC-G7-MATH-GEO", "SSC-G7-MATH-STAT", "Academic overview"],
  },
  {
    id: "progress-slang-algebra",
    message: "yo hows my alg goin?",
    scope: "grades",
    expectedIntent: "grades",
    expectedSource: "grades & progress",
    includes: ["SSC-G7-MATH-ALG", "Progress: 72%"],
    excludes: ["SSC-G7-MATH-NUM", "SSC-G7-MATH-GEO", "SSC-G7-MATH-STAT"],
  },
  {
    id: "progress-natural-language-equations",
    message: "What's my progress with equations?",
    scope: "grades",
    expectedIntent: "grades",
    expectedSource: "grades & progress",
    includes: ["SSC-G7-MATH-ALG", "Progress: 72%"],
    excludes: ["SSC-G7-MATH-NUM", "SSC-G7-MATH-GEO", "SSC-G7-MATH-STAT"],
  },
  {
    id: "grade-natural-language-geometry",
    message: "Show me my geometry grade",
    scope: "grades",
    expectedIntent: "grades",
    expectedSource: "grades & progress",
    includes: ["SSC-G7-MATH-GEO", "Current grade: B"],
    excludes: ["SSC-G7-MATH-ALG", "SSC-G7-MATH-NUM", "SSC-G7-MATH-STAT"],
  },
  {
    id: "faq",
    message: "How do I change my section?",
    scope: "support",
    expectedIntent: "faq",
    expectedSource: "ops FAQ / handbook",
    includes: ["Academic Change Request"],
  },
  {
    id: "assignment-slang-homework",
    message: "did i do my hw yet",
    scope: "assignments",
    expectedIntent: "deadline",
    expectedSource: "assignment submissions",
    includes: ["Your assignment activity", "Already taken/submitted"],
  },
  {
    id: "assignment-days-remaining",
    message: "How many days left to submit the scale drawings lab?",
    scope: "assignments",
    expectedIntent: "deadline",
    expectedSource: "assignment deadlines",
    includes: ["SSC-G7-MATH-GEO", "remaining"],
    excludes: ["SSC-G7-MATH-ALG"],
  },
  {
    id: "assignment-code-switched",
    message: "assignment ka deadline kab hai",
    scope: "assignments",
    expectedIntent: "deadline",
    expectedSource: "assignment deadlines",
    includes: ["Deadline"],
  },
  {
    id: "mentor-routing",
    message: "Who should I contact about medical leave?",
    expectedIntent: "mentor",
    expectedSource: "mentor routing directory",
    includes: ["Academic Advisor", "Priya Nair"],
  },
  {
    id: "mentor-slang-contact",
    message: "who do i ping for leave",
    scope: "support",
    expectedIntent: "mentor",
    expectedSource: "mentor routing directory",
    includes: ["Academic Advisor", "Priya Nair"],
  },
  {
    id: "faq-missing-exam-policy",
    message: "what if i miss an exam",
    scope: "support",
    expectedIntent: "faq",
    expectedSource: "ops FAQ / handbook",
    includes: ["unavailable", "Student Success Desk"],
  },
  {
    id: "concept-referral-enrolled",
    message: "What does photosynthesis mean?",
    scope: "course_referral",
    expectedIntent: "subject_doubt",
    expectedSource: "course topic map",
    includes: ["SSC-G7-SCI-BIO", "You are enrolled in this course"],
    excludes: ["Photosynthesis is", "means that", "process by which"],
  },
  {
    id: "concept-reordered-phrasing",
    message: "tell me what photosynthesis is",
    scope: "course_referral",
    expectedIntent: "subject_doubt",
    expectedSource: "course topic map",
    includes: ["SSC-G7-SCI-BIO"],
    excludes: ["Photosynthesis is", "process by which"],
  },
  {
    id: "concept-referral-not-enrolled",
    message: "What is meant by equivalent fractions?",
    expectedIntent: "subject_doubt",
    expectedSource: "course topic map",
    includes: ["SSC-G3-MATH-U03", "may not be enrolled"],
    excludes: ["Equivalent fractions are"],
  },
  {
    id: "homework-solve-refusal",
    message: "Solve 2x + 3 = 7 for me",
    expectedIntent: "subject_doubt",
    expectedSource: "course topic map",
    includes: ["I don’t explain concepts"],
    excludes: ["x = 2", "subtract 3"],
  },
  {
    id: "unknown-bounded-fallback",
    message: "Can you order lunch for me?",
    expectedIntent: "unknown",
    expectedSource: null,
    includes: ["approved knowledge base", "Student Success Desk"],
    excludes: ["Overall GPA", "Your enrolled courses"],
  },
  {
    id: "off-topic-selected-scope",
    message: "what's the weather today",
    scope: "grades",
    expectedIntent: "unknown",
    expectedSource: null,
    includes: ["I can only help"],
    excludes: ["Overall GPA", "Progress:"],
  },
  {
    id: "vague-clarification",
    message: "idk what's going on with my course",
    scope: "curriculum",
    expectedIntent: "unknown",
    expectedSource: null,
    includes: ["need one more detail"],
    excludes: ["Your enrolled courses"],
  },
  {
    id: "capability-help",
    message: "what should i ask?",
    scope: "grades",
    expectedIntent: "unknown",
    expectedSource: null,
    includes: ["You can ask questions like:", "How am I doing in algebra?", "What is my GPA?"],
    excludes: ["approved knowledge base", "Student Success Desk"],
  },
  {
    id: "emotional-safety-routing",
    message: "I'm really stressed, I think I'm failing everything",
    scope: "grades",
    expectedIntent: "mentor",
    expectedSource: "mentor routing directory",
    includes: ["don’t have to handle it alone", "Counseling Center"],
    excludes: ["Overall GPA"],
  },
  {
    id: "multi-intent-deadline-progress",
    message: "What's due this week and how am I doing in that class?",
    scope: "assignments",
    expectedIntent: "deadline+grades",
    expectedSource: "assignment deadlines + grades & progress",
    includes: ["deadline", "grades", "Progress:"],
  },
  {
    id: "missing-english-grade",
    message: "whats my grade in english",
    scope: "grades",
    expectedIntent: "grades",
    expectedSource: "grades & progress",
    includes: ["English grade unavailable", "won’t substitute"],
    excludes: ["SSC-G7-MATH-ALG"],
  },
];

let passed = 0;
const failures: string[] = [];

for (const testCase of cases) {
  const result = await handleChatMessage(testCase.message, priya, testCase.scope);
  const checks: Array<[boolean, string]> = [
    [
      result.intent === testCase.expectedIntent,
      `intent expected=${testCase.expectedIntent} actual=${result.intent}`,
    ],
  ];

  if ("expectedSource" in testCase) {
    checks.push([
      result.source === testCase.expectedSource,
      `source expected=${String(testCase.expectedSource)} actual=${String(result.source)}`,
    ]);
  }

  for (const text of testCase.includes ?? []) {
    checks.push([result.reply.includes(text), `missing required text: ${text}`]);
  }
  for (const text of testCase.excludes ?? []) {
    checks.push([!result.reply.toLowerCase().includes(text.toLowerCase()), `forbidden text: ${text}`]);
  }

  const failed = checks.filter(([ok]) => !ok).map(([, reason]) => reason);
  if (failed.length === 0) {
    passed += 1;
    console.log(`PASS ${testCase.id}`);
  } else {
    failures.push(`${testCase.id}: ${failed.join("; ")}`);
    console.log(`FAIL ${testCase.id}: ${failed.join("; ")}`);
  }
}

// Privacy regression: a different logged-in student receives their own record.
const nehaResult = await handleChatMessage("What are my grades?", neha);
const privacyPass =
  nehaResult.reply.includes("Neha Desai") &&
  !nehaResult.reply.includes("Priya Patel") &&
  !nehaResult.reply.includes("Overall GPA: 3.55");

if (privacyPass) {
  passed += 1;
  console.log("PASS privacy-session-scope");
} else {
  failures.push("privacy-session-scope: another student's grade data appeared");
  console.log("FAIL privacy-session-scope");
}

const parsedUnderstanding = parseUnderstandingJson(
  JSON.stringify({
    normalized: "What is my progress in algebra?",
    intents: ["grades", "admin", "grades"],
    courseHint: "SSC-G7-MATH-ALG",
    topicHint: "algebra",
    requestType: "progress",
    confidence: 1.7,
    needsClarification: false,
    language: "English",
  }),
  "yo hows my alg goin?",
);
const structuredUnderstandingPass =
  parsedUnderstanding?.intentHints.length === 1 &&
  parsedUnderstanding.intentHints[0] === "grades" &&
  parsedUnderstanding.courseHint === "SSC-G7-MATH-ALG" &&
  parsedUnderstanding.confidence === 1;

if (structuredUnderstandingPass) {
  passed += 1;
  console.log("PASS structured-understanding-validation");
} else {
  failures.push("structured-understanding-validation: LLM JSON was not safely validated");
  console.log("FAIL structured-understanding-validation");
}

const invalidUnderstandingPass = parseUnderstandingJson("not json", "help") === null;
if (invalidUnderstandingPass) {
  passed += 1;
  console.log("PASS malformed-understanding-fallback");
} else {
  failures.push("malformed-understanding-fallback: malformed JSON was accepted");
  console.log("FAIL malformed-understanding-fallback");
}

const total = cases.length + 3;
console.log(`\nRESULT ${passed}/${total} passed`);

if (failures.length > 0) {
  console.error("\nFailures:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
}
