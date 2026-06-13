/* Shared PDF building blocks for Financial Tracker documents.
   Uses @react-pdf/renderer (server-side). Standard PDF fonts lack the ৳ glyph,
   so amounts are rendered as "BDT 1,23,456" (en-IN grouping), matching the
   property receipt convention. */
import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

export const BUSINESS_NAME = "Syful Islam Shakil";
export const BUSINESS_TAGLINE = "Software Engineering & Consulting";

export function pdfMoney(n: number): string {
  return `BDT ${Math.round(n).toLocaleString("en-IN")}`;
}

export function pdfDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, color: "#2a2a35", padding: 40 },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#1a1a2e" },
  tagline: { fontSize: 8, color: "#888", marginBottom: 2 },
  docType: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#7367f0", marginTop: 10 },
  meta: { fontSize: 8, color: "#888", marginBottom: 12 },
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
  th: { flexDirection: "row", borderBottom: "1 solid #ccc", paddingBottom: 4, marginBottom: 4 },
  thText: { fontFamily: "Helvetica-Bold", fontSize: 8, color: "#555" },
  tr: { flexDirection: "row", paddingVertical: 3, borderBottom: "0.5 solid #eee" },
  trText: { fontSize: 8 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a1a2e", marginTop: 16, marginBottom: 6 },
});

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
        <Text style={s.brand}>{BUSINESS_NAME}</Text>
        <Text style={s.tagline}>{BUSINESS_TAGLINE}</Text>
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

/** Build the standard PDF HTTP response. */
export function pdfResponse(buffer: Buffer | Uint8Array, filename: string): Response {
  return new Response(buffer as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
