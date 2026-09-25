import "server-only";
import type { EmailConfig } from "next-auth/providers";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { hashForKey, rateLimit } from "@/lib/rate-limit";

type Params = Parameters<EmailConfig["sendVerificationRequest"]>[0];

// Sends the sign-in email. Rate-limited here (not only in the login form) because the
// Auth.js endpoint can be called directly. A thrown error sends the user to /login?error=...
export async function sendMagicLink({ identifier: email, url, request }: Params) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const [emailOk, ipOk] = await Promise.all([
    rateLimit(`signin-email:${hashForKey(email)}`, 5, 60 * 60),
    rateLimit(`signin-ip:${hashForKey(ip)}`, 20, 60 * 60),
  ]);
  if (!emailOk || !ipOk) throw new Error("Too many sign-in emails requested.");

  if (!env.AUTH_RESEND_KEY && env.NODE_ENV === "development") {
    console.log(`\n[dev] Magic link for ${email}:\n${url}\n`);
    return;
  }

  await sendEmail({
    to: email,
    subject: `Your ${env.APP_NAME} sign-in link`,
    text: `Sign in to ${env.APP_NAME}:\n${url}\n\nThe link expires in 30 minutes. If you didn't ask for it, ignore this email.`,
    html: emailHtml(url),
  });
}

function emailHtml(url: string) {
  const safeUrl = url.replace(/"/g, "&quot;");
  return `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
<h1 style="font-size:20px">Sign in to ${env.APP_NAME}</h1>
<p><a href="${safeUrl}" style="display:inline-block;background:#18181b;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Sign in</a></p>
<p style="color:#71717a;font-size:13px">The link expires in 30 minutes. If you didn't ask for it, ignore this email.</p>
</div>`;
}
