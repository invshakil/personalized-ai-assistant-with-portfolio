import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads", "payees");

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

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
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`File type not allowed: ${file.type}. Accepted: PDF, images, Word documents.`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large (max 10 MB): ${file.name}`);
  }

  const ext = path.extname(file.name) || "";
  const storedName = `${crypto.randomUUID()}${ext}`;
  const dir = await payeeDir(payeeId);
  const filePath = path.join(dir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
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
