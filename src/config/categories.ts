// Product categories. Edit freely; keys are stored on Product.category.
// Phase 3 adds a complement map here for suggested matches.

export const CATEGORIES = [
  { key: "analytics", label: "Analytics" },
  { key: "changelog", label: "Changelog & feedback" },
  { key: "email-marketing", label: "Email marketing" },
  { key: "forms", label: "Forms & surveys" },
  { key: "invoicing", label: "Invoicing & payments" },
  { key: "lead-gen", label: "Lead generation" },
  { key: "scheduling", label: "Scheduling" },
  { key: "seo", label: "SEO" },
  { key: "support", label: "Customer support" },
  { key: "dev-tools", label: "Developer tools" },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]["key"];
