"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { StudentSession } from "@/lib/student-types";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  source?: string | null;
};

type ApiOk = {
  reply: string;
  source: string | null;
};

type Props = {
  student: StudentSession;
  onLogout: () => void;
};

type ScopeId = "curriculum" | "assignments" | "grades" | "support" | "course_referral";

const SCOPE_OPTIONS: Array<{
  id: ScopeId;
  title: string;
  description: string;
  example: string;
  placeholder: string;
  accent: string;
  tint: string;
  badge: string;
}> = [
  {
    id: "curriculum",
    title: "Curriculum & courses",
    description: "Explore your enrolled courses, units, pathway, and program structure.",
    example: "What is the Grade 7 Mathematics curriculum?",
    placeholder: "Ask about your curriculum, courses, units, or pathway…",
    accent: "#4653D6",
    tint: "#EBEDFC",
    badge: "C",
  },
  {
    id: "assignments",
    title: "Assignments & deadlines",
    description: "Check what is due and whether work is submitted or still pending.",
    example: "Have I submitted my assignments?",
    placeholder: "Ask about assignments, deadlines, or submission status…",
    accent: "#DB8A1F",
    tint: "#FCF0DE",
    badge: "A",
  },
  {
    id: "grades",
    title: "Grades & progress",
    description: "View your grades, GPA, completion percentage, and course progress.",
    example: "How am I progressing in SSC-G7-MATH-ALG?",
    placeholder: "Ask about your grades, scores, or course progress…",
    accent: "#178F72",
    tint: "#E2F5EF",
    badge: "G",
  },
  {
    id: "support",
    title: "FAQ & contacts",
    description: "Find an approved process or the right advisor, instructor, or support team.",
    example: "Who should I contact about medical leave?",
    placeholder: "Ask about a process, policy, or who to contact…",
    accent: "#BD4482",
    tint: "#FAE9F1",
    badge: "?",
  },
  {
    id: "course_referral",
    title: "Find where a topic is taught",
    description: "Locate the relevant course or unit. The copilot will not explain the topic.",
    example: "Where is photosynthesis covered?",
    placeholder: "Enter a topic or term to find its course or unit…",
    accent: "#6D4CB3",
    tint: "#F0EAFB",
    badge: "T",
  },
];

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function ChatApp({ student, onLogout }: Props) {
  const [selectedScope, setSelectedScope] = useState<ScopeId | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hi ${student.name.split(" ")[0]} — choose an information objective above, then ask your question. I’ll keep the conversation focused on that area and use only approved student-support data.`,
      source: null,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const activeScope = SCOPE_OPTIONS.find((option) => option.id === selectedScope) ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(message: string) {
    const trimmed = message.trim();
    if (!trimmed || loading || !selectedScope) return;

    setError(null);
    setInput("");
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, scope: selectedScope }),
      });
      const data = (await res.json()) as ApiOk & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Chat request failed");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
          source: data.source,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <Container maxWidth="md" sx={{ minHeight: "100dvh", py: { xs: 3, sm: 6 }, pb: 12 }}>
      <Paper
        component="header"
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          mb: 5,
          borderRadius: "20px",
          boxShadow: "0 1px 2px rgba(28,27,46,0.04), 0 8px 24px rgba(28,27,46,0.06)",
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: "#178F72", fontWeight: 700, letterSpacing: "0.09em" }}
        >
          Logged in · Student support
        </Typography>
        <Typography
          variant="h3"
          component="h1"
          sx={{
            mt: 0.5,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 600,
            fontSize: { xs: 32, sm: 40 },
            letterSpacing: "-0.02em",
          }}
        >
          Student Support Copilot
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mt: 1.25, maxWidth: 610, lineHeight: 1.7 }}
        >
          Select an information objective, then ask a focused question. Academic concepts map
          straight to the relevant course, not a generated explanation.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{ justifyContent: "space-between", alignItems: { xs: "flex-start", sm: "center" }, gap: 2 }}
        >
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
            <Avatar
              sx={{
                width: 44,
                height: 44,
                background: "linear-gradient(135deg, #4653D6, #BD4482)",
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {student.name
                .split(" ")
                .map((part) => part.charAt(0))
                .join("")
                .slice(0, 2)}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                {student.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                {student.email}
              </Typography>
            </Box>
          </Stack>
          <Button size="small" onClick={onLogout} sx={{ color: "#178F72", px: 0 }}>
            Sign out
          </Button>
        </Stack>
      </Paper>

      <Box component="section" aria-labelledby="chat-scope-title" sx={{ mb: 2.5 }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 0.75 }}>
          <Typography
            variant="overline"
            sx={{ color: "#4653D6", fontWeight: 700, letterSpacing: "0.08em" }}
          >
            Step 1 of 2
          </Typography>
          <Stack direction="row" spacing={0.6}>
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#4653D6" }} />
            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "divider" }} />
          </Stack>
        </Stack>
        <Typography
          id="chat-scope-title"
          variant="h4"
          component="h2"
          sx={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 600, fontSize: 27 }}
        >
          What would you like help with?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 3 }}>
          Pick a category to route your question to the right source. You can switch at any time.
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
            gap: 2.25,
          }}
        >
          {SCOPE_OPTIONS.map((option) => {
            const selected = option.id === selectedScope;
            return (
              <Card
                key={option.id}
                sx={{
                  position: "relative",
                  overflow: "hidden",
                  gridColumn: option.id === "course_referral" ? { sm: "1 / -1" } : "auto",
                  border: "1.5px solid",
                  borderColor: selected ? option.accent : "transparent",
                  bgcolor: selected ? option.tint : "background.paper",
                  borderRadius: "14px",
                  boxShadow: "0 1px 2px rgba(28,27,46,0.04), 0 8px 24px rgba(28,27,46,0.06)",
                  transition: "transform .18s ease, box-shadow .18s ease",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: `0 14px 30px -12px ${option.accent}80`,
                  },
                }}
              >
                <CardActionArea
                  aria-pressed={selected}
                  onClick={() => {
                    setSelectedScope(option.id);
                    setInput("");
                    setError(null);
                  }}
                  sx={{ height: "100%", p: 0, display: "flex", alignItems: "stretch", textAlign: "left" }}
                >
                  <Stack
                    spacing={1.2}
                    sx={{
                      width: 10,
                      flexShrink: 0,
                      bgcolor: option.accent,
                      alignItems: "center",
                      justifyContent: "center",
                      py: 2,
                      transition: "width .18s ease",
                      ".MuiCard-root:hover &": { width: 14 },
                    }}
                  >
                    {[0, 1, 2].map((hole) => (
                      <Box
                        key={hole}
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          bgcolor: "rgba(255,255,255,.58)",
                        }}
                      />
                    ))}
                  </Stack>

                  <Box sx={{ p: 2.5, flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        display: "grid",
                        placeItems: "center",
                        bgcolor: option.tint,
                        color: option.accent,
                        fontWeight: 800,
                        mb: 1.25,
                      }}
                    >
                      {option.badge}
                    </Box>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                      {option.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.55 }}>
                      {option.description}
                    </Typography>
                    <Box
                      sx={{
                        display: "inline-flex",
                        mt: 1.5,
                        px: 1.5,
                        py: 0.75,
                        borderRadius: 99,
                        bgcolor: option.tint,
                        color: option.accent,
                        fontSize: 12,
                        lineHeight: 1.35,
                        fontWeight: 600,
                      }}
                    >
                      {selected ? "Selected objective" : `→ “${option.example}”`}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      width: 23,
                      height: 23,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      bgcolor: option.accent,
                      color: "common.white",
                      fontSize: 13,
                      fontWeight: 800,
                      opacity: selected ? 1 : 0,
                      transform: selected ? "scale(1)" : "scale(.6)",
                      transition: "opacity .15s ease, transform .15s ease",
                    }}
                  >
                    ✓
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </Box>

      {activeScope ? (
        <>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 4, mb: 1 }}>
            <Typography
              variant="overline"
              sx={{ color: activeScope.accent, fontWeight: 700, letterSpacing: "0.08em" }}
            >
              Step 2 of 2
            </Typography>
            <Stack direction="row" spacing={0.6}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: activeScope.accent }} />
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: activeScope.accent }} />
            </Stack>
          </Stack>
          <Alert
            icon={false}
            sx={{
              mb: 2,
              bgcolor: activeScope.tint,
              color: "text.primary",
              border: "1px solid",
              borderColor: `${activeScope.accent}55`,
            }}
            action={
              <Button
                size="small"
                onClick={() => void send(activeScope.example)}
                disabled={loading}
                sx={{ color: activeScope.accent }}
              >
                Ask example
              </Button>
            }
          >
            <strong>Current objective:</strong> {activeScope.title}
          </Alert>
        </>
      ) : null}

      <Box component="main">
        <Stack
          spacing={2}
          sx={{
            maxHeight: 520,
            overflowY: "auto",
            mb: 2,
            pr: 0.5,
            scrollBehavior: "smooth",
          }}
        >
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <Stack
                key={message.id}
                direction="row"
                sx={{ justifyContent: isUser ? "flex-end" : "flex-start" }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    maxWidth: { xs: "94%", sm: "82%" },
                    px: 2,
                    py: 1.5,
                    bgcolor: isUser ? "text.primary" : "action.hover",
                    color: isUser ? "common.white" : "text.primary",
                    border: isUser ? 0 : 1,
                    borderColor: "divider",
                    borderRadius: 2.5,
                  }}
                >
                  <Typography variant="body2" component="div" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {renderContent(message.content)}
                  </Typography>
                  {!isUser && message.source ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      From: {message.source}
                    </Typography>
                  ) : null}
                </Paper>
              </Stack>
            );
          })}
          {loading ? (
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Thinking…
              </Typography>
            </Stack>
          ) : null}
          <Box ref={bottomRef} />
        </Stack>

        {error ? <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert> : null}
        <Paper
          component="form"
          onSubmit={onSubmit}
          elevation={0}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 0.75,
            pr: 0.75,
            pl: 2.5,
            bgcolor: "background.paper",
            border: "1.5px solid",
            borderColor: activeScope?.accent ?? "divider",
            borderRadius: 999,
            boxShadow: activeScope
              ? `0 10px 30px -8px ${activeScope.accent}66`
              : "0 10px 30px rgba(28,27,46,0.10)",
            transition: "border-color .2s ease, box-shadow .2s ease",
          }}
        >
            <InputBase
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={
                activeScope?.placeholder ?? "Choose an information objective above to begin…"
              }
              disabled={loading || !selectedScope}
              slotProps={{ input: { "aria-label": "Message" } }}
              fullWidth
              sx={{ fontSize: 14.5 }}
            />
            <IconButton
              type="submit"
              aria-label="Send message"
              disabled={loading || !input.trim() || !selectedScope}
              sx={{
                width: 42,
                height: 42,
                flexShrink: 0,
                bgcolor: activeScope?.accent ?? "#4653D6",
                color: "common.white",
                "&:hover": { bgcolor: activeScope?.accent ?? "#4653D6", filter: "brightness(.92)" },
                "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
              }}
            >
              <Typography component="span" sx={{ fontSize: 21, lineHeight: 1 }}>
                →
              </Typography>
            </IconButton>
        </Paper>
      </Box>

    </Container>
  );
}
