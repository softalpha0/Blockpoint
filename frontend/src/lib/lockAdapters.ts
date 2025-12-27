export type LockAdapter = {
  id: string;
  name: string;
  description: string;
  aprHint: string;
  risk: "Low" | "Medium" | "High";
};

export const LOCK_ADAPTERS: LockAdapter[] = [
  {
    id: "idle",
    name: "Idle (no yield yet)",
    description:
      "Time-lock only. This is the baseline lock vault path (no strategy routing).",
    aprHint: "0%",
    risk: "Low",
  },
  {
    id: "defi-stable",
    name: "Stable yield basket (coming soon)",
    description:
      "Designed for future plug-in adapters (e.g. stablecoin lending / vault strategies).",
    aprHint: "3–8% (estimated)",
    risk: "Low",
  },
  {
    id: "defi-growth",
    name: "Growth basket (coming soon)",
    description:
      "Higher variance strategies (LP / structured yield). Not enabled on testnet yet.",
    aprHint: "8–20% (estimated)",
    risk: "High",
  },
];
