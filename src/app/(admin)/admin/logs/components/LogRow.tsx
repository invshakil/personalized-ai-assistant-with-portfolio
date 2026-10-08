import { Box, Chip, Collapse, IconButton, TableCell, TableRow, Typography } from "@mui/material";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LogRow as LogRowData, LogLevelName } from "@/types";

const LEVEL_COLOR: Record<LogLevelName, "error" | "warning" | "info"> = {
  ERROR: "error",
  WARN: "warning",
  INFO: "info",
};

interface LogRowProps {
  row: LogRowData;
  open: boolean;
  onToggle: () => void;
  onFilter: (patch: Record<string, string>) => void;
}

export default function LogRow({ row, open, onToggle, onFilter }: LogRowProps) {
  const hasContext = row.context !== null && row.context !== undefined;
  return (
    <>
      <TableRow hover sx={{ "& > td": { borderBottom: open ? "none" : undefined } }}>
        <TableCell sx={{ whiteSpace: "nowrap" }}>
          <IconButton size="small" onClick={onToggle} disabled={!hasContext} sx={{ mr: 0.5 }}>
            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </IconButton>
          {new Date(row.createdAt).toLocaleString()}
        </TableCell>
        <TableCell>
          <Chip
            size="small"
            label={row.level}
            color={LEVEL_COLOR[row.level]}
            variant="outlined"
            clickable
            onClick={() => onFilter({ level: row.level })}
          />
        </TableCell>
        <TableCell>
          <Chip
            size="small"
            label={row.source}
            clickable
            onClick={() => onFilter({ source: row.source })}
          />
        </TableCell>
        <TableCell sx={{ maxWidth: 560, wordBreak: "break-word" }}>{row.message}</TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={4} sx={{ py: 0, borderBottom: open ? undefined : "none" }}>
          <Collapse in={open} unmountOnExit>
            <Box sx={{ py: 1.5 }}>
              <Typography
                component="pre"
                variant="caption"
                sx={{
                  m: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "text.secondary",
                }}
              >
                {JSON.stringify(row.context, null, 2)}
              </Typography>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}
