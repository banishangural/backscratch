"use client";

import { useState, useTransition } from "react";
import { checkDomainNow, type ActionResult } from "@/lib/products/actions";

type Props = {
  productId: string;
  domain: string;
  metaTag: string;
  txtRecord: string;
  lastError: string | null;
  lastCheckedAt: string | null;
};

// Instructions for proving domain ownership, plus the "Check now" button.
export function VerificationPanel({ productId, domain, metaTag, txtRecord, lastError, lastCheckedAt }: Props) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const check = () =>
    startTransition(async () => {
      setResult(await checkDomainNow(productId));
    });

  const message = result?.message ?? lastError;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Prove you control <strong>{domain}</strong> using <em>either</em> option, then click Check now.
      </p>

      <Option title="Option A: meta tag" steps={`Add this tag inside the <head> of your homepage (https://${domain}/) and deploy.`} value={metaTag} />
      <Option
        title="Option B: DNS TXT record"
        steps={`At your DNS provider, add a TXT record on the root domain (${domain}, often written as “@”) with this value.`}
        value={txtRecord}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={check}
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Checking…" : "Check now"}
        </button>
        {lastCheckedAt && !result && (
          <span className="text-xs text-zinc-500">Last checked {new Date(lastCheckedAt).toLocaleString()}</span>
        )}
      </div>

      {message && (
        <p
          className={`whitespace-pre-line rounded-md p-3 text-sm ${
            result?.ok
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

function Option({ title, steps, value }: { title: string; steps: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{steps}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900">{value}</code>
        <button onClick={copy} className="text-xs text-zinc-600 hover:underline dark:text-zinc-400">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
