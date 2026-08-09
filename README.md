# Student Support Copilot (Demo)

Logged-in **student** chatbot for a fictional campus LMS:

- Curriculum / pathway (from LMS demo seeds)  
- Ops FAQ  
- Assignment **deadlines**  
- **Grades** & **course progress**  
- Mentor routing
- Objective-based Material UI chat experience
- Slang, typo, fragment, and Hindi-English normalization
- Multi-intent, relative-date, clarification, off-topic, and emotional-safety handling

If a student asks *what a concept/term means*, the bot **does not explain it** — it **refers them to the exact course/unit** that covers that topic.

All names, accounts, course records, grades, assignments, policies, and contacts are synthetic
demo data created for this assignment.

---

## Run

```bash
cd chatbot_studentPersona
npm install
cp .env.example .env.local   # optional: add OPENAI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Validate the product-policy behavior and production build:

```bash
npm run evaluate
npm run build
```

**You must sign in first.** Demo accounts (school seed names):

| Email | Password | Focus |
|-------|----------|--------|
| `priya.patel@school.edu` | `student123` | Grade 7 Math + Science Bio |
| `arjun.sharma@school.edu` | `student123` | Grade 7 Math |
| `neha.desai@school.edu` | `student123` | Grade 7 Science |

---

## Scope

| In (after login) | Out |
|------------------|-----|
| Curriculum (G3 CCSS Math, G7 Math/Science) | Explaining concepts or terminology |
| Assignment deadlines for enrolled modules | Public / anonymous chat |
| Grades & course progress (own record only) | Marketing / parent sales bot |
| Campus ops FAQ + mentor routing | Full Keycloak SSO (demo cookie login) |
| “What does X mean?” → **course/unit referral** | Teaching X itself |
| Validated LLM language understanding with deterministic fallback | Using the LLM as the source of grades, deadlines, or policies |

---

## Try these (after sign-in as Priya)

1. `What's in Grade 7 Mathematics?` → curriculum
2. `yo hows my alg goin?` → **SSC-G7-MATH-ALG** progress
3. `What's due this week and how am I doing in that class?` → combined deadline + progress
4. `assignment ka deadline kab hai` → normalized assignment deadline query
5. `What is meant by equivalent fractions?` → **SSC-G3-MATH-U03** referral (no definition)
6. `What does photosynthesis mean?` → **SSC-G7-SCI-BIO** referral
7. `What should I ask?` → objective-specific examples

---

## Data files

| File | Contents |
|------|----------|
| `data/curriculum.json` | G3 units + G7 Math/Science modules + topic maps |
| `data/students.json` | Demo logins + enrollments |
| `data/assignments.json` | Deadlines per module |
| `data/grades.json` | GPA / % progress / letter grades |
| `data/faq.json` | Operational FAQ and learner-practice guidance |
| `data/mentors.json` | Mentor / instructor routing |

Course codes follow `SSC-{grade}-{subject}-{unit}`, for example `SSC-G7-MATH-ALG`.

---

## Architecture

```
Student signs in (demo cookie)
  → Chat UI
  → POST /api/chat (401 if anonymous)
  → local normalization
  → optional OpenAI structured understanding (validated JSON)
  → deterministic safety, policy, and intent checks
  → exact enrollment-scoped JSON retrieval
  → grounded OpenAI formatting or deterministic mock
  → subject_doubt never teaches — only course referral
```

The LLM may propose normalized text, intents, course/topic hints, confidence, and clarification
signals. The server validates those fields; authentication, authorization, safety rules, and
student-record retrieval remain deterministic.

---

## PM assignment package

- [`docs/PRD.md`](docs/PRD.md) — requirements, journeys, acceptance criteria, metrics, and roadmap
- [`docs/PRODUCT_BRIEF.md`](docs/PRODUCT_BRIEF.md) — problem, persona, JTBD, scope, and policy
- [`docs/TECH_STACK_AND_WORKING.md`](docs/TECH_STACK_AND_WORKING.md) — technology choices and end-to-end code flow
- [`scripts/evaluation.mts`](scripts/evaluation.mts) — reproducible acceptance evaluation

The documents separate implemented prototype behavior, assumptions, and production recommendations.

## Prototype limitations

- JSON is read-only seeded demo data, not live LMS integration.
- Authentication uses plaintext demo credentials and an unsigned student-ID cookie.
- OpenAI is optional and separately billed; the local fallback remains functional without it.
- The deterministic evaluation validates fallback behavior and LLM-output parsing, not live-model consistency.
- Production should use Keycloak/OIDC, typed LMS APIs, signed sessions, rate limiting, observability,
  approved data-processing controls, and deterministic formatting for sensitive records when needed.

---

## License

Demo / assignment use.
