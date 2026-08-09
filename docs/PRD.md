# Student Support Copilot — Product Requirements Document

## 1. Product overview

Student Support Copilot is an authenticated, read-only LMS assistant for students. It brings
curriculum, assignments, grades, progress, FAQs, and support routing into one conversational
interface.

The product is not an academic tutor. Questions asking for a concept explanation, definition,
homework solution, or quiz answer are redirected to the course or unit where the topic is taught.

## 2. Problem

Student information is distributed across several LMS surfaces. Students spend time finding routine
information, while instructors and support teams repeatedly answer navigation and status questions.

### Product hypothesis

If students can ask for their own LMS information through one grounded conversational interface,
they will find answers faster and create fewer repetitive support requests without compromising
privacy or academic integrity.

## 3. Target user

### Primary persona

An authenticated student enrolled in one or more courses who:

- wants concise answers based on their own LMS record;
- may use slang, typos, fragments, or Hindi-English phrasing;
- does not always know which page or staff member owns an issue; and
- needs learning questions redirected to approved course material.

### Stakeholders

- Students
- Instructors
- Student-success and support teams
- School or program administrators

## 4. Goals

1. Reduce the time required to find routine LMS information.
2. Improve student self-service across five common support journeys.
3. Protect student data through authenticated, server-side scoping.
4. Prevent tutoring, homework solving, and unsupported answers.
5. Provide a clear source and next action for factual responses.

## 5. Scope

### In scope

- Student login and session-gated chat
- Curriculum and enrollment information
- Assignment deadlines and submission status
- Personal grades and course progress
- Approved operational FAQs
- Mentor, instructor, and support routing
- Topic-to-course or unit referral
- Objective tiles that guide the conversation
- Slang, typo, fragment, and Hindi-English normalization
- Relative-date and multi-intent questions
- Clarification, unavailable-data, off-topic, and distress responses
- Source labels on grounded answers

### Out of scope

- Concept explanations, tutoring, or homework solving
- Quiz and examination answers
- Parent, teacher, administrator, or public chatbot experiences
- LMS write actions
- Open-web search
- Production SSO, vector database, or admin CMS
- Autonomous actions or agents

## 6. Core user journeys

### Journey 1: Curriculum and enrollment

The student selects **My courses** and asks what they are enrolled in or what a course contains.
The system returns enrollment-aware curriculum information and its source.

### Journey 2: Assignments and submissions

The student selects **Assignments** and asks what is due, overdue, or already submitted. The system
filters assignments by the authenticated student, course, status, and requested date window.

### Journey 3: Grades and progress

The student selects **Grades & progress** and asks about overall or course-specific performance. The
system returns only that student's available grade and progress records.

### Journey 4: FAQ and human support

The student selects **Get support** and asks about an operational process or whom to contact. The
system returns approved guidance or an appropriate escalation route.

### Journey 5: Course referral

The student asks what a term means or requests a solution. The system identifies the matching
course or unit, reports enrollment status, and redirects the student without teaching the topic.

## 7. Functional requirements

### Authentication and privacy

- Chat must be unavailable without a valid student session.
- Anonymous chat requests must return `401`.
- Student identity must come from the server session, never the chat request.
- Personalized retrieval must be limited to the authenticated student's records.

### Understanding and routing

- The system must support deterministic intent detection.
- An optional LLM may provide validated normalization and routing hints.
- Invalid, malformed, or low-confidence LLM output must fall back to deterministic handling.
- Explicit intent and safety policies must take priority over a selected objective tile.

### Retrieval and responses

- Structured student data must use exact, enrollment-aware lookup.
- Missing data must produce an honest unavailable response.
- Factual responses must include a source category.
- The LLM must not invent grades, deadlines, policies, courses, or contacts.

### Academic-integrity policy

- Definition, explanation, and solution requests must not receive instructional content.
- The response should identify the relevant course or unit when a reliable match exists.
- Unmatched topics should be escalated to an instructor or support contact.

## 8. Acceptance criteria

- A logged-in student can complete all five supported journeys.
- An anonymous user cannot call the chat API successfully.
- Course-specific questions do not return unrelated course records.
- Different students receive different session-scoped records.
- Concept and homework questions never return explanations or solutions.
- Slang, typo, and supported Hindi-English variations route correctly.
- Multi-intent questions return all relevant supported sections.
- Unsupported or vague questions receive a bounded fallback or clarification.
- Core supported tasks continue when OpenAI is unavailable.

## 9. Success metrics

### North-star metric

**Supported task success rate:** percentage of supported questions that return the correct,
actionable answer without human clarification.

### Targets

- Supported task success: at least 90%
- Intent accuracy: at least 90%
- Course-referral accuracy: at least 95%
- Personalized-data accuracy: 100%
- Cross-student data leakage: 0
- Academic explanations in the policy test set: 0
- Anonymous personalized responses: 0

## 10. Prototype evidence

The automated evaluation suite currently passes **34/34** cases across curriculum, assignments,
grades, progress, FAQs, routing, language variations, multi-intent handling, privacy, fallbacks, and
academic-integrity behavior.

Run the evaluation with:

```bash
npm run evaluate
```

## 11. Known limitations

- Data comes from synthetic local JSON rather than live LMS APIs.
- Authentication uses a demo cookie and must not protect real student data.
- Topic-to-course mapping is manually maintained.
- Live LLM behavior depends on provider availability and configured API access.
- Relative dates use server time rather than a tenant or student timezone.

## 12. Production roadmap

1. Validate the top journeys with students and support staff.
2. Replace demo authentication with signed OIDC/SSO.
3. Replace JSON files with typed LMS APIs.
4. Add content ownership, review dates, analytics, and human escalation tracking.
5. Pilot with one cohort and monitor accuracy, privacy, and usefulness.
6. Expand only after all release guardrails are met.
