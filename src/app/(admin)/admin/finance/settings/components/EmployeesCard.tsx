import { Box, Chip } from "@mui/material";
import { fmt } from "../../format";
import type { EmployeeRow } from "../../types";
import SettingsListCard from "./SettingsListCard";

interface Props {
  employees: EmployeeRow[];
  onAdd: () => void;
  onEdit: (item: EmployeeRow) => void;
  onDelete: (id: string) => void;
}

export default function EmployeesCard({ employees, onAdd, onEdit, onDelete }: Props) {
  return (
    <SettingsListCard
      title="Employees"
      items={employees}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
      renderPrimary={(emp) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {emp.name}
          {!emp.isActive && (
            <Chip size="small" label="Inactive" variant="outlined" color="default" />
          )}
        </Box>
      )}
      renderSecondary={(emp) =>
        `${emp.phone ? emp.phone + " · " : ""}${emp.paymentCount} payments · ${fmt(emp.totalPaid)}`
      }
    />
  );
}
