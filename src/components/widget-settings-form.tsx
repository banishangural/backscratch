"use client";

import { startTransition, useActionState } from "react";
import { updateWidgetSettings } from "@/lib/widget/settings";

const input = "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const button =
  "self-start rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

type Settings = { theme: string; layout: string; offersBadge: boolean; badgeCorner: string };

// Theme and band layout, plus whether to offer the corner badge and in which corner.
export function WidgetSettingsForm({ productId, settings }: { productId: string; settings: Settings }) {
  const [state, action, pending] = useActionState(updateWidgetSettings.bind(null, productId), {});
  // Submitted via onSubmit rather than <form action>, which would reset the fields to the
  // values from the first render after saving.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="w-28 text-sm font-medium">Footer band</span>
        <select name="layout" defaultValue={settings.layout} aria-label="Band layout" className={input}>
          <option value="ROW">Row (side by side)</option>
          <option value="CARD">Cards (stacked)</option>
          <option value="COMPACT">Compact list</option>
        </select>
        <select name="theme" defaultValue={settings.theme} aria-label="Theme" className={input}>
          <option value="AUTO">Auto theme</option>
          <option value="LIGHT">Light</option>
          <option value="DARK">Dark</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex w-28 items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="offersBadge" defaultChecked={settings.offersBadge} />
          Corner badge
        </label>
        <select name="badgeCorner" defaultValue={settings.badgeCorner} aria-label="Badge corner" className={input}>
          <option value="RIGHT">Bottom right</option>
          <option value="LEFT">Bottom left</option>
        </select>
      </div>
      <p className="text-xs text-zinc-500">
        The badge shows one partner at a time, and visitors can minimize it. Offering it adds it to every active swap
        whose partner offers it too (you&apos;ll both get an email). No code change needed.
      </p>
      <button disabled={pending} className={button}>{pending ? "Saving…" : "Save"}</button>
      {state.ok && <p className="text-xs text-emerald-700 dark:text-emerald-400">Saved. Live widgets update within a minute.</p>}
      {[state.error, ...Object.values(state.fieldErrors ?? {}).flat()].filter(Boolean).map((message) => (
        <p key={message} className="text-xs text-red-600">{message}</p>
      ))}
    </form>
  );
}
