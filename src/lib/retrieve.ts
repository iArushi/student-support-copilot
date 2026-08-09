import curriculum from "../../data/curriculum.json";
import mentors from "../../data/mentors.json";
import faq from "../../data/faq.json";
import assignmentsData from "../../data/assignments.json";
import gradesData from "../../data/grades.json";
import type { Intent } from "./intent";
import type { StudentSession } from "./student-types";

export type RetrievedSnippet = {
  id: string;
  title: string;
  body: string;
  sourceLabel: string;
};

export type RetrieveContext = {
  student?: StudentSession | null;
};

type Scored = RetrievedSnippet & { score: number };

const STOPWORDS = new Set([
  "and",
  "are",
  "class",
  "doing",
  "from",
  "have",
  "how",
  "that",
  "the",
  "this",
  "was",
  "week",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "with",
  "your",
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

function overlapScore(query: string, haystack: string): number {
  const q = new Set(tokens(query));
  const h = tokens(haystack);
  if (q.size === 0) return 0;
  let hits = 0;
  for (const t of h) {
    if (q.has(t)) hits += 1;
  }
  return hits;
}

function takeTop(scored: Scored[], k: number): RetrievedSnippet[] {
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ score: _score, ...rest }) => rest);
}

const MODULE_ALIASES: Record<string, string[]> = {
  "SSC-G7-MATH-NUM": ["number", "numbers", "ratio", "rate", "proportion"],
  "SSC-G7-MATH-ALG": ["algebra", "algebraic", "expression", "equation", "inequality", "variable"],
  "SSC-G7-MATH-GEO": ["geometry", "angle", "triangle", "circle", "scale drawing"],
  "SSC-G7-MATH-STAT": ["statistics", "stats", "probability", "sampling", "data"],
  "SSC-G7-SCI-BIO": ["biology", "bio", "cell", "photosynthesis", "ecosystem"],
  "SSC-G7-SCI-CHEM": ["chemistry", "chem", "chemical", "matter", "atom"],
  "SSC-G7-SCI-PHY": ["physics", "force", "motion", "energy", "machine"],
};

function normalizedPhrase(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsPhrase(message: string, phrase: string): boolean {
  const normalizedMessage = ` ${normalizedPhrase(message)} `;
  const normalizedTarget = normalizedPhrase(phrase);
  return normalizedTarget.length > 0 && normalizedMessage.includes(` ${normalizedTarget} `);
}

/** Resolve a course/module from a code, title, topic, or common human-language alias. */
function extractModuleCode(message: string, preferredCodes: Set<string> = new Set()): string | null {
  const modules: Array<{
    code: string;
    title: string;
    description: string;
    topics: string[];
  }> = [];
  for (const sem of curriculum.semesters) {
    for (const mod of sem.modules) {
      modules.push({
        code: mod.code.toUpperCase(),
        title: mod.title,
        description: mod.description,
        topics: mod.topics ?? [],
      });
    }
  }

  const upper = message.toUpperCase();
  // Longer codes first if future catalog codes share a prefix.
  modules.sort((a, b) => b.code.length - a.code.length);
  for (const module of modules) {
    if (upper.includes(module.code)) return module.code;
  }

  let best: { code: string; score: number } | null = null;
  for (const module of modules) {
    let score = 0;
    const aliases = [...(MODULE_ALIASES[module.code] ?? []), ...module.topics];

    for (const alias of aliases) {
      if (containsPhrase(message, alias)) {
        score += normalizedPhrase(alias).split(" ").length > 1 ? 8 : 5;
      }
    }

    const titleOverlap = overlapScore(message, module.title);
    const descriptionOverlap = overlapScore(message, module.description);
    score += titleOverlap * 3 + descriptionOverlap;
    if (score > 0 && preferredCodes.has(module.code)) score += 4;

    if (!best || score > best.score) best = { code: module.code, score };
  }

  return best && best.score >= 4 ? best.code : null;
}

function formatDue(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return iso;
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function filterDueWindow<T extends { dueAt: string }>(rows: T[], message: string): T[] {
  const now = new Date();
  const today = startOfDay(now);
  const lower = message.toLowerCase();

  if (/\btomorrow\b/i.test(lower)) {
    const start = new Date(today);
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return rows.filter((row) => {
      const due = new Date(row.dueAt);
      return due >= start && due < end;
    });
  }

  if (/\btoday\b/i.test(lower)) {
    const end = new Date(today);
    end.setDate(end.getDate() + 1);
    return rows.filter((row) => {
      const due = new Date(row.dueAt);
      return due >= today && due < end;
    });
  }

  if (/\b(this week|next 7 days)\b/i.test(lower)) {
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    return rows.filter((row) => {
      const due = new Date(row.dueAt);
      return due >= now && due <= end;
    });
  }

  if (/\b(this month)\b/i.test(lower)) {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return rows.filter((row) => {
      const due = new Date(row.dueAt);
      return due >= now && due < end;
    });
  }

  return rows;
}

function dueDistance(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(Math.abs(diff) / 86_400_000);
  if (diff < 0) return `Timing: ${days} day${days === 1 ? "" : "s"} overdue`;
  if (days === 0) return "Timing: due today";
  return `Timing: ${days} day${days === 1 ? "" : "s"} remaining`;
}

export function retrieveSnippets(
  intent: Intent,
  message: string,
  ctx: RetrieveContext = {},
): RetrievedSnippet[] {
  if (intent === "subject_doubt") return retrieveTopicCourseReferral(message, ctx.student);
  if (intent === "deadline") return retrieveDeadlines(message, ctx.student);
  if (intent === "grades") return retrieveGradesAndProgress(message, ctx.student);
  if (intent === "curriculum") return retrieveCurriculum(message, ctx.student);
  if (intent === "mentor") return retrieveMentors(message);
  if (intent === "faq") return retrieveFaq(message);

  // Unknown requests must not blend unrelated student data into a confident answer.
  return [];
}

/**
 * Map a concept/term question to the course module that covers it.
 * Prefer modules the logged-in student is enrolled in.
 * Never returns teaching content — only where to study it.
 */
function retrieveTopicCourseReferral(
  message: string,
  student?: StudentSession | null,
): RetrievedSnippet[] {
  const lower = message.toLowerCase();
  // Strip question boilerplate so "what does X mean" doesn't match topic "mean"
  const topical = lower
    .replace(
      /\b(what is|what's|whats|what are|what does|what do|meant by|meaning of|define|definition of|explain|tell me|help me understand|how does|terminology|term)\b/gi,
      " ",
    )
    .replace(/\b(mean|means|meaning)\b/gi, " ")
    .replace(/[?.,!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const enrolled = new Set(student?.enrolledModuleCodes ?? []);
  const scored: Scored[] = [];

  for (const sem of curriculum.semesters) {
    for (const mod of sem.modules) {
      const topics = mod.topics ?? [];
      let score = 0;
      const matched: string[] = [];

      for (const topic of topics) {
        const t = topic.toLowerCase();
        if (topical.includes(t) || lower.includes(t)) {
          // Prefer matches in the stripped topical phrase
          const boost = topical.includes(t) ? 14 : 8;
          score += boost + t.split(/\s+/).length;
          matched.push(topic);
        } else {
          const part = overlapScore(topical || message, t);
          if (part >= 2) {
            score += part * 3;
            matched.push(topic);
          }
        }
      }

      score += overlapScore(topical || message, `${mod.code} ${mod.title}`);
      if (enrolled.size > 0 && enrolled.has(mod.code)) {
        score += 5;
      }

      if (score > 0) {
        const topicList = (matched.length > 0 ? [...new Set(matched)] : topics.slice(0, 4)).join(
          ", ",
        );
        const enrolledNote =
          enrolled.size > 0
            ? enrolled.has(mod.code)
              ? "You are enrolled in this course."
              : "You may not be enrolled in this course — check your LMS course list."
            : "Open this course in your LMS if it appears on your roster.";

        scored.push({
          id: `${sem.id}-${mod.code}`,
          title: `${mod.code} — ${mod.title}`,
          body: [
            `Program: ${curriculum.program.name}`,
            `Catalog block: ${sem.name} (${sem.theme})`,
            `Course: ${mod.code} ${mod.title} (${mod.credits} credits)`,
            `Related topics in this course: ${topicList}`,
            `Course focus: ${mod.description}`,
            enrolledNote,
            `Action: Open ${mod.code} in your LMS to resolve this query. This assistant does not explain the concept or terminology.`,
          ].join("\n"),
          sourceLabel: "course topic map",
          score,
        });
      }
    }
  }

  const top = takeTop(scored, 2);
  if (top.length > 0) return top;

  return [
    {
      id: "topic-not-mapped",
      title: "No matching course topic found",
      body: [
        `I could not match that term to a mapped topic in ${curriculum.program.name}.`,
        "I do not explain academic concepts here.",
        "Browse your enrolled courses in the LMS, or ask your instructor / Academic Advisor which module covers it.",
        "Student Success Desk: success@campus.edu",
      ].join(" "),
      sourceLabel: "course topic map",
    },
  ];
}

function retrieveGradesAndProgress(
  message: string,
  student?: StudentSession | null,
): RetrievedSnippet[] {
  if (!student) {
    return [
      {
        id: "grades-need-login",
        title: "Sign in required",
        body: "Grades and progress are only available after you sign in.",
        sourceLabel: "grades & progress",
      },
    ];
  }

  const record = gradesData.records.find((r) => r.studentId === student.id);
  if (!record) {
    return [
      {
        id: "grades-missing",
        title: "No grade record",
        body: "I don’t have a gradebook snapshot for your account yet. Check Grades in the LMS or ask your instructor.",
        sourceLabel: "grades & progress",
      },
    ];
  }

  const lower = message.toLowerCase();
  const unavailableReason =
    /\b(last quiz|last test|class rank|class average|compared to the class|points? do i need|grade improve|grade drop|improve this term|on track to pass)\b/i.exec(
      lower,
    )?.[0] ?? null;
  if (unavailableReason) {
    return [
      {
        id: "grades-detail-unavailable",
        title: "Requested grade detail unavailable",
        body: `The demo grade record does not include ${unavailableReason}. Open the LMS gradebook for attempt history, grading thresholds, and instructor feedback.`,
        sourceLabel: "grades & progress",
      },
    ];
  }

  if (/\benglish|eng7\b/i.test(lower)) {
    return [
      {
        id: "grades-course-unavailable-english",
        title: "English grade unavailable",
        body: `${student.name} does not have an English course in the current demo grade record. I won’t substitute grades from another course.`,
        sourceLabel: "grades & progress",
      },
    ];
  }

  const moduleCode = extractModuleCode(
    message,
    new Set(record.courses.map((course) => course.moduleCode.toUpperCase())),
  );
  let courses = moduleCode
    ? record.courses.filter((c) => c.moduleCode.toUpperCase() === moduleCode)
    : record.courses;
  if (!moduleCode && /\bscience\b/i.test(lower)) {
    courses = record.courses.filter((course) => course.moduleCode.includes("-SCI-"));
  } else if (!moduleCode && /\bmath|mathematics\b/i.test(lower)) {
    courses = record.courses.filter((course) => course.moduleCode.includes("-MATH-"));
  }

  const wantsProgress = /\bprogress|completion|how far|percent|how am i doing\b/i.test(message);

  const snippets: RetrievedSnippet[] = [
    {
      id: "overview",
      title: "Academic overview",
      body: [
        `Student: ${student.name}`,
        `Overall GPA: ${record.overallGpa}`,
        `Standing: ${record.standing}`,
        `Courses on record: ${record.courses.length}`,
      ].join("\n"),
      sourceLabel: "grades & progress",
    },
  ];

  if (moduleCode && courses.length === 0) {
    return [
      {
        id: `grades-unavailable-${moduleCode}`,
        title: `${moduleCode} grade & progress unavailable`,
        body: `I matched your question to ${moduleCode}, but that course is not present in ${student.name}’s grade record. Check your enrolled courses or ask your instructor.`,
        sourceLabel: "grades & progress",
      },
    ];
  }

  const courseRows = courses.map((c) => {
    const scoreLine =
      c.scorePercent == null ? "Score: not posted yet" : `Score: ${c.scorePercent}%`;
    return {
      id: c.moduleCode,
      title: `${c.moduleCode} grade & progress`,
      body: [
        `Course: ${c.moduleCode} — ${c.moduleTitle}`,
        `Status: ${c.status}`,
        `Progress: ${c.progressPercent}% complete`,
        `Current grade: ${c.currentGrade}`,
        scoreLine,
        `Last activity: ${c.lastActivity}`,
        wantsProgress
          ? "Open the course in the LMS for lesson-level progress detail."
          : "Open Grades in the LMS for attempt-level breakdown.",
      ].join("\n"),
      sourceLabel: "grades & progress",
    };
  });

  if (moduleCode && courseRows.length > 0) {
    return courseRows;
  }

  return [...snippets, ...courseRows.slice(0, 4)];
}

function retrieveDeadlines(
  message: string,
  student?: StudentSession | null,
): RetrievedSnippet[] {
  const enrolled = new Set(student?.enrolledModuleCodes ?? []);
  const lower = message.toLowerCase();
  const moduleCode = extractModuleCode(
    message,
    new Set((student?.enrolledModuleCodes ?? []).map((code) => code.toUpperCase())),
  );
  const statusAsk =
    /\b(taken|submitted|turned in|done|completed|started|attempted|pending|graded|any .+ yet|have i|did i|yet)\b/i.test(
      lower,
    );

  type AssignmentRow = (typeof assignmentsData.assignments)[number];
  type Submission = {
    status: string;
    submittedAt: string | null;
    scorePercent: number | null;
  };

  let relevant = assignmentsData.assignments.filter((a) => {
    if (enrolled.size === 0) return true;
    return enrolled.has(a.moduleCode);
  });

  if (moduleCode) {
    relevant = relevant.filter((assignment) => assignment.moduleCode.toUpperCase() === moduleCode);
  }

  function submissionFor(a: AssignmentRow): Submission | null {
    if (!student) return null;
    const map = a.submissions as Record<string, Submission> | undefined;
    if (!map) return null;
    return map[student.id] ?? null;
  }

  function formatStatus(sub: Submission | null): string {
    if (!sub || sub.status === "not_assigned") return "Status: not on your roster for this item";
    if (sub.status === "submitted") {
      const when = sub.submittedAt ? formatDue(sub.submittedAt) : "submitted";
      const score =
        sub.scorePercent == null ? "score pending" : `score ${sub.scorePercent}%`;
      return `Status: submitted (${when}, ${score})`;
    }
    if (sub.status === "not_started") return "Status: assigned — not submitted yet";
    return `Status: ${sub.status}`;
  }

  if (/\bdropped|drop course\b/i.test(lower)) {
    return [
      {
        id: "dropped-course-assignments",
        title: "Dropped-course assignments unavailable",
        body: "Assignments are limited to your current enrollment record. Open your LMS enrollment history or contact the Program Coordinator for a dropped course.",
        sourceLabel: "assignment deadlines",
      },
    ];
  }

  relevant = filterDueWindow(relevant, message);
  if (/\boverdue|late right now\b/i.test(lower)) {
    relevant = relevant.filter((assignment) => {
      const submission = submissionFor(assignment);
      return new Date(assignment.dueAt).getTime() < Date.now() && submission?.status !== "submitted";
    });
  }

  if (relevant.length === 0) {
    return [
      {
        id: "no-matching-deadlines",
        title: "No matching assignments found",
        body: "I don’t see an assignment matching that course or time window in your current roster. Check the LMS Assignments page or ask your instructor.",
        sourceLabel: "assignment deadlines",
      },
    ];
  }

  if (statusAsk && student) {
    let assigned = relevant.filter((a) => {
      const sub = submissionFor(a);
      return sub && sub.status !== "not_assigned";
    });
    if (/\bpending|not submitted|still due\b/i.test(lower)) {
      assigned = assigned.filter((a) => submissionFor(a)?.status === "not_started");
    } else if (/\bsubmitted|turned in|did i do|graded\b/i.test(lower)) {
      assigned = assigned.filter((a) => submissionFor(a)?.status === "submitted");
    }
    const submitted = assigned.filter((a) => submissionFor(a)?.status === "submitted");
    const pending = assigned.filter((a) => submissionFor(a)?.status === "not_started");

    const summary: RetrievedSnippet = {
      id: "assignment-status-summary",
      title: "Your assignment activity",
      body: [
        `Student: ${student.name}`,
        `Assigned to you: ${assigned.length}`,
        `Already taken/submitted: ${submitted.length}`,
        `Still pending: ${pending.length}`,
        submitted.length > 0
          ? "Yes — you have already taken/submitted some assignments (listed below)."
          : "You have not submitted any assignments yet (or none are marked submitted in the demo gradebook).",
      ].join("\n"),
      sourceLabel: "assignment submissions",
    };

    const rows = [...submitted, ...pending].map((a) => {
      const sub = submissionFor(a);
      return {
        id: a.id,
        title: `${a.title} (${a.moduleCode})`,
        body: [
          `Course: ${a.moduleCode} — ${a.moduleTitle}`,
          `Assignment: ${a.title}`,
          `Type: ${a.type}`,
          `Deadline: ${formatDue(a.dueAt)} (IST)`,
          dueDistance(a.dueAt),
          formatStatus(sub),
          a.notes,
        ].join("\n"),
        sourceLabel: "assignment submissions",
      };
    });

    return [summary, ...rows.slice(0, 6)];
  }

  const scored: Scored[] = relevant.map((a) => {
    const sub = submissionFor(a);
    let score =
      overlapScore(message, `${a.title} ${a.moduleCode} ${a.moduleTitle} ${a.type} ${a.notes}`) + 1;
    if (moduleCode && a.moduleCode.toUpperCase() === moduleCode) score += 8;
    if (lower.includes("upcoming") || lower.includes("deadline") || lower.includes("due")) {
      score += 2;
    }
    return {
      id: a.id,
      title: `${a.title} (${a.moduleCode})`,
      body: [
        `Course: ${a.moduleCode} — ${a.moduleTitle}`,
        `Assignment: ${a.title}`,
        `Type: ${a.type}`,
        `Deadline: ${formatDue(a.dueAt)} (IST)`,
        dueDistance(a.dueAt),
        formatStatus(sub),
        a.notes,
      ].join("\n"),
      sourceLabel: "assignment deadlines",
      score,
    };
  });

  const top = takeTop(scored, 5);
  if (top.length > 0) {
    const sortedByDate = [...relevant]
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
      .slice(0, 5)
      .map((a) => ({
        id: a.id,
        title: `${a.title} (${a.moduleCode})`,
        body: [
          `Course: ${a.moduleCode} — ${a.moduleTitle}`,
          `Assignment: ${a.title}`,
          `Type: ${a.type}`,
          `Deadline: ${formatDue(a.dueAt)} (IST)`,
          dueDistance(a.dueAt),
          formatStatus(submissionFor(a)),
          a.notes,
        ].join("\n"),
        sourceLabel: "assignment deadlines",
      }));

    if (moduleCode || scored.some((s) => s.score > 5)) {
      return top.slice(0, 3);
    }
    return sortedByDate;
  }

  return [
    {
      id: "no-deadlines",
      title: "No assignments found",
      body: "I don’t see assignments for your enrolled courses. Check the LMS Assignments tab or ask your instructor.",
      sourceLabel: "assignment deadlines",
    },
  ];
}

function retrieveCurriculum(
  message: string,
  student?: StudentSession | null,
): RetrievedSnippet[] {
  const scored: Scored[] = [];
  const enrolled = new Set(student?.enrolledModuleCodes ?? []);
  const lower = message.toLowerCase();

  const unavailableRequest =
    /\b(class schedule|timetable|which teacher|who teaches|prerequisite|before chemistry|elective|skip a unit|grade 8|coding course|courses left)\b/i.exec(
      lower,
    )?.[0] ?? null;
  if (unavailableRequest) {
    return [
      {
        id: "curriculum-detail-unavailable",
        title: "Requested curriculum detail unavailable",
        body: `The approved demo catalog does not include ${unavailableRequest}. Check the LMS catalog or ask the Program Coordinator; I won’t infer it from unrelated course data.`,
        sourceLabel: "curriculum catalog",
      },
    ];
  }

  if (/\bhow many courses\b/i.test(lower) && student) {
    return [
      {
        id: "enrollment-count",
        title: "Your current course count",
        body: [
          `You are enrolled in ${student.enrolledModuleCodes.length} modules in the current demo record.`,
          `Module codes: ${student.enrolledModuleCodes.join(", ")}.`,
        ].join("\n"),
        sourceLabel: "curriculum catalog",
      },
    ];
  }

  scored.push({
    id: "program",
    title: curriculum.program.name,
    body: `${curriculum.program.summary} Duration: ${curriculum.program.duration}. Pathway: ${curriculum.program.pathway}. Requirements: ${curriculum.requirements.join(" ")}`,
    sourceLabel: "curriculum catalog",
    score:
      overlapScore(
        message,
        `${curriculum.program.name} ${curriculum.program.summary} pathway program curriculum`,
      ) + 1,
  });

  if (enrolled.size > 0) {
    const lines: string[] = [];
    for (const sem of curriculum.semesters) {
      for (const mod of sem.modules) {
        if (enrolled.has(mod.code)) {
          lines.push(`${sem.name}: ${mod.code} ${mod.title} (${mod.credits} credits)`);
        }
      }
    }
    scored.push({
      id: "my-enrollments",
      title: "Your enrolled courses",
      body: lines.join("\n") || "No enrollments on file.",
      sourceLabel: "curriculum catalog",
      score: /\b(my|enrolled|courses)\b/i.test(message) ? 12 : 3,
    });
  }

  const semMatch = message.match(/(?:semester|unit)\s*([1-5])/i);
  const gradeMatch = message.match(/grade\s*([378])/i);

  for (const sem of curriculum.semesters) {
    const moduleLines = sem.modules
      .map((m) => `${m.code} ${m.title} (${m.credits} credits): ${m.description}`)
      .join("\n");
    const body = `${sem.name} — ${sem.theme}\n${moduleLines}`;
    let score = overlapScore(message, body + " " + sem.name);
    if (semMatch && (sem.name.toLowerCase().includes(`unit ${semMatch[1]}`) || sem.id.includes(semMatch[1]))) {
      score += 8;
    }
    if (gradeMatch) {
      if (sem.name.toLowerCase().includes(`grade ${gradeMatch[1]}`)) score += 10;
    }
    if (/\bcommon core|ccss|fractions|multiplication\b/i.test(message) && sem.id === "g3-math") {
      score += 6;
    }
    if (/\bgrade\s*7\s*math|algebra|geometry\b/i.test(message) && sem.id === "g7-math") {
      score += 6;
    }
    if (/\bscience|photosynthesis|cells\b/i.test(message) && sem.id === "g7-sci") {
      score += 6;
    }
    scored.push({
      id: sem.id,
      title: sem.name,
      body,
      sourceLabel: "curriculum catalog",
      score,
    });
  }

  for (const p of curriculum.pathways) {
    scored.push({
      id: p.id,
      title: p.name,
      body: `Starts after ${p.startsAfter}. Focus: ${p.focus}`,
      sourceLabel: "curriculum catalog",
      score: overlapScore(message, `${p.name} ${p.focus} track specialization pathway`),
    });
  }

  const top = takeTop(scored, 3);
  if (top.length > 0) return top;
  return scored.slice(0, 2).map(({ score: _s, ...rest }) => rest);
}

function retrieveMentors(message: string): RetrievedSnippet[] {
  const lower = message.toLowerCase();

  if (/\bfees?|tuition|payment\b/i.test(lower)) {
    const finance = faq.items.find((item) => item.id === "faq-fees");
    if (finance) {
      return [
        {
          id: finance.id,
          title: "Finance Office",
          body: `${finance.answer} (${finance.source})`,
          sourceLabel: "ops FAQ / handbook",
        },
      ];
    }
  }

  if (/\bsafety concern|unsafe|harassment|threat\b/i.test(lower)) {
    return [
      {
        id: "safety-escalation",
        title: "Human support required",
        body: "The demo directory does not contain a dedicated safety office contact. Contact the Student Success Desk now at success@campus.edu or visit Campus Hub so a staff member can route this safely.",
        sourceLabel: "mentor routing directory",
      },
    ];
  }

  const scored: Scored[] = mentors.routes.map((route) => {
    const topicHay = route.topics.join(" ");
    let score =
      overlapScore(message, `${topicHay} ${route.role} ${route.notes}`) +
      route.topics.reduce((n, t) => (message.toLowerCase().includes(t) ? n + 3 : n), 0);
    if (route.id === "tech" && /\bbug|platform|technical issue\b/i.test(lower)) score += 8;
    return {
      id: route.id,
      title: `${route.role} — ${route.name}`,
      body: `Topics: ${route.topics.join(", ")}. Contact: ${route.channel}. Notes: ${route.notes}`,
      sourceLabel: "mentor routing directory",
      score,
    };
  });

  const top = takeTop(scored, 2);
  if (top.length === 0) {
    return [
      {
        id: "default-desk",
        title: mentors.defaultDesk.role,
        body: `${mentors.defaultDesk.name}. Contact: ${mentors.defaultDesk.channel}. ${mentors.defaultDesk.whenToUse}`,
        sourceLabel: "mentor routing directory",
      },
    ];
  }
  return top;
}

function retrieveFaq(message: string): RetrievedSnippet[] {
  const unsupportedPolicy =
    /\b(miss an exam|missed exam|switch teachers?|late submission policy|helpline number)\b/i.exec(
      message,
    )?.[0] ?? null;
  if (unsupportedPolicy) {
    return [
      {
        id: "faq-policy-unavailable",
        title: "Policy information unavailable",
        body: `That policy is unavailable in the approved demo FAQ; it does not include ${unsupportedPolicy}. Contact the Student Success Desk at success@campus.edu for the authoritative process.`,
        sourceLabel: "ops FAQ / handbook",
      },
    ];
  }

  const scored: Scored[] = faq.items.map((item) => {
    const hay = `${item.questions.join(" ")} ${item.answer}`;
    const score =
      overlapScore(message, hay) +
      item.questions.reduce(
        (n, q) => (message.toLowerCase().includes(q.toLowerCase()) ? n + 4 : n),
        0,
      );
    return {
      id: item.id,
      title: item.questions[0] ?? item.id,
      body: `${item.answer} (${item.source})`,
      sourceLabel: "ops FAQ / handbook",
      score,
    };
  });

  return takeTop(scored, 3);
}

export function sourceLabelFor(_intent: Intent, snippets: RetrievedSnippet[]): string | null {
  if (snippets.length === 0) return null;
  return [...new Set(snippets.map((s) => s.sourceLabel))].join(", ");
}
