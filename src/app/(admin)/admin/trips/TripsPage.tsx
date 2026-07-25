"use client";

import { Box, Button } from "@mui/material";
import { Add } from "@mui/icons-material";
import PageHeader from "@/components/admin/PageHeader";
import { useMoneyAccounts } from "@/hooks/useMoneyAccounts";
import { useTripsData } from "./hooks/useTripsData";
import { useTripForm } from "./hooks/useTripForm";
import TripsTable from "./components/TripsTable";
import TripFormDrawer from "./components/TripFormDrawer";

export default function TripsPage() {
  const { trips, loading, load } = useTripsData();
  const { accounts } = useMoneyAccounts();
  const form = useTripForm(load);

  return (
    <Box>
      <PageHeader title="Trips" subtitle="Plan, track and share trip expenses" />

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button variant="contained" startIcon={<Add />} onClick={form.openAdd}>
          New Trip
        </Button>
      </Box>

      <TripsTable trips={trips} loading={loading} onEdit={form.openEdit} />

      <TripFormDrawer
        open={form.drawerOpen}
        editing={!!form.editing}
        form={form.form}
        accounts={accounts}
        saving={form.saving}
        error={form.error}
        onChange={form.setForm}
        onClose={form.closeDrawer}
        onSave={form.save}
      />
    </Box>
  );
}
