import "dotenv/config";
import express from "express";
import cors from "cors";
import { pool } from "./db";
import fiatRouter from "./routes/fiat";
import { startApi } from "./api";

async function tryStartIndexer() {
  try {
    const mod = await import("./indexer");
    if (typeof mod.startIndexer === "function") {
      mod.startIndexer();
    }
  } catch (e: any) {
    console.warn("Indexer not started (optional):", e?.message || e);
  }
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("select 1");
    return res.json({ ok: true, db: true, ts: new Date().toISOString() });
  } catch (e: any) {
    return res.json({
      ok: true,
      db: false,
      ts: new Date().toISOString(),
      error: e?.message || String(e),
    });
  }
});

app.use("/api/fiat", fiatRouter);

startApi();

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});

tryStartIndexer();