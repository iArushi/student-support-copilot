# Student Support Copilot — Product Brief

## Summary

Students frequently leave an LMS to ask instructors or support teams about courses, deadlines,
submissions, grades, progress, and contacts. Student Support Copilot answers these questions for
signed-in students using approved LMS data. It can show information but cannot change it.

The product is deliberately **not an academic tutor**. When a student asks for a definition, explanation, or solution, the copilot identifies the course or unit that covers the topic and sends the student there.

## Problem

The LMS contains the answer to many student questions, but that information is distributed across course, assignment, gradebook, progress, FAQ, and support surfaces. Students lose time navigating; instructors and student-success teams repeatedly answer the same questions; schools cannot easily tell whether students found the right information.

### What we expect

If signed-in students can find their own LMS information in one chat, they should get answers faster
and send fewer repeated questions without receiving help that completes their academic work.

This is an assumption based on common LMS use. It should be checked with students and support staff.

## Users

- **Primary user:** signed-in student enrolled in one or more courses.
- **Internal supporter:** instructor or student-support team that handles repeat questions.
- **Decision maker:** school or program administrator responsible for the student experience.

### Example student

**Priya Patel, Grade 7 student**

- Uses the LMS on desktop.
- Is enrolled in Grade 7 Mathematics and one Science module.
- Wants short, trustworthy answers tied to her own record.
- Does not know which LMS page or staff member owns every issue.
- Needs the system to redirect learning questions to course materials, not complete the learning for her.

## What students need to do

1. **When I need to plan my work,** show me what is due and whether I have submitted it.
2. **When I want to understand my standing,** show my grades and course progress without exposing anyone else’s record.
3. **When I cannot find program information,** show my curriculum, courses, and pathway.
4. **When I have a process question,** give the approved answer or identify the right person.
5. **When I ask about a concept or term,** send me to the exact course/unit that teaches it instead of explaining it.

## First version

### Included

- Access only after student login.
- Courses limited to the student's enrollment.
- Assignment deadlines and submission status.
- Own grades, GPA, standing, and course progress.
- Approved answers to common process questions.
- Mentor and instructor contacts.
- Direction to the course or unit that covers a concept or term.
- Student-selected information objectives that guide, but do not override, detected intent.
- Support for slang, typos, short phrases, and Hindi-English questions.
- Questions using dates such as “tomorrow,” questions asking for two things, and clarification.
- Simple declines for unrelated questions and human help for emotional concerns.
- Source label on factual responses.
- A simple fallback and route to human help.

### Not included

- Academic tutoring, homework solving, definitions, or quiz answers.
- Parent, instructor, administrator, or public marketing chatbot.
- LMS write actions such as submitting work or changing enrollment.
- Open-web search.
- Real school sign-in, an admin dashboard, or large document search in the one-day demo.
- Autonomous agents.

## Product rules

### Learning safety

Requests such as “What does photosynthesis mean?”, “Explain equivalent fractions,” or “Solve this equation” must never produce instructional content. The response must:

1. identify the matching course/unit;
2. indicate whether the student is enrolled;
3. direct the student to open that course in the LMS; and
4. offer the right instructor contact if no reliable match exists.

### Privacy

- Anonymous requests receive `401`.
- Personal results use the signed-in student identity stored on the server.
- The client cannot select another student ID.
- Grades, progress, submissions, and deadlines are read-only.

### How answers stay reliable

- The AI model may rewrite approved facts, but it is not the source of truth.
- The AI model may return checked language hints: cleaned text, question types, course/topic
  hints, confidence, and clarification signals.
- Unclear, invalid, or unavailable AI output falls back to built-in rules.
- Login, privacy, learning safety, off-topic, and distress checks always come first.
- Missing data produces an honest unavailable state.
- Every factual reply carries a source category.

## Value

**For students:** one place to find reliable next steps inside the LMS.

**For instructors and support teams:** fewer repetitive navigation and status questions.

**For schools:** a controlled AI experience that improves self-service without becoming a homework-answering bot.

## How we define success

The prototype succeeds when it completes the supported student tasks reliably, handles realistic
language variation, refuses academic explanations, preserves student data isolation, and can be
demonstrated from login to answer in under three minutes. The current test suite passes 34/34 cases.

## What still needs to be checked

- These five jobs represent the highest-volume student questions.
- Students accept course referral instead of an explanation for terminology asks.
- Source labels increase trust.
- A single conversational entry point reduces support effort rather than creating additional clarification loops.
