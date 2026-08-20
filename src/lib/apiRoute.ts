// Error envelope for mutating API route handlers.
//
// Every admin API route answers `{ data, error }`, and the Axios client in
// src/lib/api/client.ts reads `error` off the response body to build the Error
// it throws to the UI. A handler that lets a service error escape breaks that
// contract: Next.js returns a bodyless 500, `data.error` is undefined, and the
// drawer/dialog shows "Request failed with status code 500" instead of the
// reason. Wrap mutating handlers in `withApiError` so the thrown message lands
// in the envelope the client already knows how to read.
import { Prisma } from "@prisma/client";

/** Services that need a specific HTTP status carry one on the error. */
function statusOf(e: unknown): number | null {
  if (e && typeof e === "object" && "status" in e) {
    const s = (e as { status: unknown }).status;
    if (typeof s === "number" && s >= 400 && s < 600) return s;
  }
  return null;
}

/**
 * Map an error to its `{ error, status }` envelope.
 *
 * Service-thrown `Error`s are user-facing validation messages ("Cannot post a
 * USD record into a EUR account"), so they answer 400 with the message intact.
 * Prisma's known request errors get the status their code implies. Anything
 * else is a bug, not a message for the user — log it and answer 500 generically
 * rather than leaking an internal stack message into the UI.
 */
export function toErrorResponse(e: unknown): { error: string; status: number } {
  const explicit = statusOf(e);
  if (explicit && e instanceof Error) return { error: e.message, status: explicit };

  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case "P2025":
        return { error: "Record not found.", status: 404 };
      case "P2002":
        return { error: "That already exists — the value must be unique.", status: 409 };
      case "P2003":
        return { error: "Related record not found.", status: 400 };
      default:
        return { error: "The database rejected this change.", status: 400 };
    }
  }

  if (e instanceof Prisma.PrismaClientValidationError) {
    console.error("[api] prisma validation error", e);
    return { error: "Invalid data for this operation.", status: 400 };
  }

  if (e instanceof Error) return { error: e.message, status: 400 };

  console.error("[api] non-Error thrown", e);
  return { error: "Something went wrong.", status: 500 };
}

/**
 * Wrap a route handler so anything it throws becomes `{ error }` JSON with a
 * sensible status. Signature is preserved, so `(req)` and
 * `(req, { params })` handlers both wrap unchanged.
 */
export function withApiError<A extends unknown[]>(
  handler: (...args: A) => Promise<Response>
): (...args: A) => Promise<Response> {
  return async (...args: A) => {
    try {
      return await handler(...args);
    } catch (e) {
      const { error, status } = toErrorResponse(e);
      if (status >= 500) console.error("[api] unhandled route error", e);
      return Response.json({ error }, { status });
    }
  };
}
