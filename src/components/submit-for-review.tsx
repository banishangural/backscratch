"use client";

import { useState, useTransition } from "react";
import { submitForReview, type ActionResult } from "@/lib/products/actions";

export function SubmitForReview({ productId, disabled, label }: { productId: string; disabled: boolean; label: string }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => startTransition(async () => setResult(await submitForReview(productId)))}
        disabled={disabled || pending}
        className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Submitting…" : label}
      </button>
      {disabled && <p className="text-xs text-zinc-500">Verify your domain first.</p>}
      {result && !result.ok && <p className="text-sm text-red-600">{result.message}</p>}
    </div>
  );
}
