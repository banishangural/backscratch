import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Backscratch",
  description: "A cross-promotion swap network for indie SaaS and web apps.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
