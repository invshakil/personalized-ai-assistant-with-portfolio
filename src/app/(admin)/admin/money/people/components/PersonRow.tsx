import { Box, Chip, IconButton, TableCell, TableRow, Tooltip } from "@mui/material";
import { Pencil, Trash2, Eye } from "lucide-react";
import { fmt } from "../../format";
import type { BeneficiaryRow } from "@/types";

interface Props {
  person: BeneficiaryRow;
  onView: (id: string) => void;
  onEdit: (person: BeneficiaryRow) => void;
  onDelete: (person: BeneficiaryRow) => void;
}

export default function PersonRow({ person: b, onView, onEdit, onDelete }: Props) {
  return (
    <TableRow hover>
      <TableCell data-label="Name" sx={{ fontWeight: 600 }}>
        {b.name}
        {!b.isActive && <Chip size="small" label="Inactive" sx={{ ml: 1 }} variant="outlined" />}
      </TableCell>
      <TableCell data-label="Relationship">{b.relationship ?? "—"}</TableCell>
      <TableCell align="right" data-label="I owe" sx={{ color: "error.main" }}>
        {b.outstandingByMe > 0 ? fmt(b.outstandingByMe) : "—"}
      </TableCell>
      <TableCell align="right" data-label="Owes me" sx={{ color: "success.main" }}>
        {b.outstandingToMe > 0 ? fmt(b.outstandingToMe) : "—"}
      </TableCell>
      <TableCell align="right" data-label="Total paid">
        {fmt(b.totalPaid)}
      </TableCell>
      <TableCell data-label="Actions">
        <Box sx={{ display: "flex" }}>
          <Tooltip title="View / record payment">
            <IconButton size="small" onClick={() => onView(b.id)}>
              <Eye size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(b)}>
              <Pencil size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDelete(b)}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
