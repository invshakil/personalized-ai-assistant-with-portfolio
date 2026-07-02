import { Grid } from "@mui/material";
import { useRouter } from "next/navigation";
import type { UnitWithTenant } from "@/types";
import UnitCard from "./UnitCard";

interface UnitGridProps {
  units: UnitWithTenant[];
}

export default function UnitGrid({ units }: UnitGridProps) {
  const router = useRouter();

  return (
    <Grid container spacing={2}>
      {units.map((unit) => (
        <Grid key={unit.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <UnitCard unit={unit} onClick={() => router.push(`/admin/property/units/${unit.id}`)} />
        </Grid>
      ))}
    </Grid>
  );
}
