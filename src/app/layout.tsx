import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Student Support Copilot",
  description:
    "Demo chatbot for curriculum pathways, mentor routing, and campus ops FAQs — not subject tutoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
