"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Avatar,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { adminTheme } from "@/lib/adminTheme";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      // Kept generic on purpose (no account enumeration). After repeated
      // failures the server temporarily locks the account — flagged here so a
      // legitimate user isn't confused by a correct password being rejected.
      setError(
        "Invalid email or password. Repeated failures temporarily lock login for a few minutes."
      );
      setLoading(false);
    } else {
      router.push("/admin");
    }
  };

  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={adminTheme}>
        <CssBaseline />
        <Box
          sx={{
            minHeight: "100vh",
            bgcolor: "background.default",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 3,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Ambient glow */}
          <Box
            sx={{
              position: "absolute",
              top: "-15%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 700,
              height: 500,
              borderRadius: "50%",
              bgcolor: "primary.main",
              opacity: 0.08,
              filter: "blur(120px)",
              pointerEvents: "none",
            }}
          />

          <Box sx={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
            {/* Brand */}
            <Box
              sx={{ display: "flex", flexDirection: "column", alignItems: "center", mb: 4, gap: 2 }}
            >
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: "primary.main",
                  fontSize: "1rem",
                  fontWeight: 700,
                  borderRadius: "14px",
                  boxShadow: "0 8px 32px rgba(115,103,240,0.4)",
                }}
              >
                SS
              </Avatar>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Welcome back
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Sign in to your admin panel
                </Typography>
              </Box>
            </Box>

            {/* Form card */}
            <Card
              sx={{
                boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
              }}
            >
              <CardContent sx={{ p: 4, "&:last-child": { pb: 4 } }}>
                <Box
                  component="form"
                  onSubmit={handleSubmit}
                  sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
                >
                  <TextField
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@sshakil.com"
                    required
                    autoComplete="email"
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Mail size={16} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <TextField
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    fullWidth
                    size="small"
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock size={16} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  {error && (
                    <Alert severity="error" sx={{ py: 0.5 }}>
                      {error}
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={loading}
                    size="large"
                    sx={{ mt: 0.5, py: 1.25, fontWeight: 600 }}
                  >
                    {loading ? (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CircularProgress size={16} color="inherit" />
                        Signing in…
                      </Box>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </Box>
              </CardContent>
            </Card>

            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: "block", textAlign: "center", mt: 3 }}
            >
              sshakil.com · Personal admin panel
            </Typography>
          </Box>
        </Box>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
