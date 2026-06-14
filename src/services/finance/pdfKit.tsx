/* Shared PDF building blocks for Financial Tracker documents.
   Uses @react-pdf/renderer (server-side). Standard PDF fonts lack the ৳ glyph,
   so amounts are rendered as "BDT 1,23,456" (en-IN grouping). */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

// ── Business identity shown on every document header ─────────────────────────
// EDIT these to your real company details — they appear on all receipts/reports.
export const BUSINESS = {
  name: "Syful Islam Shakil",
  tagline: "Software Engineering & Consulting",
  address: "Dhaka, Bangladesh",
  phone: "+880 1675 332 265",
  email: "syful.shakil.it@gmail.com",
};

// Back-compat aliases (older imports).
export const BUSINESS_NAME = BUSINESS.name;
export const BUSINESS_TAGLINE = BUSINESS.tagline;

export function pdfMoney(n: number): string {
  return `BDT ${Math.round(n).toLocaleString("en-IN")}`;
}

export function pdfDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#2a2a35", padding: 40 },
  // header
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1a1a2e" },
  tagline: { fontSize: 8, color: "#888", marginBottom: 2 },
  contact: { fontSize: 8, color: "#666", marginTop: 1 },
  contactBlock: { textAlign: "right", maxWidth: 220 },
  docType: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#7367f0", marginTop: 12 },
  meta: { fontSize: 8, color: "#888", marginBottom: 10 },
  divider: { borderBottom: "1 solid #e0e0e8", marginVertical: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { color: "#777" },
  value: { fontFamily: "Helvetica-Bold" },
  amountBox: {
    backgroundColor: "#f4f3ff",
    borderRadius: 4,
    padding: 12,
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: { fontSize: 9, color: "#555" },
  amountValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1a1a2e" },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 50 },
  signLine: { borderTop: "0.5 solid #aaa", width: 160, paddingTop: 4, fontSize: 8, color: "#888" },
  footer: { position: "absolute", bottom: 28, left: 40, right: 40, fontSize: 7, color: "#aaa", textAlign: "center" },
  // table
  th: { flexDirection: "row", borderBottom: "1 solid #ccc", paddingBottom: 4, marginBottom: 2 },
  thText: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#555" },
  tr: { flexDirection: "row", paddingVertical: 4, borderBottom: "0.5 solid #eee" },
  trText: { fontSize: 8 },
  totalRow: { flexDirection: "row", paddingTop: 6, marginTop: 2, borderTop: "1 solid #ccc" },
  totalText: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a1a2e", marginTop: 16, marginBottom: 6 },
});

/** Letterhead block: business name + tagline on the left, contact info right. */
export function BusinessHeader() {
  return (
    <View style={s.headerRow}>
      <View>
        <Text style={s.brand}>{BUSINESS.name}</Text>
        <Text style={s.tagline}>{BUSINESS.tagline}</Text>
      </View>
      <View style={s.contactBlock}>
        <Text style={s.contact}>{BUSINESS.address}</Text>
        <Text style={s.contact}>{BUSINESS.phone}</Text>
        <Text style={s.contact}>{BUSINESS.email}</Text>
      </View>
    </View>
  );
}

export interface ReceiptField {
  label: string;
  value: string;
}

/** A single-record receipt/voucher (salary, income, expense). */
export function ReceiptDocument(props: {
  docType: string;
  generatedAt: string;
  fields: ReceiptField[];
  amountLabel: string;
  amount: number;
  footerNote?: string;
  leftSignLabel?: string;
  rightSignLabel?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <BusinessHeader />
        <Text style={s.docType}>{props.docType}</Text>
        <Text style={s.meta}>Generated {props.generatedAt}</Text>
        <View style={s.divider} />
        {props.fields.map((f, i) => (
          <View style={s.row} key={i}>
            <Text style={s.label}>{f.label}</Text>
            <Text style={s.value}>{f.value}</Text>
          </View>
        ))}
        <View style={s.amountBox}>
          <Text style={s.amountLabel}>{props.amountLabel}</Text>
          <Text style={s.amountValue}>{pdfMoney(props.amount)}</Text>
        </View>
        <View style={s.signRow}>
          <Text style={s.signLine}>{props.leftSignLabel ?? "Received by"}</Text>
          <Text style={s.signLine}>{props.rightSignLabel ?? "Authorised by"}</Text>
        </View>
        {props.footerNote && <Text style={s.footer}>{props.footerNote}</Text>}
      </Page>
    </Document>
  );
}

export interface ListColumn {
  label: string;
  flex: number;
  align?: "left" | "right";
}

/** A multi-row listing/statement PDF (e.g. "download all" exports). */
export function ListDocument(props: {
  docType: string;
  generatedAt: string;
  subtitle?: string;
  columns: ListColumn[];
  rows: string[][];
  totalLabel?: string;
  totalValue?: string;
  footerNote?: string;
}) {
  const cell = (text: string, col: ListColumn, key: number, bold = false) => (
    <Text
      key={key}
      style={[
        bold ? s.thText : s.trText,
        { flex: col.flex, textAlign: col.align ?? "left", paddingRight: 4 },
      ]}
    >
      {text}
    </Text>
  );
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <BusinessHeader />
        <Text style={s.docType}>{props.docType}</Text>
        <Text style={s.meta}>
          {props.subtitle ? `${props.subtitle} · ` : ""}
          {props.rows.length} {props.rows.length === 1 ? "entry" : "entries"} · generated{" "}
          {props.generatedAt}
        </Text>

        <View style={s.th}>{props.columns.map((c, i) => cell(c.label, c, i, true))}</View>
        {props.rows.map((r, ri) => (
          <View style={s.tr} key={ri} wrap={false}>
            {props.columns.map((c, ci) => cell(r[ci] ?? "", c, ci))}
          </View>
        ))}

        {props.totalValue != null && (
          <View style={s.totalRow}>
            <Text style={[s.totalText, { flex: 1 }]}>{props.totalLabel ?? "Total"}</Text>
            <Text style={[s.totalText, { textAlign: "right" }]}>{props.totalValue}</Text>
          </View>
        )}

        <Text style={s.footer}>{props.footerNote ?? `Computer-generated — ${BUSINESS.name}`}</Text>
      </Page>
    </Document>
  );
}

/** Build the standard PDF HTTP response. */
export function pdfResponse(buffer: Buffer | Uint8Array, filename: string): Response {
  return new Response(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
