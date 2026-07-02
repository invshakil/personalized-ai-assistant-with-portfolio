import { Box, Button, Tab, Tabs } from "@mui/material";
import { Plus } from "lucide-react";

interface PropertyTabsHeaderProps {
  tab: number;
  onTabChange: (i: number) => void;
  unitsCount: number;
  activeTenantsCount: number;
  externalTenantsCount: number;
  onAddTenant: () => void;
  onAddExternal: () => void;
}

export default function PropertyTabsHeader({
  tab,
  onTabChange,
  unitsCount,
  activeTenantsCount,
  externalTenantsCount,
  onAddTenant,
  onAddExternal,
}: PropertyTabsHeaderProps) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
      <Tabs
        value={tab}
        onChange={(_, v) => onTabChange(v)}
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Tab label={`Units (${unitsCount})`} />
        <Tab label={`Tenants (${activeTenantsCount})`} />
        <Tab label={`External Members (${externalTenantsCount})`} />
      </Tabs>
      <Box sx={{ display: "flex", gap: 1 }}>
        {tab === 2 ? (
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={14} />}
            onClick={onAddExternal}
          >
            Add External Member
          </Button>
        ) : (
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={14} />}
            onClick={onAddTenant}
          >
            Add Tenant
          </Button>
        )}
      </Box>
    </Box>
  );
}
