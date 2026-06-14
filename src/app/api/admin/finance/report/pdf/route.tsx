import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { Document, Page, View, Text } from "@react-pdf/renderer";
import { renderToBuffer } from "@react-pdf/renderer";
import { getFinanceDashboard } from "@/services/finance";
import { s, pdfMoney, pdfDate, pdfResponse, BusinessHeader } from "@/services/finance/pdfKit";
import { getBusinessProfile } from "@/services/admin";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const label = searchParams.get("label") ?? "All time";

  const d = await getFinanceDashboard({ from, to });
  const business = await getBusinessProfile();
  const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

  const buffer = await renderToBuffer(
    <Document>
      <Page size="A4" style={s.page}>
        <BusinessHeader business={business} />
        <Text style={s.docType}>Financial Report — {label}</Text>
        <Text style={s.meta}>
          {from ? `${pdfDate(from)} to ${pdfDate(to)}` : "All recorded history"} · generated{" "}
          {pdfDate(new Date().toISOString())}
        </Text>
        <View style={s.divider} />

        {/* Totals */}
        <View style={s.row}>
          <Text style={s.label}>Total income</Text>
          <Text style={s.value}>{pdfMoney(d.totals.income)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Employee costs</Text>
          <Text style={s.value}>{pdfMoney(d.totals.empCosts)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Tools / subscriptions</Text>
          <Text style={s.value}>{pdfMoney(d.totals.toolSubs)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Net profit</Text>
          <Text style={s.value}>
            {pdfMoney(d.totals.netProfit)} ({pct(d.totals.margin)})
          </Text>
        </View>

        {/* P&L by fiscal year */}
        <Text style={s.sectionTitle}>Performance by Fiscal Year</Text>
        <View style={s.th}>
          <Text style={[s.thText, { flex: 1.4 }]}>Fiscal Year</Text>
          <Text style={[s.thText, { flex: 1, textAlign: "right" }]}>Income</Text>
          <Text style={[s.thText, { flex: 1, textAlign: "right" }]}>Emp</Text>
          <Text style={[s.thText, { flex: 1, textAlign: "right" }]}>Tools</Text>
          <Text style={[s.thText, { flex: 1, textAlign: "right" }]}>Profit</Text>
          <Text style={[s.thText, { flex: 0.7, textAlign: "right" }]}>Margin</Text>
        </View>
        {d.pnl.map((r) => (
          <View style={s.tr} key={r.fiscalYear}>
            <Text style={[s.trText, { flex: 1.4 }]}>{r.fiscalYear}</Text>
            <Text style={[s.trText, { flex: 1, textAlign: "right" }]}>{pdfMoney(r.income)}</Text>
            <Text style={[s.trText, { flex: 1, textAlign: "right" }]}>{pdfMoney(r.empCosts)}</Text>
            <Text style={[s.trText, { flex: 1, textAlign: "right" }]}>{pdfMoney(r.toolSubs)}</Text>
            <Text style={[s.trText, { flex: 1, textAlign: "right" }]}>{pdfMoney(r.netProfit)}</Text>
            <Text style={[s.trText, { flex: 0.7, textAlign: "right" }]}>{pct(r.margin)}</Text>
          </View>
        ))}

        {/* Income by client */}
        <Text style={s.sectionTitle}>Income by Client</Text>
        {d.bySource.map((src) => (
          <View style={s.tr} key={src.sourceId}>
            <Text style={[s.trText, { flex: 2 }]}>{src.name}</Text>
            <Text style={[s.trText, { flex: 1, textAlign: "right" }]}>{src.count} payments</Text>
            <Text style={[s.trText, { flex: 1, textAlign: "right" }]}>{pdfMoney(src.total)}</Text>
          </View>
        ))}

        {/* Salaries by employee */}
        <Text style={s.sectionTitle}>Salaries Paid by Employee</Text>
        {d.byEmployee.map((e) => (
          <View style={s.tr} key={e.employeeId}>
            <Text style={[s.trText, { flex: 2 }]}>{e.name}</Text>
            <Text style={[s.trText, { flex: 1, textAlign: "right" }]}>{pdfMoney(e.total)}</Text>
          </View>
        ))}

        {/* Remittance */}
        <Text style={s.sectionTitle}>Remittance Split</Text>
        <View style={s.row}>
          <Text style={s.label}>Remittance</Text>
          <Text style={s.value}>{pdfMoney(d.remittance.rem)}</Text>
        </View>
        <View style={s.row}>
          <Text style={s.label}>Non-remittance</Text>
          <Text style={s.value}>{pdfMoney(d.remittance.nonRem)}</Text>
        </View>

        <Text style={s.footer}>Computer-generated financial report — {business.name}</Text>
      </Page>
    </Document>
  );

  return pdfResponse(buffer, `financial-report-${label.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
