import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { safeUploadExt } from "./_uploads";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads", "payees");

async function payeeDir(payeeId: string) {
  const dir = path.join(UPLOADS_ROOT, payeeId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function getPayeeDocuments(payeeId: string) {
  return db.payeeDocument.findMany({
    where: { payeeId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function uploadPayeeDocument(payeeId: string, file: File, label?: string) {
  const buffer = Buffer.from(await file.arrayBuffer());
  // Validates type/size/content and returns a safe extension from the MIME.
  const ext = safeUploadExt(file, buffer);
  const storedName = `${crypto.randomUUID()}${ext}`;
  const dir = await payeeDir(payeeId);
  const filePath = path.join(dir, storedName);

  await fs.writeFile(filePath, buffer);

  return db.payeeDocument.create({
    data: {
      payeeId,
      fileName: file.name,
      storedName,
      mimeType: file.type,
      size: file.size,
      label: label || null,
    },
  });
}

export async function readPayeeDocument(docId: string) {
  const doc = await db.payeeDocument.findUnique({ where: { id: docId } });
  if (!doc) return null;
  const filePath = path.join(UPLOADS_ROOT, doc.payeeId, doc.storedName);
  try {
    const buffer = await fs.readFile(filePath);
    return { doc, buffer };
  } catch {
    return null;
  }
}

export async function deletePayeeDocument(docId: string) {
  const doc = await db.payeeDocument.findUnique({ where: { id: docId } });
  if (!doc) throw new Error("Document not found");
  const filePath = path.join(UPLOADS_ROOT, doc.payeeId, doc.storedName);
  try {
    await fs.unlink(filePath);
  } catch {
    // file already missing — still remove the DB record
  }
  await db.payeeDocument.delete({ where: { id: docId } });
  return { deleted: true };
}
