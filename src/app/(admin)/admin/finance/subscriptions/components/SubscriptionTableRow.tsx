import { TableRow, TableCell, Chip, Typography, Tooltip } from "@mui/material";
import type { SubscriptionRow } from "../../types";
import { fmt, fmtMonth } from "../../format";
import SubscriptionRowActions from "./SubscriptionRowActions";

interface SubscriptionTableRowProps {
  sub: SubscriptionRow;
  onManage: (id: string) => void;
  onEdit: (sub: SubscriptionRow) => void;
  onStop: (sub: SubscriptionRow) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
  onCategoryClick: (categoryId: string) => void;
}

export default function SubscriptionTableRow({
  sub,
  onManage,
  onEdit,
  onStop,
  onResume,
  onDelete,
  onCategoryClick,
}: SubscriptionTableRowProps) {
  return (
    <TableRow hover>
      <TableCell data-label="Service" sx={{ fontWeight: 600 }}>
        {sub.name}
      </TableCell>
      <TableCell data-label="Category">
        <Chip
          size="small"
          label={sub.categoryName}
          variant="outlined"
          clickable
          onClick={() => onCategoryClick(sub.categoryId)}
        />
      </TableCell>
      <TableCell align="right" data-label="Monthly">
        {fmt(sub.currentMonthlyAmount)}
        {sub.rateChangeCount > 0 && (
          <Tooltip
            title={`Started at ${fmt(sub.monthlyAmount)} · ${sub.rateChangeCount} price change${sub.rateChangeCount > 1 ? "s" : ""}`}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              was {fmt(sub.monthlyAmount)}
            </Typography>
          </Tooltip>
        )}
      </TableCell>
      <TableCell data-label="Started">{fmtMonth(sub.startDate)}</TableCell>
      <TableCell data-label="Status">
        {sub.isActive ? (
          <Chip size="small" label="Active" color="success" variant="outlined" />
        ) : (
          <Chip
            size="small"
            label={`Ended ${fmtMonth(sub.endDate)}`}
            color="default"
            variant="outlined"
          />
        )}
      </TableCell>
      <TableCell
        align="right"
        data-label="Total Spent"
        sx={{ fontWeight: 600, color: "error.main" }}
      >
        {fmt(sub.totalSpent)}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {sub.monthsCharged} mo
        </Typography>
      </TableCell>
      <TableCell data-label="Actions">
        <SubscriptionRowActions
          sub={sub}
          onManage={onManage}
          onEdit={onEdit}
          onStop={onStop}
          onResume={onResume}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
