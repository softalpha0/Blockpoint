import { NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog, type Log } from "viem";
import { baseSepolia } from "viem/chains";
import { savingsVaultAbi, lockVaultAbi } from "@/lib/abi";

type ActivityRow = {
  ts: number;
  chainId?: number;
  contract?: string;
  txHash?: string;
  blockNumber?: number;
  event?: string;
  user?: string;
  token?: string;
  amount?: string;
  raw?: any;
};

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  "https://rpc.ankr.com/base_sepolia"; 

const SAVINGS_VAULT = (process.env.NEXT_PUBLIC_SAVINGS_VAULT_ADDRESS ||
  process.env.NEXT_PUBLIC_SAVINGS_VAULT) as `0x${string}` | undefined;

const LOCK_VAULT = (process.env.NEXT_PUBLIC_LOCK_VAULT_ADDRESS ||
  process.env.NEXT_PUBLIC_LOCK_VAULT) as `0x${string}` | undefined;

const MAX_LOG_RANGE = 10n;

const LOOKBACK_BLOCKS = BigInt(
  Number(process.env.ACTIVITY_LOOKBACK_BLOCKS || "200")
);

function isHexAddress(x?: string | null): x is `0x${string}` {
  return !!x && /^0x[a-fA-F0-9]{40}$/.test(x);
}

function lower(x?: string) {
  return (x || "").toLowerCase();
}

function normalizeWallet(q?: string | null) {
  if (!q) return null;
  const w = q.trim();
  return /^0x[a-fA-F0-9]{40}$/.test(w) ? (w as `0x${string}`) : null;
}

function pickAmount(v: unknown) {
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "number") return String(v);
  if (typeof v === "string") return v;
  return undefined;
}

function tryDecode(log: Log, abi: any) {
  try {
    return decodeEventLog({
      abi,
      data: log.data,
      topics: log.topics,
    }) as any;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = normalizeWallet(searchParams.get("wallet"));

    if (!isHexAddress(SAVINGS_VAULT) && !isHexAddress(LOCK_VAULT)) {
      return NextResponse.json(
        {
          rows: [],
          error:
            "Missing NEXT_PUBLIC_SAVINGS_VAULT_ADDRESS / NEXT_PUBLIC_LOCK_VAULT_ADDRESS",
        },
        { status: 200 }
      );
    }

    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const latest = await client.getBlockNumber();
    const from = latest > LOOKBACK_BLOCKS ? latest - LOOKBACK_BLOCKS : 0n;

    const rows: ActivityRow[] = [];
    const blockTsCache = new Map<bigint, number>();

    async function getBlockTs(blockNumber?: bigint) {
      if (!blockNumber) return Date.now();
      if (blockTsCache.has(blockNumber)) return blockTsCache.get(blockNumber)!;

      try {
        const b = await client.getBlock({ blockNumber });
        const tsMs = Number(b.timestamp) * 1000;
        blockTsCache.set(blockNumber, tsMs);
        return tsMs;
      } catch {
        return Date.now();
      }
    }

    for (let start = from; start <= latest; start += MAX_LOG_RANGE) {
      const end = start + (MAX_LOG_RANGE - 1n) > latest ? latest : start + (MAX_LOG_RANGE - 1n);

      if (isHexAddress(SAVINGS_VAULT)) {
        const logs = await client.getLogs({
          address: SAVINGS_VAULT,
          fromBlock: start,
          toBlock: end,
        });

        for (const lg of logs) {
          const decoded = tryDecode(lg, savingsVaultAbi);
          if (!decoded) continue;

          const args: any = decoded.args || {};
          const ev = decoded.eventName as string;
          if (wallet) {
            const allVals = Object.values(args).map((v: any) =>
              typeof v === "string" ? v.toLowerCase() : ""
            );
            if (!allVals.includes(wallet.toLowerCase())) continue;
          }

          const bn = lg.blockNumber ?? 0n;
          const ts = await getBlockTs(bn);

          rows.push({
            ts,
            chainId: baseSepolia.id,
            contract: SAVINGS_VAULT,
            txHash: lg.transactionHash || undefined,
            blockNumber: Number(bn),
            event: `SavingsVault.${ev}`,
            user: args.user || args[0],
            token: args.token || args[1],
            amount: pickAmount(args.amount ?? args[2]),
            raw: { args, log: lg },
          });
        }
      }

      if (isHexAddress(LOCK_VAULT)) {
        const logs = await client.getLogs({
          address: LOCK_VAULT,
          fromBlock: start,
          toBlock: end,
        });

        for (const lg of logs) {
          const decoded = tryDecode(lg, lockVaultAbi);
          if (!decoded) continue;

          const args: any = decoded.args || {};
          const ev = decoded.eventName as string;

          if (wallet) {
            const allVals = Object.values(args).map((v: any) =>
              typeof v === "string" ? v.toLowerCase() : ""
            );
            if (!allVals.includes(wallet.toLowerCase())) continue;
          }

          const bn = lg.blockNumber ?? 0n;
          const ts = await getBlockTs(bn);

          rows.push({
            ts,
            chainId: baseSepolia.id,
            contract: LOCK_VAULT,
            txHash: lg.transactionHash || undefined,
            blockNumber: Number(bn),
            event: `LockVault.${ev}`,
            user: args.user || args[0],
            amount: pickAmount(args.amount ?? args[1]),
            raw: { args, log: lg },
          });
        }
      }
    }

    rows.sort((a, b) => {
      const ab = a.blockNumber || 0;
      const bb = b.blockNumber || 0;
      return bb - ab;
    });

    return NextResponse.json({ rows }, { status: 200 });
  } catch (err: any) {
    console.error("api/activity error:", err);
    return NextResponse.json(
      {
        rows: [],
        error: err?.shortMessage || err?.message || "Activity indexer failed",
      },
      { status: 200 } 
    );
  }
}