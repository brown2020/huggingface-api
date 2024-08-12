import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Hugging Face API",
  description: "Hugging Face API Demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex flex-col p-4 max-w-6xl mx-auto">{children}</body>
    </html>
  );
}
