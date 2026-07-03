import { Box, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { BeneficiaryRow, ObligationRow } from "@/types";
import { fmt } from "../../format";
import type { EntryForm } from "../types";

interface EntryObligationLinkProps {
  form: EntryForm;
  setForm: React.Dispatch<React.SetStateAction<EntryForm>>;
  beneficiaries: BeneficiaryRow[];
  linkLoading: boolean;
  linkObligationOptions: ObligationRow[];
  selectedObligation: ObligationRow | null;
}

export default function EntryObligationLink({
  form,
  setForm,
  beneficiaries,
  linkLoading,
  linkObligationOptions,
  selectedObligation,
}: EntryObligationLinkProps) {
  return (
    <>
      <Typography
        variant="caption"
        sx={{ fontWeight: 700, color: "text.secondary", display: "block", mb: 1 }}
      >
        Link to a person / shop (optional)
      </Typography>
      <Box sx={{ mb: 2 }}>
        <SearchableSelect
          label="Person / shop"
          value={form.beneficiaryId}
          options={[
            { value: "", label: "— none —" },
            ...beneficiaries.map((b) => ({ value: b.id, label: b.name })),
          ]}
          onChange={(v) => setForm((f) => ({ ...f, beneficiaryId: v, obligationId: "" }))}
        />
      </Box>
      {form.beneficiaryId && (
        <Box sx={{ mb: 2 }}>
          <SearchableSelect
            label={form.direction === "DEBIT" ? "Against which due" : "Against which loan"}
            value={form.obligationId}
            options={[
              { value: "", label: "— none (just tag the person) —" },
              ...linkObligationOptions.map((o) => ({
                value: o.id,
                label: `${fmt(o.outstanding)} left of ${fmt(o.amount)}`,
              })),
            ]}
            onChange={(v) => setForm((f) => ({ ...f, obligationId: v }))}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            {linkLoading
              ? "Loading dues…"
              : linkObligationOptions.length === 0
                ? form.direction === "DEBIT"
                  ? "No open dues for this person — the entry will just be tagged to them."
                  : "Nothing owed to you by this person — the entry will just be tagged to them."
                : selectedObligation
                  ? `Remaining after this entry: ${fmt(
                      Math.max(0, selectedObligation.outstanding - (parseFloat(form.amount) || 0))
                    )}`
                  : "Pick a due to reduce it, or leave as “none” to only tag the person."}
          </Typography>
        </Box>
      )}
    </>
  );
}
