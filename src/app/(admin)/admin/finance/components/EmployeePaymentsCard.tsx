import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import EntityLink from "@/components/admin/EntityLink";
import type { FinanceDashboardData } from "../types";
import { fmt } from "../format";

interface EmployeePaymentsCardProps {
  fiscalYears: FinanceDashboardData["fiscalYears"];
  byEmployee: FinanceDashboardData["byEmployee"];
}

export default function EmployeePaymentsCard({
  fiscalYears,
  byEmployee,
}: EmployeePaymentsCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
          Salaries Paid by Employee
        </Typography>
        <TableContainer>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                {fiscalYears.map((fy) => (
                  <TableCell key={fy} align="right">
                    {fy}
                  </TableCell>
                ))}
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {byEmployee.map((e) => (
                <TableRow key={e.employeeId} hover>
                  <TableCell data-label="Employee" sx={{ fontWeight: 600 }}>
                    <EntityLink href={`/admin/finance/employees/${e.employeeId}`}>
                      {e.name}
                    </EntityLink>
                  </TableCell>
                  {fiscalYears.map((fy) => (
                    <TableCell key={fy} align="right" data-label={fy}>
                      {e.byFiscalYear[fy] ? fmt(e.byFiscalYear[fy]) : "—"}
                    </TableCell>
                  ))}
                  <TableCell align="right" data-label="Total" sx={{ fontWeight: 600 }}>
                    {fmt(e.total)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
