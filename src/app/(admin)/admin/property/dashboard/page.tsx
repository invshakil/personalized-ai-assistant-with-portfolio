import dynamic from "next/dynamic";
import { Box, CircularProgress } from "@mui/material";

export const metadata = { title: "Property Dashboard" };

const PropertyDashboardPage = dynamic(() => import("./PropertyDashboardPage"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
      <CircularProgress />
    </Box>
  ),
});

export default function Page() {
  return <PropertyDashboardPage />;
}
