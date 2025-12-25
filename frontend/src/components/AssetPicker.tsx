// frontend/src/components/AssetPicker.tsx
"use client";

import { ASSETS, Asset } from "@/lib/assets";

export function AssetPicker({
  value,
  onChange,
}: {
  value: Asset;
  onChange: (a: Asset) => void;
}) {
  return (
    <select
      value={value.symbol}
      onChange={(e) => {
        const a = ASSETS.find((x) => x.symbol === e.target.value);
        if (a) onChange(a);
      }}
      style={{ padding: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,.15)", background: "rgba(0,0,0,.25)" }}
    >
      {ASSETS.map((a) => (
        <option key={a.symbol} value={a.symbol}>
          {a.symbol}
        </option>
      ))}
    </select>
  );
}