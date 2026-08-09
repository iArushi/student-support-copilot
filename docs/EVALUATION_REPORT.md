# Student Support Copilot — Prototype Evaluation Report

**Evaluation date:** 8 August 2026  
**Mode:** deterministic fallback and retrieval with OpenAI disabled for reproducibility; structured
LLM-output validation tested using representative JSON fixtures  
**Primary demo persona:** Priya Patel

## Result

**34 / 34 automated product-policy cases passed.**

```text
PASS curriculum-happy
PASS curriculum-what-is-wording
PASS curriculum-enrollment
PASS curriculum-missing-schedule
PASS assignment-deadline
PASS assignment-status-paraphrase
PASS assignment-status-typo
PASS grades-happy
PASS progress-specific-course
PASS progress-natural-language-algebra
PASS progress-slang-algebra
PASS progress-natural-language-equations
PASS grade-natural-language-geometry
PASS faq
PASS assignment-slang-homework
PASS assignment-days-remaining
PASS assignment-code-switched
PASS mentor-routing
PASS mentor-slang-contact
PASS faq-missing-exam-policy
PASS concept-referral-enrolled
PASS concept-reordered-phrasing
PASS concept-referral-not-enrolled
PASS homework-solve-refusal
PASS unknown-bounded-fallback
PASS off-topic-selected-scope
PASS vague-clarification
PASS capability-help
PASS emotional-safety-routing
PASS multi-intent-deadline-progress
PASS missing-english-grade
PASS privacy-session-scope
PASS structured-understanding-validation
PASS malformed-understanding-fallback

RESULT 34/34 passed
```

Anonymous API verification:

```text
POST /api/chat without session
ANON_STATUS=401
```

## Coverage

| Category | Evidence |
|----------|----------|
| Curriculum | General catalog and own-enrollment questions |
| Assignments | Deadline, submission status, paraphrase, and typo |
| Grades/progress | Own overview, specific course, slang, aliases, and unavailable-course handling |
| FAQ/routing | Section change and leave contact |
| Academic integrity | Enrolled referral, non-enrolled referral, solve-request refusal |
| Language understanding | Slang, Hindi-English, structured-output validation, malformed JSON fallback |
| Failure behavior | Unknown/off-topic decline, vague clarification, capability help, distress routing |
| Multi-intent | Combined deadline and course-progress response |
| Privacy | Priya and Neha receive different session-scoped records |
| Authentication | Anonymous chat call returns `401` |

## Six-step demo evidence

1. **Login:** use `priya.patel@school.edu / student123`; chat becomes available.
2. **Curriculum:** ask “What’s in Grade 7 Mathematics?”; source is `curriculum catalog`.
3. **Assignment activity:** ask “Have I taken any assignments yet?”; result shows 5 assigned, 3 submitted, and 2 pending.
4. **Grades/progress:** ask “How is my course progress in SSC-G7-MATH-ALG?”; result shows Priya’s 72% progress.
5. **Policy boundary:** ask “What does photosynthesis mean?”; result points to `SSC-G7-SCI-BIO` without explaining photosynthesis.
6. **Authentication guard:** sign out and call chat; request is rejected as unauthenticated.

## How to reproduce

```bash
npx --yes tsx scripts/evaluation.mts
npm run build
```

For the anonymous API check while the development server is running:

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What are my grades?"}'
```

Expected status: `401`.

## Known limitations

- Evaluation uses seeded demo JSON, not live LMS APIs.
- Demo cookie authentication proves gating behavior but is not production identity.
- Language understanding is hybrid: local rules plus optional validated OpenAI hints. Live-model
  consistency still needs a separate evaluation with a configured key.
- Topic-to-course mapping is manually approved demo metadata.
- OpenAI formatting may receive retrieved snippets; production requires approved data-processing,
  minimization/redaction, or deterministic formatting for sensitive records.
- The demo cookie contains an unsigned student ID and must not protect real student data.
- Relative-date calculations currently use server-local time; production should use tenant/student timezone.
