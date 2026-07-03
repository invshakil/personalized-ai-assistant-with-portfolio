import { Chip, Typography } from "@mui/material";
import EntityLink from "@/components/admin/EntityLink";
import type { MoneyEntryRow } from "@/types";
import { METHOD_LABEL } from "../../format";

interface EntryCategoryCellProps {
  entry: MoneyEntryRow;
  accountName: (id: string | null) => string;
  onCategoryClick: (categoryId: string) => void;
}

export default function EntryCategoryCell({
  entry: e,
  accountName,
  onCategoryClick,
}: EntryCategoryCellProps) {
  return (
    <>
      {e.direction === "TRANSFER" ? (
        `${accountName(e.accountId)} → ${accountName(e.transferAccountId)}`
      ) : (
        <Chip
          size="small"
          label={e.categoryName ?? "—"}
          variant="outlined"
          clickable={!!e.categoryId}
          onClick={() => e.categoryId && onCategoryClick(e.categoryId)}
        />
      )}
      {e.beneficiaryName ? (
        <EntityLink
          href={`/admin/money/people?person=${e.beneficiaryId}`}
          variant="caption"
          sx={{ color: "text.secondary" }}
        >
          {e.beneficiaryName}
        </EntityLink>
      ) : null}
      {e.method ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {METHOD_LABEL[e.method]}
        </Typography>
      ) : null}
    </>
  );
}
