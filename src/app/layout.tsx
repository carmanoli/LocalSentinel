import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LocalSentinel",
  description: "A local-first infrastructure vulnerability and outage radar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="min-h-screen bg-slate-950 font-sans text-slate-100 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
