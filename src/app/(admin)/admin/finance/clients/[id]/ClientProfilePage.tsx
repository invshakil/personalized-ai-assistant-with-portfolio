"use client";

import { useRouter } from "next/navigation";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { useClientProfile } from "./hooks/useClientProfile";
import ClientInfoCard from "./components/ClientInfoCard";
import ClientEarningHistoryTable from "./components/ClientEarningHistoryTable";
import ClientPaymentHistoryTable from "./components/ClientPaymentHistoryTable";

interface Props {
  id: string;
}

export default function ClientProfilePage({ id }: Props) {
  const router = useRouter();
  const { source, earnings, payments, totalEarned, loading, error } = useClientProfile(id);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !source) {
    return <Alert severity="error">{error ?? "Client not found"}</Alert>;
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => router.push("/admin/finance/earnings")}
        sx={{ mb: 2, color: "text.secondary" }}
      >
        Back to Earnings
      </Button>

      <PageHeader title={source.name} subtitle="Client" />

      <ClientInfoCard source={source} totalEarned={totalEarned} />

      <ClientEarningHistoryTable earnings={earnings} totalEarned={totalEarned} />

      <Box sx={{ mt: 3 }}>
        <ClientPaymentHistoryTable payments={payments} />
      </Box>
    </Box>
  );
}
