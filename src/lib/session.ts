import "server-only";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { env } from "@/lib/env";

export type CurrentUser = { id: string; email: string; isAdmin: boolean };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();
  if (!id || !email) return null;
  return { id, email, isAdmin: env.ADMIN_EMAILS.includes(email) };
}

// Use in every page and server action that needs a logged-in user.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Admin pages and actions. Non-admins get a 404 so the admin area stays invisible.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user?.isAdmin) notFound();
  return user;
}
