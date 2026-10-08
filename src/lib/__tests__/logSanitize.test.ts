import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeContext, prepareContext } from "../logSanitize";

test("redacts secret-looking keys at any depth", () => {
  const out = sanitizeContext({ email: "a@b.c", password: "x", nested: { apiKey: "k", ok: 1 } });
  assert.deepEqual(out, {
    email: "a@b.c",
    password: "[redacted]",
    nested: { apiKey: "[redacted]", ok: 1 },
  });
});

test("turns Errors into plain objects", () => {
  const out = sanitizeContext(new Error("boom")) as { name: string; message: string };
  assert.equal(out.name, "Error");
  assert.equal(out.message, "boom");
});

test("empty context stores null; oversized context is truncated", () => {
  assert.equal(prepareContext(undefined), null);
  const big = prepareContext({ blob: "x".repeat(20000) }) as { truncated?: boolean };
  assert.equal(big.truncated, true);
});
