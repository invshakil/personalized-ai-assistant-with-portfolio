import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPropertySettings } from "@/services/property";
import { NextRequest } from "next/server";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";

const MONTH_LABELS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TX_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  ADVANCE_APPLIED: "Advance Applied",
  ADJUSTMENT: "Adjustment",
  OTHER: "Other",
};

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, color: "#333", padding: 30 },
  half: { flex: 1, paddingVertical: 8 },
  cut: {
    borderBottom: "1 dashed #aaa",
    marginVertical: 10,
    paddingBottom: 4,
    alignItems: "center",
  },
  cutText: { fontSize: 8, color: "#aaa" },
  header: { marginBottom: 8 },
  propertyName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#1a1a2e", marginBottom: 2 },
  subTitle: { fontSize: 8, color: "#666", marginBottom: 1 },
  divider: { borderBottom: "0.5 solid #ccc", marginVertical: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  label: { color: "#666" },
  value: { fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#555", marginBottom: 4, marginTop: 6 },
  lineItem: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 4,
    borderTop: "0.5 solid #ccc",
    fontFamily: "Helvetica-Bold",
  },
  statusChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    alignSelf: "flex-start",
    marginTop: 6,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 4,
  },
  signatureLine: { borderTop: "0.5 solid #aaa", width: 100, paddingTop: 3, fontSize: 7, color: "#888" },
  copyBadge: { fontSize: 7, color: "#999", marginBottom: 4, fontFamily: "Helvetica-Bold" },
});

function fmt(n: number) {
  return `BDT ${n.toLocaleString()}`;
}

type TxRow = { type: string; amount: number; date: Date };
type ServiceRow = { name: string; fee: number };

interface HalfProps {
  label: string;
  propertyName: string;
  ownerName: string;
  ownerPhone: string;
  address: string;
  bankAccount: string | null;
  tenantName: string;
  tenantCode: string;
  unitNumber: string;
  month: number;
  year: number;
  rentDue: number;
  amountPaid: number;
  advanceApplied: number;
  balance: number;
  status: string;
  receiptNumber: string;
  issuedDate: string;
  transactions: TxRow[];
  baseRent: number;
  services: ServiceRow[];
}

function ReceiptHalf(props: HalfProps) {
  const {
    label, propertyName, ownerName, ownerPhone, address, bankAccount,
    tenantName, tenantCode, unitNumber, month, year,
    rentDue, amountPaid, advanceApplied, balance, status,
    receiptNumber, issuedDate, transactions, baseRent, services,
  } = props;
  const statusColor = status === "PAID" ? "#28c76f" : status === "PARTIAL" ? "#ff9f43" : "#ea5455";

  return (
    <View style={s.half}>
      <Text style={s.copyBadge}>[{label}]</Text>
      <View style={s.header}>
        <Text style={s.propertyName}>{propertyName}</Text>
        <Text style={s.subTitle}>{address}</Text>
        <Text style={s.subTitle}>Owner: {ownerName}{ownerPhone ? ` · ${ownerPhone}` : ""}</Text>
        {bankAccount && <Text style={s.subTitle}>Bank: {bankAccount}</Text>}
      </View>

      <View style={s.divider} />

      <View style={s.row}>
        <View>
          <Text style={[s.value, { fontSize: 11 }]}>PAYMENT RECEIPT</Text>
          <Text style={s.subTitle}>Issued: {issuedDate}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[s.value, { fontSize: 9 }]}>{receiptNumber}</Text>
          <Text style={s.subTitle}>Billing: {MONTH_LABELS[month - 1]} {year}</Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.row}>
        <Text style={s.label}>Tenant</Text>
        <Text style={s.value}>{tenantName} ({tenantCode})</Text>
      </View>
      <View style={s.row}>
        <Text style={s.label}>Unit</Text>
        <Text style={s.value}>{unitNumber}</Text>
      </View>

      <View style={s.divider} />

      <Text style={s.sectionTitle}>BILL BREAKDOWN</Text>
      <View style={s.lineItem}>
        <Text style={s.label}>Base Rent</Text>
        <Text>{fmt(baseRent)}</Text>
      </View>
      {services.map((sv) => (
        <View key={sv.name} style={s.lineItem}>
          <Text style={s.label}>{sv.name}</Text>
          <Text>{fmt(sv.fee)}</Text>
        </View>
      ))}
      <View style={s.totalRow}>
        <Text>Total Due</Text>
        <Text>{fmt(rentDue)}</Text>
      </View>

      <Text style={s.sectionTitle}>PAYMENTS RECEIVED</Text>
      {transactions.length > 0 ? (
        transactions.map((tx, i) => (
          <View key={i} style={s.lineItem}>
            <Text style={s.label}>
              {new Date(tx.date).toLocaleDateString()} · {TX_LABELS[tx.type] ?? tx.type}
            </Text>
            <Text>{fmt(tx.amount)}</Text>
          </View>
        ))
      ) : (
        <Text style={s.label}>No payments recorded</Text>
      )}
      <View style={s.totalRow}>
        <Text>Total Paid</Text>
        <Text>{fmt(amountPaid + advanceApplied)}</Text>
      </View>
      {advanceApplied > 0 && (
        <View style={s.lineItem}>
          <Text style={s.label}>  (incl. advance applied)</Text>
          <Text style={s.label}>{fmt(advanceApplied)}</Text>
        </View>
      )}
      <View style={s.lineItem}>
        <Text style={[s.value, { marginTop: 2 }]}>Balance Due</Text>
        <Text style={[s.value, { color: balance > 0 ? "#ea5455" : "#28c76f", marginTop: 2 }]}>
          {fmt(balance)}
        </Text>
      </View>

      <View style={[s.statusChip, { backgroundColor: statusColor }]}>
        <Text style={{ color: "#fff" }}>{status}</Text>
      </View>

      <View style={s.signatureRow}>
        <View style={s.signatureLine}>
          <Text>Tenant Signature</Text>
        </View>
        <View style={s.signatureLine}>
          <Text>Shakil</Text>
        </View>
      </View>
    </View>
  );
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [payment, settings] = await Promise.all([
    db.payment.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            name: true,
            tenantCode: true,
            services: { where: { isActive: true }, include: { service: true } },
          },
        },
        unit: { select: { unitNumber: true, monthlyRent: true } },
        transactions: { orderBy: { date: "asc" } },
      },
    }),
    getPropertySettings(),
  ]);

  if (!payment) return Response.json({ error: "Not found" }, { status: 404 });

  const receiptNumber = payment.receiptNumber ?? `RCP-${payment.year}-${id.slice(-4).toUpperCase()}`;
  const issuedDate = new Date().toLocaleDateString("en-GB");
  const tenantCode = payment.tenant.tenantCode ?? "N/A";
  const unitNumber = payment.unit?.unitNumber ?? "—";
  const baseRent = Number(payment.unit?.monthlyRent ?? 0);
  const services: ServiceRow[] = payment.tenant.services.map((ts) => ({
    name: ts.service.name,
    fee: Number(ts.monthlyFee),
  }));
  const transactions: TxRow[] = payment.transactions.map((tx) => ({
    type: tx.type,
    amount: Number(tx.amount),
    date: tx.date,
  }));

  const halfProps: HalfProps = {
    label: "",
    propertyName: settings.propertyName,
    ownerName: settings.ownerName,
    ownerPhone: settings.ownerPhone,
    address: settings.address,
    bankAccount: settings.bankAccount,
    tenantName: payment.tenant.name,
    tenantCode,
    unitNumber,
    month: payment.month,
    year: payment.year,
    rentDue: Number(payment.rentDue),
    amountPaid: Number(payment.amountPaid),
    advanceApplied: Number(payment.advanceApplied),
    balance: Number(payment.rentDue) - Number(payment.amountPaid) - Number(payment.advanceApplied),
    status: payment.status,
    receiptNumber,
    issuedDate,
    transactions,
    baseRent,
    services,
  };

  const buffer = await renderToBuffer(
    <Document>
      <Page size="A4" style={s.page}>
        <ReceiptHalf {...halfProps} label="TENANT COPY" />
        <View style={s.cut}>
          <Text style={s.cutText}>- - - - - - - - - - - - - - cut here - - - - - - - - - - - - - -</Text>
        </View>
        <ReceiptHalf {...halfProps} label="OWNER COPY" />
      </Page>
    </Document>
  );

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${receiptNumber}.pdf"`,
    },
  });
}
