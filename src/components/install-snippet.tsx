"use client";

import { useState } from "react";

// The one-line widget install code, with a copy button.
export function InstallSnippet({ snippet }: { snippet: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 overflow-x-auto whitespace-nowrap rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-900">{snippet}</code>
      <button onClick={copy} className="text-xs text-zinc-600 hover:underline dark:text-zinc-400">
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
