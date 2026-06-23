// Chat attachment storage. Files are written to ./uploads/chat/YYYY/MM/<cuid>.<ext>
// so they're outside the public served tree — receipts can carry sensitive
// financial info. Reads go through the auth-gated /api/admin/ai/uploads/[file]
// route. The Anthropic adapter reads the bytes back at send time and embeds
// them as a base64 image content block (Claude vision).
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const UPLOADS_ROOT = path.join(process.cwd(), "uploads", "chat");

// Images only for chat attachments — that's what Claude's vision supports.
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function magicBytesMatch(buf: Buffer, mime: string): boolean {
  const at = (...sig: number[]) => sig.every((b, i) => buf[i] === b);
  const ascii = (off: number, s: string) =>
    [...s].every((c, i) => buf[off + i] === c.charCodeAt(0));
  switch (mime) {
    case "image/jpeg":
      return at(0xff, 0xd8, 0xff);
    case "image/png":
      return at(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case "image/webp":
      return ascii(0, "RIFF") && ascii(8, "WEBP");
    case "image/gif":
      return ascii(0, "GIF87a") || ascii(0, "GIF89a");
    default:
      return false;
  }
}

/** Files are named "YYYY/MM/<cuid>.<ext>" — the URL stores the same relative path. */
function buildRelativePath(ext: string): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return path.posix.join(String(y), m, `${randomUUID()}${ext}`);
}

/** Map a stored relative URL back to its on-disk path. Refuses anything that
 *  escapes the chat-uploads root (defense in depth — the route already
 *  whitelists shape, but normalize+contains is the canonical check). */
function resolveStoredPath(relUrlPath: string): string | null {
  const safe = path
    .normalize(relUrlPath)
    .replace(/^([./\\])+/, "") // strip leading separators / traversal hops
    .replace(/\\/g, "/"); // posix-style
  const full = path.join(UPLOADS_ROOT, safe);
  if (!full.startsWith(UPLOADS_ROOT + path.sep)) return null;
  return full;
}

export interface UploadResult {
  url: string; // "/api/admin/ai/uploads/YYYY/MM/<cuid>.<ext>"
  mimeType: string;
  sizeBytes: number;
}

export async function saveChatAttachment(file: File): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(`File type not allowed: ${file.type}. Images only (JPEG, PNG, WebP, GIF).`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large (max 10 MB): ${file.name}`);
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!magicBytesMatch(buffer, file.type)) {
    throw new Error(`File content does not match its declared type (${file.type}).`);
  }
  const ext = EXT_BY_MIME[file.type];
  const rel = buildRelativePath(ext);
  const full = path.join(UPLOADS_ROOT, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, buffer);
  return {
    url: `/api/admin/ai/uploads/${rel}`,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

/** Read an attachment's raw bytes by its stored URL. Returns null if missing
 *  or outside the uploads root. */
export async function readChatAttachment(
  url: string
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const PREFIX = "/api/admin/ai/uploads/";
  if (!url.startsWith(PREFIX)) return null;
  const full = resolveStoredPath(url.slice(PREFIX.length));
  if (!full) return null;
  try {
    const buffer = await fs.readFile(full);
    const ext = path.extname(full).toLowerCase();
    const mimeType =
      ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : "image/jpeg";
    return { buffer, mimeType };
  } catch {
    return null;
  }
}
