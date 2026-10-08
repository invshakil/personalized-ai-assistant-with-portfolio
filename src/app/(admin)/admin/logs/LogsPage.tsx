"use client";

import { useState } from "react";
import { Alert, Box, Button, Card, Pagination, Typography } from "@mui/material";
import PageHeader from "@/components/admin/PageHeader";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useLogFilters } from "./hooks/useLogFilters";
import { useLogData } from "./hooks/useLogData";
import LogFilters from "./components/LogFilters";
import LogTable from "./components/LogTable";
import { PAGE_SIZE } from "./types";

export default function LogsPage() {
  const filters = useLogFilters();
  const logs = useLogData(filters);
  const confirm = useConfirmDialog();
  const [openId, setOpenId] = useState<string | null>(null);

  const total = logs.data?.total ?? 0;
  const pages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <Box>
      <PageHeader title="Logs" subtitle="Errors, warnings and notable events from the app" />
      <LogFilters
        level={filters.level}
        source={filters.source}
        period={filters.period}
        from={filters.from}
        to={filters.to}
        searchInput={filters.searchInput}
        sources={logs.data?.sources ?? []}
        hasActiveFilters={filters.hasActiveFilters}
        setParams={filters.setParams}
        onSearchChange={filters.setSearchInput}
        onClear={filters.clearFilters}
      />
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {total} {total === 1 ? "entry" : "entries"}
        </Typography>
        <Button size="small" color="inherit" onClick={logs.reload}>
          Refresh
        </Button>
        <Button
          size="small"
          color="error"
          onClick={() =>
            confirm.openConfirm(
              "Clear logs",
              "Delete ALL log entries? This cannot be undone.",
              async () => logs.purge(0),
              { confirmLabel: "Clear all", confirmColor: "error" }
            )
          }
        >
          Clear all
        </Button>
      </Box>
      {logs.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {logs.error}
        </Alert>
      )}
      <Card>
        <LogTable
          rows={logs.data?.rows ?? []}
          loading={logs.loading}
          sortBy={filters.sortBy}
          sortDir={filters.sortDir}
          openId={openId}
          onToggleSort={filters.toggleSort}
          onToggleOpen={(id) => setOpenId((cur) => (cur === id ? null : id))}
          onFilter={filters.setParams}
        />
      </Card>
      {pages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
          <Pagination
            count={pages}
            page={filters.page}
            onChange={(_, p) => filters.setParams({ page: p === 1 ? undefined : String(p) })}
          />
        </Box>
      )}
      <ConfirmDialog
        open={Boolean(confirm.dialog)}
        title={confirm.dialog?.title ?? ""}
        message={confirm.dialog?.message ?? ""}
        confirmLabel={confirm.dialog?.confirmLabel}
        confirmColor={confirm.dialog?.confirmColor}
        loading={confirm.loading}
        error={confirm.error}
        onConfirm={confirm.runConfirm}
        onClose={confirm.closeConfirm}
      />
    </Box>
  );
}
