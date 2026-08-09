"use client";

import { useEffect, useState } from "react";
import { Box, CircularProgress, CssBaseline, ThemeProvider, Typography, createTheme } from "@mui/material";
import type { StudentSession } from "@/lib/student-types";
import ChatApp from "@/components/ChatApp";
import StudentLogin from "@/components/StudentLogin";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0f766e",
      dark: "#115e59",
      light: "#ccfbf1",
    },
    background: {
      default: "#F2F4FB",
      paper: "#ffffff",
    },
    text: {
      primary: "#1C1B2E",
      secondary: "#6C6C88",
    },
  },
  shape: {
    borderRadius: 14,
  },
  typography: {
    fontFamily: '"Plus Jakarta Sans", "Segoe UI", ui-sans-serif, system-ui, sans-serif',
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#F2F4FB",
          backgroundImage:
            "radial-gradient(circle at 1.5px 1.5px, rgba(28,27,46,0.05) 1.5px, transparent 0)",
          backgroundSize: "22px 22px",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
  },
});

export default function AppShell() {
  const [student, setStudent] = useState<StudentSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          if (!cancelled) setStudent(null);
          return;
        }
        const data = (await res.json()) as { student: StudentSession };
        if (!cancelled) setStudent(data.student);
      } catch {
        if (!cancelled) setStudent(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {checking ? (
        <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
          <Box sx={{ textAlign: "center" }}>
            <CircularProgress size={30} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              Checking student session…
            </Typography>
          </Box>
        </Box>
      ) : !student ? (
        <StudentLogin onLoggedIn={setStudent} />
      ) : (
        <ChatApp
          student={student}
          onLogout={() => {
            void fetch("/api/auth/logout", { method: "POST" }).then(() => setStudent(null));
          }}
        />
      )}
    </ThemeProvider>
  );
}
