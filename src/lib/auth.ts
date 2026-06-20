import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { lockoutRemainingMs, recordFailedLogin, clearLoginAttempts } from "@/lib/loginRateLimit";

// Pre-computed bcrypt hash (same cost as real passwords) compared against when
// no matching user/hash exists, so a missing account and a wrong password cost
// the same time — defeats login timing / user-enumeration.
const DUMMY_HASH = bcrypt.hashSync("invalid-placeholder-password", 12);

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email as string;

        // Brute-force guard: once locked, reject without touching the DB or
        // bcrypt so repeated guesses cost nothing and can't be timed.
        if (lockoutRemainingMs(email) > 0) return null;

        const user = await db.user.findUnique({ where: { email } });

        // Always run bcrypt.compare — against the real hash, or a dummy of the
        // same cost when the user/password is absent — so a missing account and
        // a wrong password take the same time and can't be told apart by timing
        // (user enumeration). DUMMY_HASH is a bcrypt hash of a random string.
        const hashToCheck = user?.password ?? DUMMY_HASH;
        const valid = await bcrypt.compare(credentials.password as string, hashToCheck);

        if (!user?.password || !valid) {
          recordFailedLogin(email);
          return null;
        }

        clearLoginAttempts(email);
        return { id: user.id, email: user.email, name: user.name, role: user.role };
      },
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.appVersion = process.env.APP_VERSION ?? "1.0";
      }
      // Force re-auth whenever APP_VERSION is bumped in .env.local
      if (token.appVersion !== (process.env.APP_VERSION ?? "1.0")) {
        return null as unknown as typeof token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    // Cap the admin session lifetime (NextAuth defaults to 30 days). A bumped
    // APP_VERSION still force-expires sessions earlier (see jwt callback).
    maxAge: 60 * 60 * 12, // 12 hours
  },
});
