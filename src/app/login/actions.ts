"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";

const email = z.email().max(254);

export async function requestMagicLink(_prev: string | null, formData: FormData) {
  const parsed = email.safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return "Enter a valid email address.";

  // redirect: false returns Auth.js's target URL instead of following it, so we can send
  // the user straight to our own page (or show the error here).
  const target = await signIn("resend", { email: parsed.data, redirectTo: "/dashboard", redirect: false });
  if (new URL(target, "http://x").searchParams.has("error")) {
    return "We couldn't send a sign-in link. If you asked for several links, wait a few minutes and try again.";
  }
  redirect("/login/check-email");
}
