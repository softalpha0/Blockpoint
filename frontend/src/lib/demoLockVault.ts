type Token = "USDC" | "USDT";

const KEY = (wallet: string) => `bp_demo_lock_${wallet.toLowerCase()}`;

type State = {
  wallet: string;
  balances: Record<Token, number>;
  deposited: Record<Token, number>;
  bptEarned: number;
  lastAccrualMs: number;
  apr: number;
};

function now() {
  return Date.now();
}

function safeParse(s: string | null) {
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

export function demoGetState(wallet: string): State {
  const raw = safeParse(localStorage.getItem(KEY(wallet)));
  const base: State = {
    wallet,
    balances: { USDC: 1000, USDT: 1000 }, 
    deposited: { USDC: 0, USDT: 0 },
    bptEarned: 0,
    lastAccrualMs: now(),
    apr: 0.5,
  };

  if (!raw) return base;

  return {
    ...base,
    ...raw,
    wallet,
    balances: { ...base.balances, ...(raw.balances || {}) },
    deposited: { ...base.deposited, ...(raw.deposited || {}) },
    lastAccrualMs: Number(raw.lastAccrualMs || base.lastAccrualMs),
    bptEarned: Number(raw.bptEarned || 0),
    apr: Number(raw.apr || base.apr),
  };
}

export function demoSaveState(s: State) {
  localStorage.setItem(KEY(s.wallet), JSON.stringify(s));
}

export function accrueBpt(wallet: string, prices: { USDC: number; USDT: number; BPT: number }) {
  const s = demoGetState(wallet);
  const t = now();
  const dt = Math.max(0, t - s.lastAccrualMs);
  if (dt === 0) return s;

  const usd =
    s.deposited.USDC * prices.USDC +
    s.deposited.USDT * prices.USDT;

  
  const yearMs = 365 * 24 * 60 * 60 * 1000;
  const usdEarned = usd * s.apr * (dt / yearMs);

 
  const bpt = prices.BPT > 0 ? usdEarned / prices.BPT : 0;

  s.bptEarned += bpt;
  s.lastAccrualMs = t;
  demoSaveState(s);
  return s;
}

export function demoDeposit(wallet: string, token: Token, amount: number, prices: { USDC: number; USDT: number; BPT: number }) {
  if (!(amount > 0)) throw new Error("Enter a valid amount");
  const s = accrueBpt(wallet, prices);

  if (s.balances[token] < amount) throw new Error("Insufficient balance");
  s.balances[token] -= amount;
  s.deposited[token] += amount;

  demoSaveState(s);
  return s;
}

export function demoWithdraw(wallet: string, token: Token, amount: number, prices: { USDC: number; USDT: number; BPT: number }) {
  if (!(amount > 0)) throw new Error("Enter a valid amount");
  const s = accrueBpt(wallet, prices);

  if (s.deposited[token] < amount) throw new Error("Not enough deposited");
  s.deposited[token] -= amount;
  s.balances[token] += amount;

  demoSaveState(s);
  return s;
}

export function demoClaimBpt(wallet: string, prices: { USDC: number; USDT: number; BPT: number }) {
  const s = accrueBpt(wallet, prices);
  const claimed = s.bptEarned;
  s.bptEarned = 0;
  demoSaveState(s);
  return { state: s, claimed };
}
