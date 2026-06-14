import type { SxProps, Theme } from "@mui/material";

// Shared responsive style for admin data tables. On phones (< sm / 600px) it
// turns each table row into a card: the header row is hidden and every body
// cell becomes a "label : value" line, where the label comes from the cell's
// `data-label` attribute. Desktop rendering is unchanged.
//
// Usage:
//   <Table size="small" sx={mobileCardTableSx}> ... </Table>
//   <TableCell data-label="Amount">{fmt(x)}</TableCell>   // in TableBody rows
//
// Cells without a `data-label` (e.g. a full-width "no data" row) simply render
// their content with no label prefix.
export const mobileCardTableSx: SxProps<Theme> = {
  "@media (max-width:600px)": {
    "& thead": { display: "none" },
    "& tbody": { display: "block" },
    "& tr": {
      display: "block",
      mb: 1.5,
      border: "1px solid",
      borderColor: "divider",
      borderRadius: 2,
      bgcolor: "background.paper",
      overflow: "hidden",
    },
    "& td": {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 2,
      textAlign: "right",
      borderBottom: "1px solid",
      borderColor: "divider",
      px: 1.5,
      py: 1,
      "&:last-of-type": { borderBottom: "none" },
      "&[data-label]::before": {
        content: "attr(data-label)",
        fontWeight: 600,
        color: "text.secondary",
        textAlign: "left",
        marginRight: "auto",
        whiteSpace: "nowrap",
      },
    },
  },
};
