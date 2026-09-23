import { Box, Chip, IconButton, TableCell, TableRow, Tooltip } from "@mui/material";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import type { AccountTypeRow as Row } from "@/types";
import { ACCOUNT_TYPE_LABEL } from "../../format";

interface Props {
  type: Row;
  onEdit: (t: Row) => void;
  onArchive: (t: Row) => void;
  onReactivate: (t: Row) => void;
  onDelete: (t: Row) => void;
}

export default function AccountTypeRow({
  type: t,
  onEdit,
  onArchive,
  onReactivate,
  onDelete,
}: Props) {
  // A type still holding accounts can't be deleted (the FK is Restrict), so the
  // button is disabled and points at archiving. The span is there because MUI
  // drops tooltips on a disabled button.
  const inUse = t.accountCount > 0;
  return (
    <TableRow hover sx={{ opacity: t.isActive ? 1 : 0.6 }}>
      <TableCell data-label="Name" sx={{ fontWeight: 600 }}>
        {t.name}
      </TableCell>
      <TableCell data-label="Behaves as">{ACCOUNT_TYPE_LABEL[t.kind]}</TableCell>
      <TableCell align="right" data-label="Accounts">
        {t.accountCount}
      </TableCell>
      <TableCell data-label="Status">
        <Chip
          size="small"
          variant="outlined"
          label={t.isActive ? "Active" : "Archived"}
          color={t.isActive ? "success" : "default"}
        />
      </TableCell>
      <TableCell data-label="Actions">
        <Box sx={{ display: "flex" }}>
          <Tooltip title="Rename">
            <IconButton size="small" onClick={() => onEdit(t)}>
              <Pencil size={14} />
            </IconButton>
          </Tooltip>
          {t.isActive ? (
            <Tooltip title="Archive — hide from every picker">
              <IconButton size="small" color="warning" onClick={() => onArchive(t)}>
                <Archive size={14} />
              </IconButton>
            </Tooltip>
          ) : (
            <Tooltip title="Reactivate">
              <IconButton size="small" color="success" onClick={() => onReactivate(t)}>
                <ArchiveRestore size={14} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title={inUse ? "In use by accounts — archive it instead" : "Delete"}>
            <span>
              <IconButton size="small" color="error" disabled={inUse} onClick={() => onDelete(t)}>
                <Trash2 size={14} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
