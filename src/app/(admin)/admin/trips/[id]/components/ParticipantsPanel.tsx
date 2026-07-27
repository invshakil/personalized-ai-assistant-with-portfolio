import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Add, Delete, Edit } from "@mui/icons-material";
import type { TripParticipantRow } from "@/types";

interface Props {
  participants: TripParticipantRow[];
  onAdd: () => void;
  onEdit: (p: TripParticipantRow) => void;
  onDelete: (p: TripParticipantRow) => void;
}

export default function ParticipantsPanel({ participants, onAdd, onEdit, onDelete }: Props) {
  return (
    <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          People on this trip
        </Typography>
        <Button size="small" variant="outlined" startIcon={<Add />} onClick={onAdd}>
          Add person
        </Button>
      </Box>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Linked person</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {participants.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {p.name}
                  {p.isSelf && (
                    <Chip
                      size="small"
                      label="me"
                      color="primary"
                      variant="outlined"
                      sx={{ ml: 0.5, height: 18 }}
                    />
                  )}
                  {!p.isActive && (
                    <Chip
                      size="small"
                      label="removed"
                      variant="outlined"
                      sx={{ ml: 0.5, height: 18 }}
                    />
                  )}
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>{p.beneficiaryName ?? "—"}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton size="small" onClick={() => onEdit(p)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  {!p.isSelf && (
                    <IconButton size="small" onClick={() => onDelete(p)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Card>
  );
}
