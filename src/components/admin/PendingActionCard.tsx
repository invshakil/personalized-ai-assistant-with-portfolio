import { Box, Typography, Button, CircularProgress, Divider } from "@mui/material";
import { Check, X, ShieldAlert, CircleCheck } from "lucide-react";
import type { PendingActionState } from "@/app/(admin)/admin/ai-assistant/types";

const SKIP_KEYS = new Set(["id"]);

function labelFromKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatVal(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val.toLocaleString();
  if (typeof val === "string") {
    if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
      try {
        return new Date(val).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      } catch {
        return val;
      }
    }
    return val;
  }
  if (Array.isArray(val)) return val.join(", ");
  return JSON.stringify(val);
}

interface PendingActionCardProps {
  action: PendingActionState;
  disabled?: boolean;
  onApprove: (id: string) => void;
  onCancel: (id: string) => void;
}

// A write the assistant proposed. Nothing is saved until the user approves —
// the commit happens via the execute endpoint, not through the model.
export default function PendingActionCard({
  action,
  disabled,
  onApprove,
  onCancel,
}: PendingActionCardProps) {
  const { status } = action;

  const accent =
    status === "done"
      ? "success.main"
      : status === "error"
        ? "error.main"
        : status === "cancelled"
          ? "text.disabled"
          : "warning.main";

  return (
    <Box
      sx={{
        mt: 1.25,
        p: 1.5,
        borderRadius: "8px",
        border: "1px solid",
        borderColor: accent,
        bgcolor: "rgba(255,255,255,0.02)",
        opacity: status === "cancelled" ? 0.6 : 1,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
        <ShieldAlert
          size={16}
          style={{ marginTop: 2, flexShrink: 0, color: "var(--mui-palette-warning-main, #ff9f43)" }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              fontSize: "0.62rem",
            }}
          >
            {status === "done"
              ? "Action completed"
              : status === "cancelled"
                ? "Action cancelled"
                : "Proposed action — needs your approval"}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.25, lineHeight: 1.55 }}>
            {action.summary}
          </Typography>

          {/* Entry fields — all input values except internal ids */}
          {(() => {
            const entries = Object.entries(action.input).filter(
              ([k, v]) => !SKIP_KEYS.has(k) && v !== null && v !== undefined
            );
            if (!entries.length) return null;
            return (
              <>
                <Divider sx={{ my: 1, borderColor: "rgba(231,227,252,0.1)" }} />
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  {entries.map(([k, v]) => (
                    <Box key={k} sx={{ display: "flex", gap: 1.5, alignItems: "baseline" }}>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.disabled", whiteSpace: "nowrap", minWidth: 90 }}
                      >
                        {labelFromKey(k)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: "text.primary", fontWeight: 500, wordBreak: "break-word" }}
                      >
                        {formatVal(v)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </>
            );
          })()}

          {status === "done" && action.resultSummary && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
              <CircleCheck
                size={14}
                style={{ color: "var(--mui-palette-success-main, #28c76f)" }}
              />
              <Typography variant="caption" sx={{ color: "success.main" }}>
                {action.resultSummary}
              </Typography>
            </Box>
          )}

          {status === "error" && action.error && (
            <Typography variant="caption" sx={{ color: "error.main", display: "block", mt: 0.75 }}>
              {action.error}
            </Typography>
          )}
        </Box>
      </Box>

      {(status === "pending" || status === "error") && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1.25 }}>
          <Button
            size="small"
            variant="text"
            color="inherit"
            startIcon={<X size={14} />}
            disabled={disabled}
            onClick={() => onCancel(action.id)}
            sx={{ color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            size="small"
            variant="contained"
            color="success"
            startIcon={<Check size={14} />}
            disabled={disabled}
            onClick={() => onApprove(action.id)}
          >
            {status === "error" ? "Retry" : "Approve"}
          </Button>
        </Box>
      )}

      {status === "committing" && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 1.25,
            justifyContent: "flex-end",
          }}
        >
          <CircularProgress size={14} />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Saving…
          </Typography>
        </Box>
      )}
    </Box>
  );
}
