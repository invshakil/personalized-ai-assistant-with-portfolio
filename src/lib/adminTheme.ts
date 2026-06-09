import { createTheme } from "@mui/material/styles";

export const adminTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#7367f0",
      light: "#9b94f7",
      dark: "#584dd4",
      contrastText: "#fff",
    },
    secondary: {
      main: "#82868b",
      contrastText: "#fff",
    },
    success: { main: "#28c76f", light: "#48da89", dark: "#1f9d57" },
    error: { main: "#ea5455", light: "#f08182", dark: "#ce3a3b" },
    warning: { main: "#ff9f43", light: "#ffb976", dark: "#e08c3b" },
    info: { main: "#00cfe8", light: "#1fdefa", dark: "#00b8cf" },
    background: {
      default: "#25293c",
      paper: "#2f3349",
    },
    text: {
      primary: "#cfd3ec",
      secondary: "#8692a8",
    },
    divider: "rgba(231,227,252,0.12)",
    action: {
      hover: "rgba(231,227,252,0.08)",
      selected: "rgba(115,103,240,0.16)",
      disabledBackground: "rgba(231,227,252,0.12)",
    },
  },
  typography: {
    fontFamily: '"Inter","Public Sans","Roboto","Helvetica","Arial",sans-serif',
    fontSize: 14,
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    subtitle2: { fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 500 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        // Scoped body override only while admin is mounted
        body: { backgroundColor: "#25293c", color: "#cfd3ec" },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(231,227,252,0.08)",
          borderRadius: "10px",
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
          borderRadius: "6px",
          padding: "8px 12px",
          "&.Mui-selected": {
            backgroundColor: "rgba(115,103,240,0.16)",
            "&:hover": { backgroundColor: "rgba(115,103,240,0.24)" },
            "& .MuiListItemText-primary": { color: "#7367f0", fontWeight: 600 },
            "& .MuiListItemIcon-root": { color: "#7367f0" },
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: { root: { minWidth: 36, color: "inherit" } },
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
      styleOverrides: { root: { borderColor: "rgba(231,227,252,0.12)" } },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          width: 34,
          height: 34,
          fontSize: "0.8125rem",
          fontWeight: 700,
          backgroundColor: "#7367f0",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: "6px", textTransform: "none", fontWeight: 500 },
      },
    },
    MuiIconButton: {
      styleOverrides: { root: { borderRadius: "6px" } },
    },
    MuiTooltip: {
      styleOverrides: { tooltip: { fontSize: "0.75rem", borderRadius: "6px" } },
    },
  },
});
