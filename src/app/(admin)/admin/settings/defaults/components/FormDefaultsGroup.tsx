import { Box, Card, CardContent, Typography } from "@mui/material";

interface FormDefaultsGroupProps {
  module: string;
  form: string;
  children: React.ReactNode;
}

/** One form's defaults, grouped under its module. */
export default function FormDefaultsGroup({ module, form, children }: FormDefaultsGroupProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {form}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {module}
          </Typography>
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}
