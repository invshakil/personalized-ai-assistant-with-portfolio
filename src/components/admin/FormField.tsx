import { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

interface FormFieldProps {
  label: string;
  error?: string;
  children: ReactNode;
}

export default function FormField({ label, error, children }: FormFieldProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      <Typography variant="caption" sx={{ fontWeight: 500, color: "text.secondary" }}>
        {label}
      </Typography>
      {children}
      {error && (
        <Typography variant="caption" color="error.main">
          {error}
        </Typography>
      )}
    </Box>
  );
}
