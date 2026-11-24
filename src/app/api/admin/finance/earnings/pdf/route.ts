import { NextRequest } from "next/server";
import { GET as exportEarnings } from "../export/route";

// Legacy path of the earnings PDF. The statement now lives at
// /api/admin/finance/earnings/export (CSV + PDF, every list filter); this keeps
// old links working by answering with that route's PDF for the same query.
// Auth is enforced by the export handler.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set("format", "pdf");
  return exportEarnings(new NextRequest(url, { headers: req.headers }));
}
