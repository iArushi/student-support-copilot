# Student Support Copilot — Product Brief

## Executive summary

Students frequently leave an LMS to ask instructors or support teams where to find curriculum information, what is due, whether work was submitted, how they are progressing, and whom to contact. The Student Support Copilot is an authenticated, read-only assistant that answers these operational questions from approved LMS data.

The product is deliberately **not an academic tutor**. When a student asks for a definition, explanation, or solution, the copilot identifies the course or unit that covers the topic and sends the student there.

## Problem

The LMS contains the answer to many student questions, but that information is distributed across course, assignment, gradebook, progress, FAQ, and support surfaces. Students lose time navigating; instructors and student-success teams repeatedly answer the same questions; schools cannot easily tell whether students found the right information.

### Problem hypothesis

If authenticated students can retrieve their own LMS information through one grounded conversational entry point, then routine support effort and time-to-answer will fall without creating an academic-integrity risk.

This hypothesis is inferred from LMS workflows and must be validated with students and support staff after the assignment.

## Users and stakeholders

- **Primary user:** authenticated student enrolled in one or more courses.
- **Champion:** instructor or student-success team that handles repeat questions.
- **Buyer:** school, tutoring-center, or program administrator responsible for learner experience and support costs.

### Primary persona hypothesis

**Priya Patel, Grade 7 student**

- Uses the LMS on desktop.
- Is enrolled in Grade 7 Mathematics and one Science module.
- Wants short, trustworthy answers tied to her own record.
- Does not know which LMS page or staff member owns every issue.
- Needs the system to redirect learning questions to course materials, not complete the learning for her.

## Jobs to be done

1. **When I need to plan my work,** show me what is due and whether I have submitted it.
2. **When I want to understand my standing,** show my grades and course progress without exposing anyone else’s record.
3. **When I cannot find program information,** show my curriculum, courses, and pathway.
4. **When I have an operational issue,** answer the approved FAQ or identify the right person.
5. **When I ask about a concept or term,** send me to the exact course/unit that teaches it instead of explaining it.

## MVP scope

### In scope

- Authenticated student access.
- Enrollment-scoped curriculum and course list.
- Assignment deadlines and submission status.
- Own grades, GPA, standing, and course progress.
- Approved operational FAQs.
- Mentor/instructor routing.
- Concept or terminology detection followed by course/unit referral.
- Student-selected information objectives that guide, but do not override, detected intent.
- Slang, typo, fragment, and Hindi-English normalization.
- Relative-date assignment queries, multi-intent handling, and clarification prompts.
- Off-topic decline and emotional-distress routing to human support.
- Source label on factual responses.
- Bounded fallback and human escalation.

### Non-goals

- Academic tutoring, homework solving, definitions, or quiz answers.
- Parent, instructor, administrator, or public marketing chatbot.
- LMS write actions such as submitting work or changing enrollment.
- Open-web search.
- Production SSO, admin CMS, or vector database in the one-day prototype.
- Autonomous agents.

## Product policy

### Academic-integrity boundary

Requests such as “What does photosynthesis mean?”, “Explain equivalent fractions,” or “Solve this equation” must never produce instructional content. The response must:

1. identify the matching course/unit;
2. indicate whether the student is enrolled;
3. direct the student to open that course in the LMS; and
4. offer instructor escalation if no reliable match exists.

### Privacy boundary

- Anonymous requests receive `401`.
- Personalized results are derived from the server-side authenticated student session.
- The client cannot select another student ID.
- Grades, progress, submissions, and deadlines are read-only.

### Trust boundary

- The LLM may format retrieved facts but is not the source of truth.
- The LLM may return validated language-understanding hints: normalized text, intents, course/topic
  hints, confidence, and clarification signals.
- Low-confidence, malformed, or unavailable LLM output falls back to deterministic routing.
- Raw-text academic-integrity, off-topic, distress, authentication, and authorization checks take precedence.
- Missing data produces an honest unavailable state.
- Every factual reply carries a source category.

## Value proposition

**For students:** one place to find reliable next steps inside the LMS.

**For instructors and support teams:** fewer repetitive navigation and status questions.

**For schools:** a controlled AI experience that improves self-service without becoming a homework-answering bot.

## MVP success definition

The prototype succeeds when it completes the supported student tasks reliably, handles realistic
language variation, refuses academic explanations, preserves student data isolation, and can be
demonstrated end-to-end in under three minutes. The current deterministic suite passes 34/34 cases.

## Assumptions to validate after the assignment

- These five jobs represent the highest-volume student questions.
- Students accept course referral instead of an explanation for terminology asks.
- Source labels increase trust.
- A single conversational entry point reduces support effort rather than creating additional clarification loops.
