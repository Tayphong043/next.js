import type { Metadata } from "next";
import { CounterProvider } from "@/_components/Counter";

export const metadata: Metadata = {
  title: "Next.js",
  description: "Generated by Next.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CounterProvider>{children}</CounterProvider>
      </body>
    </html>
  );
}
