import "server-only";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMagicLink } from "@/lib/magic-link";

// Auth.js: magic-link login via Resend, sessions stored in the database.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  secret: env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Resend({
      apiKey: env.AUTH_RESEND_KEY,
      from: env.EMAIL_FROM,
      maxAge: 30 * 60, // links expire after 30 minutes
      normalizeIdentifier: (email) => email.trim().toLowerCase(),
      sendVerificationRequest: sendMagicLink,
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/login/check-email",
    error: "/login",
  },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
