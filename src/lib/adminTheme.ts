import { createTheme, lighten, darken, alpha, type Theme } from "@mui/material/styles";
import type { AdminThemeSettings } from "@/types";

type ResolvedMode = "light" | "dark";

// Applied when the AdminThemeSettings singleton hasn't been customised yet.
// Mirrors the historical hardcoded dark theme so behaviour is unchanged out of
// the box. Lives here (not in the service) so client components can import it
// without pulling in the Prisma-backed service module.
export const DEFAULT_THEME_SETTINGS: AdminThemeSettings = {
  mode: "dark",
  primaryColor: "#7367f0",
  cardShadow: "soft",
  cardBorder: true,
  borderRadius: 8,
  density: "comfortable",
  fontSize: 14,
};

// Per-mode token sets. Dark mirrors the original hardcoded Materio-style theme;
// light is the equivalent paper/text/divider set for the same surface.
const palettes = {
  dark: {
    bgDefault: "#25293c",
    bgPaper: "#2f3349",
    textPrimary: "#cfd3ec",
    textSecondary: "#8692a8",
    divider: "rgba(231,227,252,0.12)",
    cardBorder: "rgba(231,227,252,0.08)",
    hover: "rgba(231,227,252,0.08)",
    shadowSoft: "0 2px 6px rgba(0,0,0,0.25)",
    shadowElevated: "0 6px 18px rgba(0,0,0,0.4)",
  },
  light: {
    bgDefault: "#f5f6fa",
    bgPaper: "#ffffff",
    textPrimary: "#2f2b3d",
    textSecondary: "#6e6b7b",
    divider: "rgba(47,43,61,0.12)",
    cardBorder: "rgba(47,43,61,0.10)",
    hover: "rgba(47,43,61,0.06)",
    shadowSoft: "0 2px 6px rgba(47,43,61,0.08)",
    shadowElevated: "0 6px 18px rgba(47,43,61,0.16)",
  },
} as const;

function cardBoxShadow(
  shadow: AdminThemeSettings["cardShadow"],
  p: (typeof palettes)[ResolvedMode]
) {
  if (shadow === "none") return "none";
  return shadow === "elevated" ? p.shadowElevated : p.shadowSoft;
}

/**
 * Builds the admin MUI theme from saved appearance settings.
 *
 * @param settings    persisted preferences (mode may be "system")
 * @param resolvedMode the concrete light/dark mode to render — the provider
 *                     passes the matchMedia result when settings.mode is "system".
 *                     Defaults to a server-safe guess (system → dark).
 */
export function createAdminTheme(
  settings: AdminThemeSettings = DEFAULT_THEME_SETTINGS,
  resolvedMode: ResolvedMode = settings.mode === "light" ? "light" : "dark"
): Theme {
  const p = palettes[resolvedMode];
  const radius = settings.borderRadius;
  const compact = settings.density === "compact";
  const primary = settings.primaryColor;
  const selectedBg = alpha(primary, 0.16);

  return createTheme({
    palette: {
      mode: resolvedMode,
      primary: {
        main: primary,
        light: lighten(primary, 0.2),
        dark: darken(primary, 0.15),
        contrastText: "#fff",
      },
      secondary: { main: "#82868b", contrastText: "#fff" },
      success: { main: "#28c76f", light: "#48da89", dark: "#1f9d57" },
      error: { main: "#ea5455", light: "#f08182", dark: "#ce3a3b" },
      warning: { main: "#ff9f43", light: "#ffb976", dark: "#e08c3b" },
      info: { main: "#00cfe8", light: "#1fdefa", dark: "#00b8cf" },
      background: { default: p.bgDefault, paper: p.bgPaper },
      text: { primary: p.textPrimary, secondary: p.textSecondary },
      divider: p.divider,
      action: {
        hover: p.hover,
        selected: selectedBg,
        disabledBackground: p.divider,
      },
    },
    typography: {
      fontFamily: '"Inter","Public Sans","Roboto","Helvetica","Arial",sans-serif',
      fontSize: settings.fontSize,
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      subtitle2: { fontWeight: 500 },
      button: { textTransform: "none", fontWeight: 500 },
    },
    shape: { borderRadius: radius },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          // Scoped body override only while admin is mounted
          body: { backgroundColor: p.bgDefault, color: p.textPrimary },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: "none",
            border: settings.cardBorder ? `1px solid ${p.cardBorder}` : "none",
            borderRadius: radius + 2,
            boxShadow: cardBoxShadow(settings.cardShadow, p),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(radius - 2, 0),
            padding: compact ? "4px 12px" : "8px 12px",
            "&.Mui-selected": {
              backgroundColor: selectedBg,
              "&:hover": { backgroundColor: alpha(primary, 0.24) },
              "& .MuiListItemText-primary": { color: primary, fontWeight: 600 },
              "& .MuiListItemIcon-root": { color: primary },
            },
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 36, color: "inherit" } },
      },
      MuiTableCell: {
        styleOverrides: {
          root: compact ? { paddingTop: 6, paddingBottom: 6 } : undefined,
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: "4px", fontWeight: 600, fontSize: "0.72rem" },
        },
      },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: "10px", height: 8 } },
      },
      MuiDivider: {
        styleOverrides: { root: { borderColor: p.divider } },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            width: 34,
            height: 34,
            fontSize: "0.8125rem",
            fontWeight: 700,
            backgroundColor: primary,
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: Math.max(radius - 2, 0),
            textTransform: "none",
            fontWeight: 500,
          },
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: Math.max(radius - 2, 0) } },
      },
      MuiTooltip: {
        styleOverrides: { tooltip: { fontSize: "0.75rem", borderRadius: "6px" } },
      },
    },
  });
}

/** Default dark theme — used by the login page, which has no DB session. */
export const adminTheme = createAdminTheme();
