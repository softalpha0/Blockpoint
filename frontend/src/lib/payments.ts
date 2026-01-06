export function makeInvoiceCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "BP-";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function slugFromWallet(wallet: string) {
  const w = wallet.toLowerCase();
  return `bp-${w.slice(-6)}`;
}

export function amountToWeiString(amount: string, decimals: number) {
  const a = (amount || "").trim();
  if (!a) return "0";
  const [i, f = ""] = a.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  const cleanInt = (i || "0").replace(/[^\d]/g, "") || "0";
  const cleanFrac = frac.replace(/[^\d]/g, "");
  const combined = `${cleanInt}${cleanFrac}`.replace(/^0+/, "") || "0";
  return combined;
}
