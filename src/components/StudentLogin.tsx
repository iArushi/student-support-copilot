"use client";

import { FormEvent, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { StudentSession } from "@/lib/student-types";

type Props = {
  onLoggedIn: (student: StudentSession) => void;
};

export default function StudentLogin({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("priya.patel@school.edu");
  const [password, setPassword] = useState("student123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { student?: StudentSession; error?: string };
      if (!res.ok || !data.student) {
        throw new Error(data.error || "Login failed");
      }
      onLoggedIn(data.student);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", py: 5 }}>
      <Paper elevation={0} sx={{ width: "100%", p: { xs: 3, sm: 4 }, border: 1, borderColor: "divider" }}>
        <Typography variant="overline" color="primary.main" sx={{ fontWeight: 700 }}>
          Student access only
        </Typography>
        <Typography variant="h4" component="h1" sx={{ mt: 0.5, fontWeight: 700 }}>
          Sign in to use the copilot
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, lineHeight: 1.7 }}>
          Curriculum, FAQs, and assignment deadlines are available after login. Concept questions
          are routed to the matching course — not explained here.
        </Typography>

        <Box component="form" onSubmit={onSubmit} sx={{ mt: 3 }}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              autoComplete="username"
              fullWidth
            />
            <TextField
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              autoComplete="current-password"
              fullWidth
            />
            {error ? <Alert severity="error">{error}</Alert> : null}
            <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mt: 2.5, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
          <Typography variant="subtitle2">Synthetic demo student accounts</Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.75, display: "block" }}
          >
            priya.patel@school.edu / student123
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            arjun.sharma@school.edu / student123
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            neha.desai@school.edu / student123
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
