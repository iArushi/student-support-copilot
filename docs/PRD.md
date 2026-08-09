# Student Support Copilot — Product Requirements Document

## 1. Product overview

Student Support Copilot is an LMS assistant for signed-in students. Students can view information,
but the chatbot cannot change anything in the LMS. It brings courses, assignments, grades,
progress, common questions, and support contacts into one chat.

The product is not an academic tutor. Questions asking for a concept explanation, definition,
homework solution, or quiz answer are redirected to the course or unit where the topic is taught.

## 2. Problem

Student information is distributed across several LMS surfaces. Students spend time finding routine
information, while instructors and support teams repeatedly answer navigation and status questions.

### Product hypothesis

If students can ask for their own LMS information in one chat, they should find answers faster and
send fewer repeated questions to teachers and support teams. The chatbot must still protect student
data and must not complete academic work.

## 3. Target user

### Main user

A signed-in student enrolled in one or more courses who:

- wants short answers based on their own LMS record;
- may use slang, typos, fragments, or Hindi-English phrasing;
- does not always know which page or staff member owns an issue; and
- needs learning questions redirected to approved course material.

### Other people involved

- Students
- Instructors
- Student-success and support teams
- School or program administrators

## 4. Goals

1. Reduce the time required to find routine LMS information.
2. Improve student self-service across five common support journeys.
3. Show each student only their own information.
4. Prevent tutoring, homework solving, and unsupported answers.
5. Provide a clear source and next action for factual responses.

## 5. Scope

### Included

- Chat available only after student login
- Curriculum and enrollment information
- Assignment deadlines and submission status
- Personal grades and course progress
- Approved answers to common process questions
- Mentor, instructor, and support contacts
- Direction to the course or unit that covers a topic
- Objective tiles that guide the conversation
- Support for slang, typos, short phrases, and Hindi-English questions
- Questions using dates such as “tomorrow” and questions asking for two things
- Clarification, unavailable-data, off-topic, and distress responses
- Source labels on answers based on stored data

### Not included

- Concept explanations, tutoring, or homework solving
- Quiz and examination answers
- Parent, teacher, administrator, or public chatbot experiences
- LMS write actions
- Open-web search
- Real school sign-in, large document search, or an admin dashboard
- Autonomous actions or agents

## 6. Feature priorities

### Must have for the demo

1. Student login before chat access
2. Course and enrollment answers
3. Assignment deadlines and submission status
4. Personal grades and course progress
5. Common questions and support contacts
6. Course referral instead of concept explanations or homework answers
7. Student-only data filtering
8. A clear response when information is missing

### Should have

1. Objective tiles to help students start
2. Support for common slang, typos, and Hindi-English questions
3. Questions that combine two needs, such as deadlines and progress
4. Source labels under factual answers
5. Human support for emotional or safety concerns

### Later

1. Real school sign-in
2. Live LMS data instead of demo JSON files
3. Direct links to the correct course, assignment, or grade page
4. Admin tools to update common questions and support contacts
5. Usage reports and student feedback

### Not planned

1. Tutoring or concept explanations
2. Homework, quiz, or exam answers
3. Changing grades, enrollment, or assignment submissions
4. Searching the public internet
5. Acting without student approval

## 7. Main student journeys

### Journey 1: Curriculum and enrollment

The student selects **My courses** and asks what they are enrolled in or what a course contains.
The system checks the student's enrollment and returns the matching course information and source.

### Journey 2: Assignments and submissions

The student selects **Assignments** and asks what is due, overdue, or already submitted. The system
filters assignments by the signed-in student, course, status, and requested dates.

### Journey 3: Grades and progress

The student selects **Grades & progress** and asks about overall or course-specific performance. The
system returns only that student's available grade and progress records.

### Journey 4: FAQ and human support

The student selects **Get support** and asks about a school process or whom to contact. The
system returns approved guidance or the right person to contact.

### Journey 5: Course referral

The student asks what a term means or requests a solution. The system identifies the matching
course or unit, reports enrollment status, and redirects the student without teaching the topic.

## 8. Product requirements

### Authentication and privacy

- Chat must be unavailable without a valid student session.
- Anonymous chat requests must return `401`.
- Student identity must come from the server session, never the chat request.
- Personal answers must use only the signed-in student's records.

### Understanding questions

- The system must use clear rules to understand the type of question.
- An optional AI model may clean up the wording and suggest the question type.
- If the AI output is unclear or invalid, the system must use its built-in rules.
- The actual question and safety rules must take priority over the selected objective tile.

### Retrieval and responses

- Student data must use exact matching and check course enrollment.
- Missing data must produce an honest unavailable response.
- Factual responses must include a source category.
- The AI model must not invent grades, deadlines, rules, courses, or contacts.

### Learning safety rule

- Definition, explanation, and solution requests must not receive instructional content.
- The response should identify the relevant course or unit when a reliable match exists.
- Unmatched topics should be escalated to an instructor or support contact.

## 9. How we know it works

- A logged-in student can complete all five supported journeys.
- An anonymous user cannot call the chat API successfully.
- Course-specific questions do not return unrelated course records.
- Different students receive only their own records.
- Concept and homework questions never return explanations or solutions.
- Slang, typo, and supported Hindi-English variations route correctly.
- Questions that ask for two things return both relevant sections.
- Unsupported or unclear questions receive a simple fallback or clarification.
- Main tasks continue to work when OpenAI is unavailable.

## 10. Success measures

### Main measure

**Supported task success rate:** percentage of supported questions that return the correct,
actionable answer without human clarification.

### Safety and quality targets

- Supported task success: at least 90%
- Intent accuracy: at least 90%
- Correct course direction: at least 95%
- Correct student data: 100%
- Cross-student data leakage: 0
- Academic explanations in the policy test set: 0
- Personal answers shown before login: 0

## 11. Demo results

The automated evaluation suite currently passes **34/34** cases across curriculum, assignments,
grades, progress, common questions, support contacts, language variations, combined questions,
privacy, fallback answers, and learning safety.

Run the evaluation with:

```bash
npm run evaluate
```

## 12. Current limits

- Data comes from made-up local JSON files rather than live LMS APIs.
- Authentication uses a demo cookie and must not protect real student data.
- Topic-to-course mapping is manually maintained.
- Live AI behavior depends on OpenAI availability and a working API key.
- Relative dates use server time rather than a tenant or student timezone.

## 13. Next steps

1. Validate the top journeys with students and support staff.
2. Replace the demo login with the school's secure sign-in system.
3. Replace JSON files with live LMS APIs.
4. Add content owners, review dates, usage reports, and human support tracking.
5. Pilot with one cohort and monitor accuracy, privacy, and usefulness.
6. Expand only after the privacy, safety, and quality targets are met.
