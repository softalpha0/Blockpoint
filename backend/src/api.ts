import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { createRequire } from "module";

import fiatRouter from "./routes/fiat";
import { pool } from "./db";

const require = createRequire(import.meta.url);
const routerAbi = require("./abi/BlockpointInvoiceRouter.json");

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in backend/.env`);
  return v;
}

async function dbHealth() {
  try {
    await pool.query("select 1");
    return { ok: true, error: null as string | null };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export function startApi() {
  const PORT = Number(process.env.PORT || 3001);

  const RPC_URL = mustEnv("RPC_URL");
  const ROUTER = mustEnv("ROUTER");
  const SERVER_PK = mustEnv("SERVER_PK");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(SERVER_PK, provider);
  const routerContract = new ethers.Contract(ROUTER, routerAbi, signer);

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", async (_req, res) => {
    const db = await dbHealth();
    return res.json({
      ok: true,
      db: db.ok,
      ts: new Date().toISOString(),
      ...(db.ok ? {} : { error: db.error }),
    });
  });

  app.use("/api/fiat", fiatRouter);

  app.post("/api/invoices/create", async (req, res) => {
    try {
      const { invoiceId, merchantId, token, amount, expirySeconds } = req.body as {
        invoiceId: string;
        merchantId: string;
        token: string;
        amount: string | number;
        expirySeconds?: number;
      };

      if (!invoiceId || !merchantId || !token || amount === undefined) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const expiry = Math.floor(Date.now() / 1000) + Number(expirySeconds ?? 3600);

      const tx = await routerContract.createInvoice(invoiceId, merchantId, token, amount, expiry);
      await tx.wait();

      return res.json({ ok: true, invoiceId, txHash: tx.hash, expiry });
    } catch (e: any) {
      return res.status(500).json({
        error: e?.shortMessage || e?.message || "Failed",
      });
    }
  });

  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
  });
}