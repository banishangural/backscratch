import { z } from "zod";
import { CATEGORIES, type CategoryKey } from "@/config/categories";
import { parseProductUrl } from "@/lib/domain";

const categoryKeys = CATEGORIES.map((c) => c.key) as [CategoryKey, ...CategoryKey[]];

// Checkboxes send "on" when ticked and nothing when not.
const checkbox = z.preprocess((value) => value === "on" || value === "true", z.boolean());

const oneLine = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `At least ${min} characters.`)
    .max(max, `At most ${max} characters.`)
    .refine((value) => !/[\r\n]/.test(value), "Keep it on one line.");

export const productInput = z.object({
  name: oneLine(2, 60),
  url: z
    .string()
    .trim()
    .max(500)
    .transform((value, ctx) => {
      const parsed = parseProductUrl(value);
      if (!parsed) {
        ctx.addIssue({ code: "custom", message: "Enter your site's public address, e.g. https://example.com" });
        return z.NEVER;
      }
      return parsed;
    }),
  logoUrl: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null)
    .refine((value) => value === null || /^https:\/\/[^\s"'<>]+$/i.test(value), "Use an https:// image address.")
    .refine((value) => value === null || URL.canParse(value), "That doesn't look like a valid URL."),
  pitch: oneLine(10, 120),
  category: z.enum(categoryKeys, "Pick a category."),
  audience: z.string().trim().min(3, "At least 3 characters.").max(300, "At most 300 characters."),
  showRevenue: checkbox,
  showSubscriptions: checkbox,
  showCustomers: checkbox,
  showTraffic: checkbox,
  showSwapStats: checkbox,
});

export type ProductInput = z.infer<typeof productInput>;

export const PRODUCT_FIELDS = [
  "name", "url", "logoUrl", "pitch", "category", "audience",
  "showRevenue", "showSubscriptions", "showCustomers", "showTraffic", "showSwapStats",
] as const;

// Raw form values, echoed back on validation errors so the form keeps what was typed.
export type ProductFormValues = Partial<Record<(typeof PRODUCT_FIELDS)[number], string>>;

export function readProductForm(formData: FormData): ProductFormValues {
  const values: ProductFormValues = {};
  for (const field of PRODUCT_FIELDS) {
    const value = formData.get(field);
    if (typeof value === "string") values[field] = value;
  }
  return values;
}

export type FormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: ProductFormValues;
};
