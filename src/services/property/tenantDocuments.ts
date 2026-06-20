import fs from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { safeUploadExt } from "./_uploads";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads", "tenants");

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
  const buffer = Buffer.from(await file.arrayBuffer());
  // Validates type/size/content and returns a safe extension from the MIME.
  const ext = safeUploadExt(file, buffer);
  const storedName = `${crypto.randomUUID()}${ext}`;
  const dir = await tenantDir(tenantId);
  const filePath = path.join(dir, storedName);

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
