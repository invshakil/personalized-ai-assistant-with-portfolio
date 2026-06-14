"use client";

import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  CircularProgress,
  Avatar,
} from "@mui/material";
import { Check, User, Lock } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { adminApi } from "@/lib/api/admin";
import type { ProfileFormData, PasswordFormData } from "./types";

interface AccountPageProps {
  initialName: string;
  email: string;
}

export default function AccountPage({ initialName, email }: AccountPageProps) {
  const [profile, setProfile] = useState<ProfileFormData>({ name: initialName });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwd, setPwd] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError("");
    setProfileMsg("");

    try {
      await adminApi.updateAccount({ name: profile.name });
      setProfileMsg("Saved");
      setTimeout(() => setProfileMsg(""), 3000);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Failed to update.");
    }
    setSavingProfile(false);
  };

  const handleSavePassword = async () => {
    setPwdError("");
    setPwdMsg("");

    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }
    if (pwd.newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters.");
      return;
    }

    setSavingPwd(true);

    try {
      await adminApi.updateAccount({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwdMsg("Saved");
      setPwd({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => setPwdMsg(""), 3000);
    } catch (e) {
      setPwdError(e instanceof Error ? e.message : "Failed to update password.");
    }
    setSavingPwd(false);
  };

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : email[0].toUpperCase();

  return (
    <Box sx={{ maxWidth: 600 }}>
      <PageHeader title="Account" subtitle="Manage your profile and credentials." />

      {/* ── Profile card ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          {/* Section header */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                bgcolor: "rgba(115,103,240,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={16} color="#7367f0" />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Profile
            </Typography>
          </Box>

          {/* Avatar + email display */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              p: 2,
              mb: 3,
              borderRadius: 2,
              bgcolor: "rgba(231,227,252,0.04)",
              border: "1px solid rgba(231,227,252,0.06)",
            }}
          >
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: "primary.main",
                fontSize: "1rem",
                fontWeight: 700,
                borderRadius: "12px",
                boxShadow: "0 4px 12px rgba(115,103,240,0.35)",
              }}
            >
              {initials}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {profile.name || "—"}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {email}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              size="small"
              value={email}
              disabled
              helperText="Email cannot be changed"
            />

            <TextField
              label="Display name"
              type="text"
              fullWidth
              size="small"
              value={profile.name}
              onChange={(e) => setProfile({ name: e.target.value })}
              placeholder="Your name"
            />
          </Box>

          {profileError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {profileError}
            </Alert>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2.5 }}>
            <Button
              variant="contained"
              onClick={handleSaveProfile}
              disabled={savingProfile}
              startIcon={savingProfile ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ fontWeight: 600 }}
            >
              {savingProfile ? "Saving…" : "Update profile"}
            </Button>
            {profileMsg && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Check size={14} color="#28c76f" />
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                  {profileMsg}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ── Change password card ── */}
      <Card>
        <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "8px",
                bgcolor: "rgba(255,159,67,0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Lock size={16} color="#ff9f43" />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Change Password
            </Typography>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Current password"
              type="password"
              fullWidth
              size="small"
              value={pwd.currentPassword}
              onChange={(e) => setPwd((p) => ({ ...p, currentPassword: e.target.value }))}
              placeholder="••••••••"
            />

            <Divider />

            <TextField
              label="New password"
              type="password"
              fullWidth
              size="small"
              value={pwd.newPassword}
              onChange={(e) => setPwd((p) => ({ ...p, newPassword: e.target.value }))}
              placeholder="••••••••"
              helperText="Minimum 8 characters"
            />

            <TextField
              label="Confirm new password"
              type="password"
              fullWidth
              size="small"
              value={pwd.confirmPassword}
              onChange={(e) => setPwd((p) => ({ ...p, confirmPassword: e.target.value }))}
              placeholder="••••••••"
              error={!!pwd.confirmPassword && pwd.newPassword !== pwd.confirmPassword}
              helperText={
                pwd.confirmPassword && pwd.newPassword !== pwd.confirmPassword
                  ? "Passwords do not match"
                  : undefined
              }
            />
          </Box>

          {pwdError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {pwdError}
            </Alert>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2.5 }}>
            <Button
              variant="contained"
              onClick={handleSavePassword}
              disabled={savingPwd || !pwd.currentPassword || !pwd.newPassword}
              startIcon={savingPwd ? <CircularProgress size={14} color="inherit" /> : undefined}
              sx={{ fontWeight: 600 }}
            >
              {savingPwd ? "Updating…" : "Update password"}
            </Button>
            {pwdMsg && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Check size={14} color="#28c76f" />
                <Typography variant="body2" color="success.main" sx={{ fontWeight: 500 }}>
                  {pwdMsg}
                </Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
