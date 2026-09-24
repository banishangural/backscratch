"use client";

import { useActionState } from "react";
import { requestMagicLink } from "./actions";

export function LoginForm() {
  const [error, formAction, pending] = useActionState(requestMagicLink, null);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@yourproduct.com"
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Sending…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
