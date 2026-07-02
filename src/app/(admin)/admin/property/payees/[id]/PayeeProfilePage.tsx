"use client";

import { useRouter } from "next/navigation";
import { Alert, Box, Button, Card, CardContent, CircularProgress } from "@mui/material";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import PayeeDocuments from "@/components/admin/PayeeDocuments";
import { usePayeeProfile } from "./hooks/usePayeeProfile";
import { usePayeeEdit } from "./hooks/usePayeeEdit";
import PayeeInfoCard from "./components/PayeeInfoCard";
import PayeePaymentHistoryTable from "./components/PayeePaymentHistoryTable";
import PayeeEditDrawer from "./components/PayeeEditDrawer";

interface Props {
  id: string;
}

export default function PayeeProfilePage({ id }: Props) {
  const router = useRouter();
  const { payee, expenses, totalPaid, loading, error, reload } = usePayeeProfile(id);
  const edit = usePayeeEdit(id, payee, reload);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !payee) {
    return <Alert severity="error">{error ?? "Payee not found"}</Alert>;
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowLeft size={16} />}
        onClick={() => router.push("/admin/property/payees")}
        sx={{ mb: 2, color: "text.secondary" }}
      >
        Back to Payees
      </Button>

      <PageHeader title={payee.name} subtitle={payee.role} />

      <PayeeInfoCard payee={payee} onEdit={edit.openEdit} />

      <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
        <CardContent>
          <PayeeDocuments payeeId={id} />
        </CardContent>
      </Card>

      <PayeePaymentHistoryTable expenses={expenses} totalPaid={totalPaid} />

      <PayeeEditDrawer
        open={edit.editOpen}
        form={edit.editForm}
        onFormChange={edit.setEditForm}
        saving={edit.saving}
        error={edit.saveError}
        onSave={edit.saveEdit}
        onClose={edit.closeEdit}
      />
    </Box>
  );
}
