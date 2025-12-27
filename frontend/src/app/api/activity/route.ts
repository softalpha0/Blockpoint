import { NextResponse } from "next/server";
import { createPublicClient, http, decodeEventLog, type Log } from "viem";
import { baseSepolia } from "viem/chains";
import { SAVINGS_VAULT_ABI, LOCK_VAULT_ABI } from "@/lib/abi";

const RPC_URL =
  process.env.RPC_URL ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL;

const SAVINGS_VAULT = process.env.NEXT_PUBLIC_SAVINGS_VAULT_ADDRESS as
  | `0x${string}`
  | undefined;

const LOCK_VAULT = process.env.NEXT_PUBLIC_LOCK_VAULT_ADDRESS as
  | `0x${string}`
  | undefined;

function bad(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function toLower(v: unknown) {
  return typeof v === "string" ? v.toLowerCase() : "";
}

export async function GET(req: Request) {
  if (!RPC_URL) return bad("Missing RPC_URL (or NEXT_PUBLIC_RPC_URL)");
  if (!SAVINGS_VAULT && !LOCK_VAULT)
    return bad("Missing NEXT_PUBLIC_SAVINGS_VAULT_ADDRESS / NEXT_PUBLIC_LOCK_VAULT_ADDRESS");

  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase() || "";
  const fromBlockParam = searchParams.get("fromBlock");
  const toBlockParam = searchParams.get("toBlock");
  const limitParam = searchParams.get("limit");

  const fromBlock = fromBlockParam ? BigInt(fromBlockParam) : undefined;
  const toBlock = toBlockParam ? BigInt(toBlockParam) : "latest";
  const limit = limitParam ? Math.min(Number(limitParam), 200) : 50;

  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const logs: Log[] = [];

  
  if (SAVINGS_VAULT) {
    const l = await client.getLogs({
      address: SAVINGS_VAULT,
      fromBlock,
      toBlock,
    });
    logs.push(...l);
  }

  if (LOCK_VAULT) {
    const l = await client.getLogs({
      address: LOCK_VAULT,
      fromBlock,
      toBlock,
    });
    logs.push(...l);
  }

  
  const items: any[] = [];

  for (const log of logs) {
    let decoded: any = null;

    
    try {
      if (SAVINGS_VAULT && log.address.toLowerCase() === SAVINGS_VAULT.toLowerCase()) {
        decoded = decodeEventLog({
          abi: SAVINGS_VAULT_ABI,
          data: log.data,
          topics: log.topics,
        }) as any;
      } else if (LOCK_VAULT && log.address.toLowerCase() === LOCK_VAULT.toLowerCase()) {
        decoded = decodeEventLog({
          abi: LOCK_VAULT_ABI,
          data: log.data,
          topics: log.topics,
        }) as any;
      }
    } catch {
      continue;
    }

    if (!decoded) continue;

    
    if (wallet) {
      const argsObj = (decoded.args ?? {}) as Record<string, unknown>;
      const values = Object.values(argsObj).map(toLower);
      if (!values.includes(wallet)) continue;
    }

    items.push({
      address: log.address,
      event: decoded.eventName,
      args: decoded.args ?? {},
      blockNumber: log.blockNumber ? Number(log.blockNumber) : null,
      txHash: log.transactionHash ?? null,
      logIndex: log.logIndex ? Number(log.logIndex) : null,
    });
  }

  
  items.sort((a, b) => (b.blockNumber ?? 0) - (a.blockNumber ?? 0));

  return NextResponse.json({
    ok: true,
    count: items.slice(0, limit).length,
    items: items.slice(0, limit),
  });
}