import { Box, Typography } from "@mui/material";

interface SystemNoticeProps {
  content: string;
}

export default function SystemNotice({ content }: SystemNoticeProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", my: 0.5 }}>
      <Typography
        variant="caption"
        sx={{
          color: "success.main",
          bgcolor: "rgba(40,199,111,0.08)",
          border: "1px solid rgba(40,199,111,0.25)",
          px: 1.5,
          py: 0.5,
          borderRadius: "999px",
        }}
      >
        ✓ {content}
      </Typography>
    </Box>
  );
}
