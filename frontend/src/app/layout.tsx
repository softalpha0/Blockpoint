import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Blockpoint",
  description: "Testnet invoicing + vault escrow rails",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}