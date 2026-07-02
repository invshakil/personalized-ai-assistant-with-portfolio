import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { SourceRow } from "../../../types";
import { fmt } from "../../../format";

interface ClientInfoCardProps {
  source: SourceRow;
  totalEarned: number;
}

export default function ClientInfoCard({ source, totalEarned }: ClientInfoCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={4} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Earnings
            </Typography>
            <Typography variant="body2">{source.earningCount}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Earned
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: "success.main" }}>
              {fmt(totalEarned)}
            </Typography>
          </Box>
          {source.notes && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Notes
              </Typography>
              <Typography variant="body2">{source.notes}</Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
