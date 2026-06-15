import { Box } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders markdown (GFM: headings, lists, bold, tables, code) with MUI-themed
 * styling tuned for chat bubbles. Styling targets the rendered HTML tags so we
 * don't need a per-element component map.
 */
export default function Markdown({ content }: { content: string }) {
  return (
    <Box
      sx={{
        fontSize: "0.875rem",
        lineHeight: 1.65,
        color: "text.primary",
        "& > :first-of-type": { mt: 0 },
        "& > :last-child": { mb: 0 },
        "& p": { my: 0.75 },
        "& h1, & h2, & h3, & h4": { fontWeight: 700, lineHeight: 1.3, mt: 1.5, mb: 0.5 },
        "& h1": { fontSize: "1.05rem" },
        "& h2": { fontSize: "1rem" },
        "& h3": { fontSize: "0.92rem" },
        "& h4": { fontSize: "0.875rem" },
        "& ul, & ol": { pl: 2.5, my: 0.75 },
        "& li": { mb: 0.25 },
        "& li > ul, & li > ol": { my: 0.25 },
        "& strong": { fontWeight: 700 },
        "& a": { color: "primary.main", textDecoration: "underline" },
        "& code": {
          fontFamily: "monospace",
          fontSize: "0.85em",
          bgcolor: "action.hover",
          px: 0.5,
          py: 0.1,
          borderRadius: 0.5,
        },
        "& pre": {
          bgcolor: "action.hover",
          border: "1px solid",
          borderColor: "divider",
          p: 1.5,
          borderRadius: 1,
          overflow: "auto",
          my: 1,
        },
        "& pre code": { bgcolor: "transparent", px: 0, py: 0, fontSize: "0.8rem" },
        "& blockquote": {
          borderLeft: "3px solid",
          borderColor: "divider",
          pl: 1.5,
          my: 1,
          color: "text.secondary",
        },
        "& hr": { border: "none", borderTop: "1px solid", borderColor: "divider", my: 1.5 },
        "& table": { borderCollapse: "collapse", my: 1, width: "100%", fontSize: "0.82rem" },
        "& th, & td": {
          border: "1px solid",
          borderColor: "divider",
          px: 1,
          py: 0.5,
          textAlign: "left",
        },
        "& th": { fontWeight: 700, bgcolor: "action.hover" },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </Box>
  );
}
