import type { Metadata } from "next";
import "./admin.css";
import { fontVars } from "@/lib/fonts";

export const metadata: Metadata = { title: "GOODMAX Admin", robots: { index: false, follow: false } };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={fontVars}>
      <body>{children}</body>
    </html>
  );
}
