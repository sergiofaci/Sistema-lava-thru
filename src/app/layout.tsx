import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lava Thru — Gestão",
  description: "Sistema de gestão operacional e financeira — Lava Thru Car Wash",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
