import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads", "tenants");

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

async function tenantDir(tenantId: string) {
  const dir = path.join(UPLOADS_ROOT, tenantId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function getDocuments(tenantId: string) {
  return db.tenantDocument.findMany({
    where: { tenantId },
    orderBy: { uploadedAt: "desc" },
  });
}

export async function uploadDocument(tenantId: string, file: File, label?: string) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`File type not allowed: ${file.type}. Accepted: PDF, images, Word documents.`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large (max 10 MB): ${file.name}`);
  }

  const ext = path.extname(file.name) || "";
  const storedName = `${crypto.randomUUID()}${ext}`;
  const dir = await tenantDir(tenantId);
  const filePath = path.join(dir, storedName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return db.tenantDocument.create({
    data: {
      tenantId,
      fileName: file.name,
      storedName,
      mimeType: file.type,
      size: file.size,
      label: label || null,
    },
  });
}

export async function readDocument(docId: string) {
  const doc = await db.tenantDocument.findUnique({ where: { id: docId } });
  if (!doc) return null;
  const filePath = path.join(UPLOADS_ROOT, doc.tenantId, doc.storedName);
  try {
    const buffer = await fs.readFile(filePath);
    return { doc, buffer };
  } catch {
    return null;
  }
}

export async function deleteDocument(docId: string) {
  const doc = await db.tenantDocument.findUnique({ where: { id: docId } });
  if (!doc) throw new Error("Document not found");
  const filePath = path.join(UPLOADS_ROOT, doc.tenantId, doc.storedName);
  try {
    await fs.unlink(filePath);
  } catch {
    // file already missing — still remove the DB record
  }
  await db.tenantDocument.delete({ where: { id: docId } });
  return { deleted: true };
}
