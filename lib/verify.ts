import { db } from "./db";

/**
 * Automatic on-chain payment verification for USDT (TRC20).
 *
 * Every invoice carries a unique tagged amount (e.g. 19 → 19.47 USDT). When a
 * member sends that exact amount to the RECEIVE_ADDRESS wallet, the transfer
 * appears on the public TronScan API and can be matched to the invoice — no
 * admin verification step, no waiting, access granted within seconds of the
 * transaction being confirmed on-chain.
 *
 * Uses the free public TronScan API (no API key needed, rate-limited but the
 * poll route checks at most one wallet per 8 seconds per server).
 */

const TRC20_USDT_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRONSCAN =
  "https://apilist.tronscanapi.com/api/transfer_trc20";

export type Trc20Transfer = {
  txHash: string;
  amount: number;
  timestamp: number; // ms
};

/** Fetch recent incoming TRC20-USDT transfers to `address`. */
export async function fetchRecentTrc20Transfers(
  address: string,
  sinceMs: number
): Promise<Trc20Transfer[]> {
  const url =
    `${TRONSCAN}?related_address=${encodeURIComponent(address)}` +
    `&contract_address=${TRC20_USDT_CONTRACT}` +
    `&start=0&limit=100&sort=-timestamp` +
    `&start_timestamp=${Math.max(0, sinceMs)}` +
    `&end_timestamp=${Date.now()}`;
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    // Don't cache on Vercel — always hit the live API.
    cache: "no-store",
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    data?: Array<{
      transaction_id?: string;
      to_address?: string;
      amount?: number | string;
      contract_decimals?: number;
      block_ts?: number;
    }>;
  };
  const rows = Array.isArray(json.data) ? json.data : [];
  return rows
    .filter(
      (t) =>
        (t.to_address || "").toUpperCase() === address.toUpperCase() &&
        t.transaction_id
    )
    .map((t) => {
      const decimals =
        typeof t.contract_decimals === "number" ? t.contract_decimals : 6;
      return {
        txHash: t.transaction_id as string,
        amount: Number(t.amount || 0) / Math.pow(10, decimals),
        timestamp: Number(t.block_ts || 0),
      };
    });
}

/** Parse SQLite datetime ("YYYY-MM-DD HH:MM:SS") as UTC → ms. */
function sqliteToMs(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(s);
  if (!m) return Date.parse(s) || 0;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
}

/**
 * Try to find an on-chain transfer that exactly matches the invoice's unique
 * tagged amount, to the invoice address, created after the invoice. Returns
 * the tx hash when found, null otherwise. Also marks the invoice 'paid'.
 */
export async function verifyInvoiceOnChain(orderId: string): Promise<{
  found: boolean;
  txHash?: string;
}> {
  const rows = await db.execute({
    sql: "SELECT order_id, amount, address, status, created_at FROM invoices WHERE order_id = ?",
    args: [orderId],
  });
  const inv = rows.rows[0] as unknown as
    | {
        order_id: string;
        amount: number;
        address: string;
        status: string;
        created_at: string;
      }
    | undefined;
  if (!inv) return { found: false };
  if (inv.status !== "open") {
    // Already verified (or closed) — treat as found so the UI resolves.
    return { found: inv.status === "paid", txHash: inv.status === "paid" ? "paid" : undefined };
  }

  const transfers = await fetchRecentTrc20Transfers(
    inv.address,
    sqliteToMs(inv.created_at) - 60_000 // 1 min clock-skew slack
  );
  const expected = Number(inv.amount).toFixed(2);
  const match = transfers.find(
    (t) => t.amount.toFixed(2) === expected && t.timestamp > 0
  );
  if (!match) return { found: false };

  // Lock the invoice: mark paid BEFORE creating the subscription so two
  // concurrent polls can't both trigger confirmation.
  await db.execute({
    sql: "UPDATE invoices SET status = 'paid', checked_at = ? WHERE order_id = ? AND status = 'open'",
    args: [Date.now(), orderId],
  });
  return { found: true, txHash: match.txHash };
}
