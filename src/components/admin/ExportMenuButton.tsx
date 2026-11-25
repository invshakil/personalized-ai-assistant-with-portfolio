"use client";

// "Export ▾" button for admin list pages: downloads the CURRENT filtered view as
// CSV or PDF. The files come from a GET route (so the browser handles the
// download), which is why this takes a URL builder rather than a callback.
import { useState } from "react";
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

export type ExportFormat = "csv" | "pdf";

interface ExportMenuButtonProps {
  /** URL of the export route for a format, carrying the page's active filters. */
  hrefFor: (format: ExportFormat) => string;
  disabled?: boolean;
  label?: string;
}

export default function ExportMenuButton({
  hrefFor,
  disabled = false,
  label = "Export",
}: ExportMenuButtonProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const download = (format: ExportFormat) => {
    setAnchor(null);
    window.open(hrefFor(format), "_blank", "noopener");
  };

  return (
    <>
      <Button
        variant="outlined"
        startIcon={<Download size={16} />}
        disabled={disabled}
        aria-haspopup="menu"
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        {label}
      </Button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem onClick={() => download("csv")}>
          <ListItemIcon>
            <FileSpreadsheet size={16} />
          </ListItemIcon>
          <ListItemText primary="CSV" secondary="Spreadsheet, with totals" />
        </MenuItem>
        <MenuItem onClick={() => download("pdf")}>
          <ListItemIcon>
            <FileText size={16} />
          </ListItemIcon>
          <ListItemText primary="PDF" secondary="Printable statement" />
        </MenuItem>
      </Menu>
    </>
  );
}
