// Pure helpers that make an arbitrary log context safe to store (no DB access).
import type { Prisma } from "@prisma/client";

const MAX_CONTEXT_JSON = 8000;
const SECRET_KEY = /pass(word)?|secret|token|authorization|cookie|api[-_]?key/i;

/** Redact secret-looking keys, turn Errors into plain objects, cap depth. */
export function sanitizeContext(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.split("\n").slice(0, 8),
    };
  }
  if (value === null || typeof value !== "object") {
    return typeof value === "bigint" ? value.toString() : value;
  }
  if (depth >= 4) return "[truncated]";
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => sanitizeContext(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SECRET_KEY.test(k) ? "[redacted]" : sanitizeContext(v, depth + 1);
  }
  return out;
}

/** Sanitised context as JSON-safe value, or null if empty / too large to store. */
export function prepareContext(context: unknown): Prisma.InputJsonValue | null {
  if (context === undefined || context === null) return null;
  const clean = sanitizeContext(context);
  const json = JSON.stringify(clean);
  if (json.length > MAX_CONTEXT_JSON) {
    return { truncated: true, preview: json.slice(0, MAX_CONTEXT_JSON) };
  }
  return clean as Prisma.InputJsonValue;
}
