import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krew | Ad Attribution Dashboard",
  description: "Track which Facebook ads lead to hired clients",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
