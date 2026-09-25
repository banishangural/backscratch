"use client";

import { startTransition, useActionState, useTransition } from "react";
import { archiveSlot, createSlot, updateSlot } from "@/lib/slots/actions";
import type { SlotFormState } from "@/lib/slots/schema";

const input = "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900";
const button =
  "rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";

// "Add a placement" form: just a name; theme and layout start at Auto / Card.
export function AddSlotForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState(createSlot.bind(null, productId), {});
  return (
    <form action={action} className="flex flex-col gap-1">
      <div className="flex gap-2">
        <input name="name" required maxLength={40} placeholder="e.g. Dashboard sidebar" className={`${input} flex-1`} />
        <button disabled={pending} className={button}>{pending ? "Adding…" : "Add placement"}</button>
      </div>
      <Errors state={state} />
    </form>
  );
}

type Slot = { id: string; name: string; theme: string; layout: string };

// Name, theme and layout of one placement, plus "Remove".
export function SlotSettingsForm({ slot }: { slot: Slot }) {
  const [state, action, pending] = useActionState(updateSlot.bind(null, slot.id), {});
  // Submitted via onSubmit rather than <form action>, which would reset the fields to the
  // values from the first render after saving.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
  const [archiving, startArchive] = useTransition();
  const remove = () => {
    if (confirm(`Remove “${slot.name}”? The widget using this code will stop showing.`)) {
      startArchive(async () => {
        await archiveSlot(slot.id);
      });
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <input name="name" required maxLength={40} defaultValue={slot.name} aria-label="Placement name" className={`${input} min-w-0 flex-1`} />
        <select name="theme" defaultValue={slot.theme} aria-label="Theme" className={input}>
          <option value="AUTO">Auto theme</option>
          <option value="LIGHT">Light</option>
          <option value="DARK">Dark</option>
        </select>
        <select name="layout" defaultValue={slot.layout} aria-label="Layout" className={input}>
          <option value="CARD">Cards</option>
          <option value="COMPACT">Compact list</option>
        </select>
        <button disabled={pending} className={button}>{pending ? "Saving…" : "Save"}</button>
        <button type="button" onClick={remove} disabled={archiving} className="text-xs text-red-600 hover:underline">
          Remove
        </button>
      </div>
      {state.ok && <p className="text-xs text-emerald-700 dark:text-emerald-400">Saved. Live widgets update within a minute.</p>}
      <Errors state={state} />
    </form>
  );
}

function Errors({ state }: { state: SlotFormState }) {
  const messages = [state.error, ...Object.values(state.fieldErrors ?? {}).flat()].filter(Boolean);
  return messages.map((message) => (
    <p key={message} className="text-xs text-red-600">{message}</p>
  ));
}
