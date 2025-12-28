import { ethers } from "ethers";
import { pool } from "./db";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const routerAbi = require("./abi/BlockpointInvoiceRouter.json");

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in backend/.env`);
  return v;
}

const KV_KEY = "invoice_router";


const MAX_LOG_RANGE_INCLUSIVE = 10;
const STEP = MAX_LOG_RANGE_INCLUSIVE - 1; 

async function ensureKvTable() {
  await pool.query(`
    create table if not exists indexer_state_kv (
      key text primary key,
      last_block bigint not null,
      updated_at timestamptz not null default now()
    );
  `);
}

async function getLastBlock(startBlock: number) {
  const r = await pool.query(
    `select last_block from indexer_state_kv where key=$1`,
    [KV_KEY]
  );
  if (!r.rows.length) return startBlock;
  return Number(r.rows[0].last_block);
}

async function setLastBlock(b: number) {
  await pool.query(
    `
    insert into indexer_state_kv (key, last_block)
    values ($1, $2)
    on conflict (key)
    do update set last_block=excluded.last_block, updated_at=now()
    `,
    [KV_KEY, b]
  );
}

export async function startIndexer() {
  const RPC_URL = mustEnv("RPC_URL");
  const ROUTER = mustEnv("ROUTER");
  const START_BLOCK = Number(process.env.START_BLOCK || "0");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const iface = new ethers.Interface(routerAbi);

  await ensureKvTable();

  console.log(`Indexer polling logs on: ${ROUTER}`);
  console.log(`Indexer chunk size: ${MAX_LOG_RANGE_INCLUSIVE} blocks`);


  const invoicePaidTopic = iface.getEvent("InvoicePaid").topicHash;

  async function tick() {
    try {
      const current = await provider.getBlockNumber();
      let from = await getLastBlock(START_BLOCK);

    
      if (from > current) return;

    
      const to = Math.min(from + STEP, current);

      const logs = await provider.getLogs({
        address: ROUTER,
        fromBlock: from,
        toBlock: to,
        topics: [invoicePaidTopic],
      });

      for (const log of logs) {
        try {
          const parsed = iface.parseLog(log);
          const invoiceId = parsed?.args?.invoiceId as string;
          const payer = parsed?.args?.payer as string;
          const amount = parsed?.args?.amount?.toString?.() ?? String(parsed?.args?.amount);
          const fee = parsed?.args?.fee?.toString?.() ?? String(parsed?.args?.fee);

          await pool.query(
            `
            insert into invoices (invoice_id, payer, amount, fee, tx_hash, block_number, created_at)
            values ($1,$2,$3,$4,$5,$6, now())
            on conflict (invoice_id) do update set
              payer=excluded.payer,
              amount=excluded.amount,
              fee=excluded.fee,
              tx_hash=excluded.tx_hash,
              block_number=excluded.block_number
            `,
            [
              invoiceId,
              payer?.toLowerCase?.() || payer,
              amount,
              fee,
              log.transactionHash,
              Number(log.blockNumber),
            ]
          );
        } catch (e) {
          console.error("Indexer parse/store error:", e);
        }
      }

      await setLastBlock(to + 1);
    } catch (e: any) {
      console.error("Indexer error:", e?.message || e);
    }
  }

  await tick();
  setInterval(tick, 5000);
}