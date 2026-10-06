// Everything you'd want to change lives here.
export const CONFIG = {
  wallet: 'CALANwvNDkspSsomAx4DRYQd87hcm7sRaSnUhKasNoJc',
  pumpUsername: 'calanonsol',

  // Auto refresh interval for live data.
  refreshMs: 60_000,

  // Tried in order, first one that answers wins. Public endpoints get rate
  // limited a lot, so if the numbers look stale drop your own RPC URL
  // (Helius, QuickNode, Triton...) at the top of this list.
  rpcEndpoints: [
    'https://solana-rpc.publicnode.com',
    'https://api.mainnet-beta.solana.com',
  ],

  pumpApi: 'https://frontend-api-v3.pump.fun',
  dexscreenerApi: 'https://api.dexscreener.com',
};

export const links = {
  pump: () => `https://pump.fun/profile/${CONFIG.wallet}`,
  solscan: (path = `account/${CONFIG.wallet}`) => `https://solscan.io/${path}`,
};
