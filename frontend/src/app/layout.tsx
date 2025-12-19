import type { Metadata } from "next";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Blockpoint Testnet Pay",
  description: "Pay invoices on Base Sepolia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0 }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}