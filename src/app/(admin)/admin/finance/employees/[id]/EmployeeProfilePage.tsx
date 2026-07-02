"use client";

import { useRouter } from "next/navigation";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { useEmployeeProfile } from "./hooks/useEmployeeProfile";
import EmployeeInfoCard from "./components/EmployeeInfoCard";
import EmployeePaymentHistoryTable from "./components/EmployeePaymentHistoryTable";

interface Props {
  id: string;
}

export default function EmployeeProfilePage({ id }: Props) {
  const router = useRouter();
  const { employee, payments, totalPaid, loading, error } = useEmployeeProfile(id);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !employee) {
    return <Alert severity="error">{error ?? "Employee not found"}</Alert>;
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => router.push("/admin/finance/payments")}
        sx={{ mb: 2, color: "text.secondary" }}
      >
        Back to Payments
      </Button>

      <PageHeader title={employee.name} subtitle="Employee" />

      <EmployeeInfoCard employee={employee} />

      <EmployeePaymentHistoryTable payments={payments} totalPaid={totalPaid} />
    </Box>
  );
}
