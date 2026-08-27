import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Assessment Mapper | VedaAI",
  description: "Map handwritten student answers to assessment questions with exact source highlighting.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
