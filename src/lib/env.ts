import "server-only";
import { z } from "zod";

// Server-side environment, validated once at startup. Import `env` instead of reading process.env.
// Keys for later phases are optional here and become required when their phase lands.

const csv = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );

// Hosting dashboards often store unset values as "". Treat those as missing so defaults apply
// (otherwise z.coerce.number() turns "" into 0).
const int = (min: 0 | 1, fallback: number) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.coerce.number().int().min(min).default(fallback),
  );

// Same idea for optional strings with a default.
const text = (fallback: string) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().default(fallback));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().min(1).default("Backscratch"),
  APP_URL: z.url(),
  DATABASE_URL: z.url(),

  AUTH_SECRET: z.string().min(16),
  AUTH_RESEND_KEY: z.string().optional(),
  EMAIL_FROM: text("Backscratch <onboarding@resend.dev>"),
  ADMIN_EMAILS: csv,

  ENCRYPTION_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),

  MAX_ACTIVE_SWAPS_PER_PRODUCT: int(1, 5),
  SWAP_DEFAULT_DAYS: int(1, 30),
  SWAP_RENEWAL_REMINDER_DAYS: int(1, 5),
  SWAP_REREQUEST_COOLDOWN_DAYS: int(0, 14),
  HEARTBEAT_PAUSE_HOURS: int(1, 72),
  MARKETPLACE_MIN_MONTHLY_VISITORS: int(0, 0),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // Only the names of invalid keys are printed, never their values.
  const keys = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Invalid environment variables: ${keys}. See .env.example.`);
}

export const env = parsed.data;
