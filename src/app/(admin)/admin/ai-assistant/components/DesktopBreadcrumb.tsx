import { Box, Typography } from "@mui/material";

interface DesktopBreadcrumbProps {
  title: string;
}

export default function DesktopBreadcrumb({ title }: DesktopBreadcrumbProps) {
  return (
    <Box
      sx={{
        display: { xs: "none", sm: "flex" },
        alignItems: "center",
        gap: 0.75,
        px: 2.5,
        py: 1.25,
        borderBottom: "1px solid",
        borderColor: "divider",
        minHeight: 0,
      }}
    >
      <Typography variant="caption" color="text.disabled" noWrap>
        AI Assistant
      </Typography>
      <Typography variant="caption" color="text.disabled" sx={{ opacity: 0.6 }}>
        /
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}
        noWrap
        title={title}
      >
        {title}
      </Typography>
    </Box>
  );
}
