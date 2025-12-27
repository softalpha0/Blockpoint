
import { ethers } from "ethers";
import { pool } from "./db.js";
import routerAbi from "./abi/BlockpointInvoiceRouter.json" with { type: "json" };

const MAX_RANGE = 10; 

async function getLastBlockNumber(): Promise<number | null> {
  try {
    const r = await pool.query("select last_block from indexer_state where id=1");
    if (r.rowCount === 0) return null;
    return Number(r.rows[0].last_block);
  } catch {
    return null;
  }
}

async function setLastBlock(block: number) {
  try {
    await pool.query(
      `insert into indexer_state (id, last_block)
       values (1, $1)
       on conflict (id) do update set last_block = excluded.last_block`,
      [block]
    );
  } catch {
    
  }
}

export async function startIndexer() {
  const rpcUrl = process.env.RPC_URL!;
  const routerAddress = process.env.ROUTER!;
  const startBlockEnv = process.env.START_BLOCK ? Number(process.env.START_BLOCK) : undefined;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const iface = new ethers.Interface(routerAbi);

  const topicCreated = iface.getEvent("InvoiceCreated")!.topicHash;
  const topicPaid = iface.getEvent("InvoicePaid")!.topicHash;

  console.log("Indexer polling logs on:", routerAddress);

  const current = await provider.getBlockNumber();

  const fromBlock =
    (await getLastBlockNumber()) ??
    startBlockEnv ??
    Math.max(current - 2000, 0);

  console.log("Starting from block:", fromBlock, "current:", current);

  let cursor = fromBlock;

  while (true) {
    try {
      const latest = await provider.getBlockNumber();

      if (cursor > latest) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      
      
      const toBlock = Math.min(cursor + MAX_RANGE - 1, latest);

      
      const createdLogs = await provider.getLogs({
        address: routerAddress,
        fromBlock: cursor,
        toBlock,
        topics: [topicCreated],
      });

      for (const log of createdLogs) {
        const parsed = iface.parseLog(log);
        if (!parsed) continue;

        const invoiceId = parsed.args.invoiceId as string;
        const merchantId = parsed.args.merchantId as string;
        const token = parsed.args.token as string;
        const amount = parsed.args.amount.toString();
        const expiry = Number(parsed.args.expiry);

        await pool.query(
          `insert into invoices (invoice_id, merchant_id, token, amount, expiry, paid, created_tx)
           values ($1,$2,$3,$4,$5,false,$6)
           on conflict (invoice_id) do nothing`,
          [invoiceId, merchantId, token, amount, expiry, log.transactionHash]
        );
      }

      const paidLogs = await provider.getLogs({
        address: routerAddress,
        fromBlock: cursor,
        toBlock,
        topics: [topicPaid],
      });

      for (const log of paidLogs) {
        const parsed = iface.parseLog(log);
        if (!parsed) continue;

        const invoiceId = parsed.args.invoiceId as string;
        const payer = parsed.args.payer as string;

        await pool.query(
          `update invoices
           set paid=true, payer=$2, paid_tx=$3, paid_at=now()
           where invoice_id=$1`,
          [invoiceId, payer, log.transactionHash]
        );
      }

      await setLastBlock(toBlock + 1);
      cursor = toBlock + 1;
    } catch (e: any) {
      console.log("Indexer loop error:", e?.shortMessage || e?.message || e);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}