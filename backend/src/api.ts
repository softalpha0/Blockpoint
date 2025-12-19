// backend/src/api.ts
import express from "express";
import { ethers } from "ethers";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const routerAbi = require("./abi/BlockpointInvoiceRouter.json");

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in backend/.env`);
  return v;
}

export function startApi() {
  const PORT = Number(process.env.PORT || 3001);

  const RPC_URL = mustEnv("RPC_URL");
  const ROUTER = mustEnv("ROUTER");
  const SERVER_PK = mustEnv("SERVER_PK"); // <-- server key that creates invoices

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(SERVER_PK, provider);
  const routerContract = new ethers.Contract(ROUTER, routerAbi, signer);

  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Create invoice on-chain (server signs)
  app.post("/api/invoices/create", async (req, res) => {
    try {
      const { invoiceId, merchantId, token, amount, expirySeconds } = req.body as {
        invoiceId: string;     // bytes32 hex (0x + 64)
        merchantId: string;    // bytes32 hex
        token: string;         // address
        amount: string | number; // uint256 in token base units (USDC 6dp => 1 USDC = 1000000)
        expirySeconds?: number; // optional (defaults 3600)
      };

      if (!invoiceId || !merchantId || !token || amount === undefined) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const expiry =
        Math.floor(Date.now() / 1000) + Number(expirySeconds ?? 3600);

      const tx = await routerContract.createInvoice(
        invoiceId,
        merchantId,
        token,
        amount,
        expiry
      );

      await tx.wait();

      return res.json({ ok: true, invoiceId, txHash: tx.hash, expiry });
    } catch (e: any) {
      return res.status(500).json({ error: e?.shortMessage || e?.message || "Failed" });
    }
  });

  app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
  });
}