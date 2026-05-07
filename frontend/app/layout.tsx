import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CallMe",
  description: "Have a call with an AI version of me.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
