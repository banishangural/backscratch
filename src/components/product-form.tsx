"use client";

import { useActionState } from "react";
import { CATEGORIES } from "@/config/categories";
import type { FormState, ProductFormValues } from "@/lib/products/schema";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: ProductFormValues;
  submitLabel: string;
  note?: string;
};

const input =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function ProductForm({ action, initial = {}, submitLabel, note }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initial;
  const errors = state.fieldErrors ?? {};
  // Remount the fields after each failed submit so they show the values that were sent.
  const key = JSON.stringify(values);

  return (
    <form action={formAction} className="flex flex-col gap-5" key={key}>
      {state.error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{state.error}</p>}

      <Field label="Product name" error={errors.name}>
        <input name="name" required maxLength={60} defaultValue={values.name} className={input} />
      </Field>
      <Field label="Website URL" hint="The site where you'll install the widget. Changing the domain later means verifying again." error={errors.url}>
        <input name="url" type="url" required placeholder="https://example.com" defaultValue={values.url} className={input} />
      </Field>
      <Field label="Logo URL (optional)" hint="An https:// link to a square image, e.g. your favicon or app icon." error={errors.logoUrl}>
        <input name="logoUrl" type="url" placeholder="https://example.com/logo.png" defaultValue={values.logoUrl} className={input} />
      </Field>
      <Field label="One-line pitch" hint="Shown on partner widgets. 10–120 characters." error={errors.pitch}>
        <input name="pitch" required maxLength={120} defaultValue={values.pitch} className={input} />
      </Field>
      <Field label="Category" error={errors.category}>
        <select name="category" required defaultValue={values.category ?? ""} className={input}>
          <option value="" disabled>Choose one…</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Audience" hint="Who uses your product? e.g. “Freelance designers and small agencies”." error={errors.audience}>
        <textarea name="audience" required rows={2} maxLength={300} defaultValue={values.audience} className={input} />
      </Field>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Public metrics</legend>
        <p className="text-xs text-zinc-500">Choose what other founders can see on your profile once these numbers exist.</p>
        <Checkbox name="showSwapStats" label="Swap stats (views and clicks measured by Backscratch)" checked={values.showSwapStats} />
        <Checkbox name="showTraffic" label="Monthly visitors (from a verified analytics integration)" checked={values.showTraffic} />
        <Checkbox name="showRevenue" label="Revenue range (from Stripe or TrustMRR)" checked={values.showRevenue} />
        <Checkbox name="showSubscriptions" label="Active subscriptions" checked={values.showSubscriptions} />
        <Checkbox name="showCustomers" label="Customer count" checked={values.showCustomers} />
      </fieldset>

      {note && <p className="text-sm text-amber-700 dark:text-amber-400">{note}</p>}
      <button
        disabled={pending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      {error?.map((message) => (
        <span key={message} className="text-xs text-red-600">{message}</span>
      ))}
    </label>
  );
}

function Checkbox({ name, label, checked }: { name: string; label: string; checked?: string }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked === "on"} />
      {label}
    </label>
  );
}
