import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Either the singleton client or a `db.$transaction` client. Services that may
 * be called as part of a larger atomic operation take one of these (defaulting
 * to `db`), so a caller can pass its transaction through and have the whole
 * unit of work roll back together.
 */
export type DbClient = Prisma.TransactionClient;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
