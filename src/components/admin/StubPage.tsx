import { ReactNode } from "react";
import { Box, Typography, Chip, Card, CardContent } from "@mui/material";
import PageHeader from "./PageHeader";

interface StubPageProps {
  title: string;
  description: string;
  icon: ReactNode;
}

export default function StubPage({ title, description, icon }: StubPageProps) {
  return (
    <Box>
      <PageHeader title={title} />
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 12,
              textAlign: "center",
            }}
          >
            <Box
              sx={{
                mb: 3,
                width: 56,
                height: 56,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "rgba(231,227,252,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                fontSize: 24,
              }}
            >
              {icon}
            </Box>
            <Chip
              label="Coming soon"
              size="small"
              variant="outlined"
              sx={{ mb: 2.5, fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase" }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360, lineHeight: 1.7 }}>
              {description}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
