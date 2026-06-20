// Shared validation for document uploads (tenant + payee). Defends against
// disallowed/oversize files and content-type spoofing: the declared MIME is
// checked against an allowlist AND verified against the file's magic bytes, and
// the stored extension is derived from the validated MIME — never from the
// client-supplied filename (which could carry a misleading or traversal-y ext).

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// Verify the leading bytes match the declared MIME so a renamed executable
// can't pass as an image/PDF/Word doc.
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
    case "application/pdf":
      return ascii(0, "%PDF");
    case "application/msword": // legacy OLE compound document
      return at(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document": // .docx = zip
      return at(0x50, 0x4b, 0x03, 0x04) || at(0x50, 0x4b, 0x05, 0x06);
    default:
      return false;
  }
}

/**
 * Validate an uploaded file and return a safe stored extension derived from its
 * (validated, content-verified) MIME type. Throws a user-safe Error on any
 * disallowed type, oversize file, or content that doesn't match its MIME.
 */
export function safeUploadExt(file: File, buffer: Buffer): string {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`File type not allowed: ${file.type}. Accepted: PDF, images, Word documents.`);
  }
  if (file.size > MAX_SIZE) {
    throw new Error(`File too large (max 10 MB): ${file.name}`);
  }
  if (!magicBytesMatch(buffer, file.type)) {
    throw new Error(`File content does not match its declared type (${file.type}).`);
  }
  return EXT_BY_MIME[file.type];
}
