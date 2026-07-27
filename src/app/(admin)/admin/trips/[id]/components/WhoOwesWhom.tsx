import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { ArrowForward } from "@mui/icons-material";
import type { TripOwesTransfer, TripPersonBalance } from "@/types";
import { fmt } from "../../format";

interface Props {
  participants: TripPersonBalance[];
  owes: TripOwesTransfer[];
}

export default function WhoOwesWhom({ participants, owes }: Props) {
  // Nothing to settle on a solo trip with no split.
  if (participants.length <= 1) return null;

  return (
    <Card variant="outlined" sx={{ p: 2, mb: 3, flex: "1 1 320px", minWidth: 300 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Who owes whom
      </Typography>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Person</TableCell>
              <TableCell align="right">Paid</TableCell>
              <TableCell align="right">Spent</TableCell>
              <TableCell align="right">Net</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((p) => {
              const owed = p.netBdt > 0.009;
              const owe = p.netBdt < -0.009;
              return (
                <TableRow key={p.participantId}>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>
                    {p.name}
                    {p.isSelf ? " (me)" : ""}
                  </TableCell>
                  <TableCell align="right">{fmt(p.paidBdt)}</TableCell>
                  <TableCell align="right">{fmt(p.spentBdt)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      fontWeight: 700,
                      color: owed ? "success.main" : owe ? "error.main" : "text.secondary",
                    }}
                  >
                    {owed ? `+${fmt(p.netBdt)}` : fmt(p.netBdt)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Settle up
      </Typography>
      {owes.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          All square — nobody owes anything.
        </Typography>
      ) : (
        owes.map((t, i) => (
          <Box
            key={`${t.fromParticipantId}-${t.toParticipantId}-${i}`}
            sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t.fromName}
            </Typography>
            <ArrowForward fontSize="small" sx={{ color: "text.secondary" }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {t.toName}
            </Typography>
            <Typography variant="body2" sx={{ ml: "auto", fontWeight: 700, color: "primary.main" }}>
              {fmt(t.amountBdt)}
            </Typography>
          </Box>
        ))
      )}
    </Card>
  );
}
