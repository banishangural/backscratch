import { z } from "zod";

// Checkboxes send "on" when ticked and nothing when not.
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

export const widgetSettingsInput = z.object({
  theme: z.enum(["LIGHT", "DARK", "AUTO"], "Pick a theme."),
  layout: z.enum(["ROW", "CARD", "COMPACT"], "Pick a layout."),
  offersBadge: checkbox,
  badgeCorner: z.enum(["LEFT", "RIGHT"], "Pick a corner."),
});

export type WidgetSettingsState = { ok?: boolean; error?: string; fieldErrors?: Partial<Record<string, string[]>> };
