import { CONFIG } from './config.js';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const TOKEN_PROGRAMS = [
  'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // classic SPL token
  'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', // Token-2022
];

async function fetchJson(url, { timeout = 9000, ...init } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

let rpcStart = 0;
async function rpc(method, params) {
  const list = CONFIG.rpcEndpoints;
  let lastErr;
  for (let i = 0; i < list.length; i++) {
    const idx = (rpcStart + i) % list.length;
    try {
      const json = await fetchJson(list[idx], {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      });
      if (json.error) throw new Error(json.error.message || 'RPC error');
      rpcStart = idx; // stick with whatever works
      return json.result;
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr ?? new Error('No RPC endpoint configured');
}

// Only ever let https URLs reach <img src> or a canvas.
export function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

async function loadSolBalance(wallet) {
  const res = await rpc('getBalance', [wallet, { commitment: 'confirmed' }]);
  return res.value / 1e9;
}

async function loadTokenAccounts(wallet) {
  const results = await Promise.all(
    TOKEN_PROGRAMS.map((programId) =>
      rpc('getTokenAccountsByOwner', [wallet, { programId }, { encoding: 'jsonParsed' }]).catch(
        (err) => ({ err }),
      ),
    ),
  );
  // The classic program is the one that matters. Token-2022 failing alone is not fatal.
  if (results[0].err) throw results[0].err;

  const byMint = new Map();
  for (const r of results) {
    for (const acc of r.value ?? []) {
      const info = acc.account?.data?.parsed?.info;
      const amount = num(info?.tokenAmount?.uiAmount);
      if (!info?.mint || !amount || amount <= 0) continue;
      byMint.set(info.mint, (byMint.get(info.mint) ?? 0) + amount);
    }
  }
  return [...byMint].map(([mint, amount]) => ({ mint, amount }));
}

async function loadActivity(wallet) {
  const sigs = await rpc('getSignaturesForAddress', [wallet, { limit: 10 }]);
  return sigs.map((s) => ({
    signature: s.signature,
    time: s.blockTime ? s.blockTime * 1000 : null,
    ok: !s.err,
  }));
}

// DexScreener: one call prices up to 30 mints and also hands back names + logos.
async function loadPrices(mints) {
  const unique = [...new Set(mints)];
  const chunks = [];
  for (let i = 0; i < unique.length && i < 90; i += 30) chunks.push(unique.slice(i, i + 30));

  const results = await Promise.allSettled(
    chunks.map((c) => fetchJson(`${CONFIG.dexscreenerApi}/tokens/v1/solana/${c.join(',')}`)),
  );
  // Partial failure is fine, total failure should be visible in the UI.
  if (results.every((r) => r.status === 'rejected')) throw results[0].reason;
  const pages = results.map((r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []));

  const best = new Map();
  for (const pair of pages.flat()) {
    const mint = pair?.baseToken?.address;
    const price = num(pair?.priceUsd);
    if (!mint || price === null) continue;
    const liq = num(pair?.liquidity?.usd) ?? 0;
    const cur = best.get(mint);
    if (!cur || liq > cur.liq) {
      best.set(mint, {
        liq,
        priceUsd: price,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        image: safeUrl(pair.info?.imageUrl),
        change24h: num(pair.priceChange?.h24),
        marketCap: num(pair.marketCap) ?? num(pair.fdv),
      });
    }
  }
  return best;
}

async function loadSolPriceFallback() {
  const j = await fetchJson('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
  return num(j?.solana?.usd);
}

async function loadPumpProfile(wallet) {
  const j = await fetchJson(`${CONFIG.pumpApi}/users/${wallet}`);
  return {
    username: typeof j.username === 'string' ? j.username : null,
    followers: num(j.followers),
    following: num(j.following),
    image: safeUrl(j.profile_image),
    bio: typeof j.bio === 'string' ? j.bio : null,
  };
}

async function loadPumpCoins(wallet) {
  const j = await fetchJson(
    `${CONFIG.pumpApi}/coins/user-created-coins/${wallet}?offset=0&limit=20&includeNsfw=true`,
  );
  const list = Array.isArray(j) ? j : (j.coins ?? []);
  return list
    .map((c) => ({
      mint: c.mint,
      name: String(c.name ?? ''),
      symbol: String(c.symbol ?? ''),
      image: safeUrl(c.image_uri),
      marketCapUsd: num(c.usd_market_cap),
      createdAt: num(c.created_timestamp),
      graduated: Boolean(c.complete),
    }))
    .filter((c) => c.mint)
    .sort((a, b) => (b.marketCapUsd ?? 0) - (a.marketCapUsd ?? 0));
}

const settle = (p) => p.then((value) => ({ value }), (error) => ({ error }));
const errMsg = (r) => (r.error ? String(r.error.message ?? r.error) : null);

export async function loadOverview() {
  const wallet = CONFIG.wallet;

  const [bal, accounts, activity, profile, coins] = await Promise.all([
    settle(loadSolBalance(wallet)),
    settle(loadTokenAccounts(wallet)),
    settle(loadActivity(wallet)),
    settle(loadPumpProfile(wallet)),
    settle(loadPumpCoins(wallet)),
  ]);

  // Price SOL, every held token and every created coin in one go.
  const mints = [
    SOL_MINT,
    ...(accounts.value ?? []).map((a) => a.mint),
    ...(coins.value ?? []).map((c) => c.mint),
  ];
  const prices = await settle(loadPrices(mints));
  const priceMap = prices.value ?? new Map();

  let solPrice = priceMap.get(SOL_MINT)?.priceUsd ?? null;
  if (solPrice === null) solPrice = (await settle(loadSolPriceFallback())).value ?? null;

  const tokens = (accounts.value ?? [])
    .map(({ mint, amount }) => {
      const p = priceMap.get(mint);
      return {
        mint,
        amount,
        symbol: p?.symbol ?? null,
        name: p?.name ?? null,
        image: p?.image ?? null,
        priceUsd: p?.priceUsd ?? null,
        change24h: p?.change24h ?? null,
        valueUsd: p ? amount * p.priceUsd : null,
        isPump: mint.endsWith('pump'), // pump.fun mints are vanity addresses ending in "pump"
      };
    })
    .sort((a, b) => (b.valueUsd ?? -1) - (a.valueUsd ?? -1));

  // Created coins: fall back to DexScreener's market cap if pump.fun's number is missing.
  const pumpCoins = coins.value
    ? coins.value.map((c) => ({ ...c, marketCapUsd: c.marketCapUsd ?? priceMap.get(c.mint)?.marketCap ?? null }))
    : null;

  const solAmount = bal.value ?? null;
  const solValue = solAmount !== null && solPrice !== null ? solAmount * solPrice : null;
  const tokensValue = tokens.reduce((s, t) => s + (t.valueUsd ?? 0), 0);

  return {
    wallet,
    fetchedAt: Date.now(),
    sol: { amount: solAmount, priceUsd: solPrice, valueUsd: solValue },
    tokens,
    totalUsd: solValue === null && !tokens.length ? null : (solValue ?? 0) + tokensValue,
    activity: activity.value ?? null,
    pump: { profile: profile.value ?? null, coins: pumpCoins },
    errors: {
      balance: errMsg(bal),
      tokens: errMsg(accounts),
      activity: errMsg(activity),
      profile: errMsg(profile),
      coins: errMsg(coins),
      prices: errMsg(prices),
    },
  };
}
