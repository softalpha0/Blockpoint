"use client";

import { useEffect, useState } from "react";

const KEY = "bp_demo_mode";

export function getDefaultDemoMode() {
  return (process.env.NEXT_PUBLIC_DEMO_DEFAULT || "") === "1";
}

export function useDemoMode() {
  const [demo, setDemo] = useState<boolean>(getDefaultDemoMode());

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (v === "1") setDemo(true);
      if (v === "0") setDemo(false);
    } catch {}
  }, []);

  const toggle = () => {
    setDemo((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  return { demo, setDemo, toggle };
}
