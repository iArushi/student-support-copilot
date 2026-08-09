export type Intent =
  | "curriculum"
  | "mentor"
  | "faq"
  | "deadline"
  | "grades"
  | "subject_doubt"
  | "unknown";

/** Ops / deadline asks that look like "what is" but are NOT concept tutoring. */
const OPS_WHAT_IS =
  /\b(deadline|due date|due when|when is .+ due|assignments?|submission|quiz date|lab due)\b/i;

/** Concept / terminology asks — refer to a course module, never teach. */
const CONCEPT_ASK =
  /\b(what is|what's|whats|what are|what does|what do|meant by|meaning of|define|definition of|explain|solve|derive|prove|calculate|compute|teach me|write code|answer this|tutoring|help me understand|how does .+ work|terminology|term mean)\b/i;

const CURRICULUM_STRUCTURE =
  /\b(curriculum|syllabus|semester|unit|pathway|program|course list|what('s| is) in (semester|unit|grade)|modules in|specialization track|credits|capstone|requirements|my courses|enrolled|grade\s*[378]|common core|ccss)\b/i;

const MENTOR_PATTERNS: RegExp[] = [
  /\b(who (do i|should i)|which mentor|contact|talk to|reach out|speak to|advisor|mentor)\b/i,
  /\b(leave|absence|attendance|revaluation|password reset|internship|career|placement|counseling)\b/i,
];

const FAQ_PATTERNS: RegExp[] = [
  /\b(office hours|section change|id card|library|fees|tuition|help desk|how do i change|process for|faq)\b/i,
];

const DEADLINE_PATTERNS: RegExp[] = [
  /\b(deadline|due date|dues?\b|when is .+ due|assignments?|homeworks?|quiz(zes)?|submission|upcoming work|taken any assignments?|submitted any|have i (taken|done|submitted)|did i (take|submit|do)|any assignments? yet|my assignments?)\b/i,
];

const GRADES_PATTERNS: RegExp[] = [
  /\b(my grades?|my gpa|my score|my marks|how am i doing|my progress|course progress|completion percent|percent complete|am i passing|current grade|gradebook)\b/i,
];

/**
 * Intent routing for the orchestrator.
 * subject_doubt = concept/term questions → course referral only (no tutoring).
 */
export function classifyIntent(message: string): Intent {
  const text = message.trim();
  if (!text) return "unknown";

  const asksForPerson = /\b(who|mentor|contact|talk to|advisor|reach)\b/i.test(text);
  const gradeDispute =
    /\b(grade dispute|dispute my grade|revaluation|recheck)\b/i.test(text) && asksForPerson;

  // Explicit assignment / homework status questions (incl. typos like "nay")
  if (isAssignmentStatusAsk(text)) {
    return "deadline";
  }

  // Grade dispute → mentor; otherwise grades/progress first
  if (!gradeDispute && score(text, GRADES_PATTERNS) > 0) {
    return "grades";
  }

  if (gradeDispute) {
    return "mentor";
  }

  // Deadlines / assignments before generic "what is"
  if (score(text, DEADLINE_PATTERNS) > 0 || OPS_WHAT_IS.test(text)) {
    if (
      CONCEPT_ASK.test(text) &&
      !/\b(deadline|due|assignments?|quiz|submission|homework)\b/i.test(text)
    ) {
      // fall through to concept handling
    } else if (
      /\b(deadline|due|assignments?|quiz|submission|upcoming|homework)\b/i.test(text) ||
      OPS_WHAT_IS.test(text)
    ) {
      return "deadline";
    }
  }

  // Structure questions about the program stay on curriculum intent
  if (CURRICULUM_STRUCTURE.test(text)) {
    return "curriculum";
  }

  // "what is X" / explain X → topic→course referral (unless asking who to contact)
  if (isPureConceptAsk(text) && !asksForPerson) {
    if (
      /\bwhat('s| is| are) in\b/i.test(text) &&
      /\b(semester|unit|program|curriculum|pathway|grade\s*[378])\b/i.test(text)
    ) {
      return "curriculum";
    }
    if (/\b(my grades?|my progress|my gpa|course progress)\b/i.test(text)) {
      return "grades";
    }
    return "subject_doubt";
  }

  const scores = {
    curriculum: score(text, [CURRICULUM_STRUCTURE]),
    grades: score(text, GRADES_PATTERNS),
    deadline: score(text, DEADLINE_PATTERNS),
    mentor: score(text, MENTOR_PATTERNS),
    faq: score(text, FAQ_PATTERNS),
  } as const;

  const ranked = (Object.entries(scores) as [keyof typeof scores, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const best = ranked[0];
  if (!best || best[1] === 0) {
    if (isPureConceptAsk(text) && !asksForPerson) return "subject_doubt";
    return "unknown";
  }
  return best[0];
}

function isAssignmentStatusAsk(text: string): boolean {
  return (
    /\bassignments?\b/i.test(text) ||
    /\bhomeworks?\b/i.test(text) ||
    /\bquizzes\b/i.test(text)
  ) && (
    /\b(taken|submitted|done|completed|started|attempted|any .+ yet|have i|did i|my)\b/i.test(text) ||
    /\byet\b/i.test(text)
  );
}

function isPureConceptAsk(text: string): boolean {
  if (!CONCEPT_ASK.test(text)) return false;
  if (/\b(deadline|due date|assignment deadline|when .+ due|assignments?)\b/i.test(text)) {
    return false;
  }
  if (/\b(my grades?|my progress|my gpa|course progress)\b/i.test(text)) return false;
  return true;
}

function score(text: string, patterns: RegExp[]): number {
  return patterns.reduce((n, re) => (re.test(text) ? n + 1 : n), 0);
}
