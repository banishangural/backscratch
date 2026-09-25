import "server-only";
import { env } from "@/lib/env";

// Sends one email through Resend. In development without AUTH_RESEND_KEY, prints it to the
// server console instead. Throws when sending fails; callers decide whether that matters.
export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  if (!env.AUTH_RESEND_KEY) {
    if (env.NODE_ENV !== "development") throw new Error("AUTH_RESEND_KEY is not set.");
    console.log(`\n[dev] Email to ${to}: ${subject}\n${text}\n`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.AUTH_RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: env.EMAIL_FROM, to, subject, text, ...(html && { html }) }),
  });
  if (!res.ok) throw new Error(`Resend responded with ${res.status}.`);
}
