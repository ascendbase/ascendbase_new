import { db } from "./db";
import { PLANS, getPlan, type Plan } from "./plans";

/**
 * Self-custody crypto payments — NO processor, NO merchant KYC.
 *
 * You paste YOUR OWN wallet deposit addresses into env (RECEIVE_ADDRESS, etc.).
 * The checkout page shows the address + exact amount + a unique reference to
 * the member. They pay from ANY wallet. Access stays "pending" until YOU verify
 * the transfer (in /admin → Payments) and grant access. This sidesteps every
 * Russia / KYC blocker because there is no third-party merchant account.
 *
 * SANDBOX MODE (default): when no receiving address is configured, checkout
 * emits a fake invoice and the "Simulate payment" button stands in for a real
 * transfer so the whole flow can be exercised locally.
 *
 * Going automatic later: a processor like NowPayments or a self-hosted BTCPay
 * Server can post to /api/webhooks/payment; implement verifyWebhook() to auto-
 * confirm. The manual verify gate still works as a fallback / override.
 */

export function isSandbox(): boolean {
  return (
    !process.env.RECEIVE_ADDRESS &&
    !process.env.RECEIVE_BTC_ADDRESS &&
    !process.env.RECEIVE_ETH_ADDRESS &&
    !process.env.RECEIVE_SOL_ADDRESS
  );
}

export type Network = {
  coin: string;
  net: string;
  address: string;
  memoSupported: boolean;
};

/** Build the list of networks the member can pay on, from env. */
export function getNetworks(): Network[] {
  const out: Network[] = [];
  if (process.env.RECEIVE_ADDRESS)
    out.push({
      coin: "USDT",
      net: "TRC20",
      address: process.env.RECEIVE_ADDRESS,
      memoSupported: false,
    });
  if (process.env.RECEIVE_BTC_ADDRESS)
    out.push({
      coin: "BTC",
      net: "BTC",
      address: process.env.RECEIVE_BTC_ADDRESS,
      memoSupported: false,
    });
  if (process.env.RECEIVE_ETH_ADDRESS)
    out.push({
      coin: "ETH",
      net: "ERC20",
      address: process.env.RECEIVE_ETH_ADDRESS,
      memoSupported: false,
    });
  if (process.env.RECEIVE_SOL_ADDRESS)
    out.push({
      coin: "SOL",
      net: "SOL",
      address: process.env.RECEIVE_SOL_ADDRESS,
      memoSupported: true,
    });
  return out;
}

export type Invoice = {
  orderId: string;
  amount: number;
  coin: string;
  net: string;
  address: string;
  reference: string;
  networks: Network[];
  uri?: string;
  sandbox: boolean;
  status: string;
  planKey?: string;
};

const B58 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function createInvoice(opts: {
  userId: number;
  amount: number;
  planKey?: string;
  coin?: string;
  net?: string;
  upgradeFrom?: string;
}): Promise<Invoice> {
  const orderId =
    "ab_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  const plan = opts.planKey || (process.env.ACCESS_DAYS || "30") + "d";
  const nets = getNetworks();

  if (nets.length === 0) {
    // Sandbox / no receiving address configured.
    const address =
      "T" +
      Array.from({ length: 33 }, () => B58[Math.floor(Math.random() * B58.length)]).join("");
    await db.execute({
      sql: "INSERT INTO subscriptions (user_id, status, plan, amount, coin, network, plan_key, order_id) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)",
      args: [opts.userId, plan, opts.amount, "USDT", "TRC20(sandbox)", opts.planKey || null, orderId],
    });
    return {
      orderId,
      amount: opts.amount,
      coin: "USDT",
      net: "TRC20",
      address,
      reference: orderId,
      networks: [],
      sandbox: true,
      status: "pending",
      planKey: opts.planKey,
    };
  }

  const chosen =
    nets.find((n) => n.coin === opts.coin && n.net === opts.net) || nets[0];
  await db.execute({
    sql: "INSERT INTO subscriptions (user_id, status, plan, amount, coin, network, plan_key, order_id) VALUES (?, 'pending', ?, ?, ?, ?, ?, ?)",
    args: [opts.userId, plan, opts.amount, chosen.coin, chosen.net, opts.planKey || null, orderId],
  });
  return {
    orderId,
    amount: opts.amount,
    coin: chosen.coin,
    net: chosen.net,
    address: chosen.address,
    reference: orderId,
    networks: nets,
    uri:
      chosen.coin === "BTC"
        ? `bitcoin:${chosen.address}`
        : chosen.coin === "ETH"
        ? `ethereum:${chosen.address}`
        : `https://tronscan.org/#/address/${chosen.address}`,
    sandbox: false,
    status: "pending",
    planKey: opts.planKey,
  };
}

/** Grant access. Used by the admin verify action and (later) by webhooks. */
export async function confirmPayment(
  orderId: string,
  extra?: { txHash?: string; network?: string }
) {
  // Duration comes from the plan the user actually bought.
  const sub = await db.execute({
    sql: "SELECT plan_key FROM subscriptions WHERE order_id = ?",
    args: [orderId],
  });
  const row = sub.rows[0] as unknown as { plan_key: string | null };
  const plan = getPlan(row?.plan_key || undefined);
  const days = plan ? plan.days : parseInt(process.env.ACCESS_DAYS || "30", 10);
  // SQLite datetime format (YYYY-MM-DD HH:MM:SS) so the
  // `expires_at > datetime('now')` check in getActiveSubscription works.
  const expires = new Date(Date.now() + days * 86400000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19);
  // On an upgrade, cancel the user's previous active sub so only the
  // new (higher) tier stays active.
  const target = await db.execute({
    sql: "SELECT user_id FROM subscriptions WHERE order_id = ?",
    args: [orderId],
  });
  const trow = target.rows[0] as unknown as { user_id: number } | undefined;
  if (trow) {
    await db.execute({
      sql: "UPDATE subscriptions SET status='cancelled' WHERE user_id = ? AND status = 'active' AND order_id != ?",
      args: [trow.user_id, orderId],
    });
  }
  await db.execute({
    sql: "UPDATE subscriptions SET status='active', paid_at=datetime('now'), expires_at=?, tx_hash=?, network=? WHERE order_id=?",
    args: [expires, extra?.txHash || null, extra?.network || null, orderId],
  });
}

/** Verify a processor webhook (NowPayments / BTCPay). Stub until wired up. */
export async function verifyWebhook(
  _rawBody: string,
  signature: string | null
): Promise<boolean> {
  if (isSandbox()) return true; // sandbox trusts the dev simulate endpoint
  if (!signature) return false;
  // When you add a processor, verify its HMAC here, e.g.:
  // const expected = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET!).update(rawBody).digest("hex");
  // return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  return false;
}
