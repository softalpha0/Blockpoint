import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Blockpoint",
  description: "Onchain fintech rails for payments, savings, and vaults",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}