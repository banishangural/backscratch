import { z } from "zod";

export const slotName = z
  .string()
  .trim()
  .min(2, "At least 2 characters.")
  .max(40, "At most 40 characters.")
  .refine((value) => !/[\r\n]/.test(value), "Keep it on one line.");

export const slotInput = z.object({
  name: slotName,
  theme: z.enum(["LIGHT", "DARK", "AUTO"], "Pick a theme."),
  layout: z.enum(["COMPACT", "CARD"], "Pick a layout."),
});

export type SlotFormState = { ok?: boolean; error?: string; fieldErrors?: Partial<Record<string, string[]>> };
