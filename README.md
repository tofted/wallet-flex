# wallet-flex

A 3D leather wallet that folds open on hover and shows a live overview of a Solana wallet and its pump.fun creator profile.

- **Wallet**: `CALANwvNDkspSsomAx4DRYQd87hcm7sRaSnUhKasNoJc`
- **pump.fun**: `@calanonsol`

Static site. No build step, no backend, no API keys. three.js is vendored in `vendor/`.

## Run it

ES modules don't load from `file://`, so serve the folder:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy to itscalan.org (GitHub Pages)

`CNAME` already contains `itscalan.org`. Then:

1. Repo **Settings > Pages**: deploy from a branch, pick the branch (and `/ (root)`), save.
2. At your DNS provider, add for the apex `itscalan.org`:
   - `A` records: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - optional `AAAA` records: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - optional `www` as a `CNAME` to `tofted.github.io` (GitHub then redirects www to the apex)
3. Back in Settings > Pages, wait for the DNS check, then tick **Enforce HTTPS** (the certificate can take up to an hour).

Any other static host (Netlify, Cloudflare Pages, Vercel) also works, just delete `CNAME` and follow their domain steps.

## How it behaves

- **Desktop**: hover the wallet and the cover swings open, cards slide out. Move away and it closes.
- **Touch**: tap the wallet to toggle.
- **Keyboard / click**: the "Open wallet" button pins it open.
- Reduced-motion users get no idle float or pointer parallax.
- No WebGL? The overview below the wallet still works.

## Where the data comes from

Everything is fetched in the visitor's browser and refreshes every 60s.

| What | Source |
| --- | --- |
| SOL balance, token accounts, recent transactions | Solana JSON-RPC (`js/config.js` > `rpcEndpoints`) |
| Token prices, names, logos | DexScreener |
| Profile, followers, created coins | `frontend-api-v3.pump.fun` |

Things worth knowing:

- **Public RPCs rate limit hard**, and some refuse browser origins outright. If balances come up empty, put your own RPC URL first in `rpcEndpoints` (Helius, QuickNode, etc). A domain-restricted key is fine to ship in client code.
- **pump.fun's API is unofficial** and may block browsers or change shape. If it fails, the pump.fun panel falls back to pump.fun tokens the wallet holds (mints ending in `pump`), and the profile link still works.
- The pump.fun profile picture is only drawn onto the 3D card if its host sends CORS headers. Otherwise the card shows a monogram.
- Token logos and names come from third parties, so everything is rendered with `textContent`, never `innerHTML`.

## Change the wallet / username

Edit `js/config.js`. That's the only place they live (the leather logo and cards read from it too).

## Files

```
index.html        page + import map
styles.css
js/config.js      wallet, username, endpoints
js/data.js        all network calls, partial failure tolerant
js/wallet3d.js    the 3D wallet, textures, card painting, hover logic
js/ui.js          overview panels
js/main.js        glue
vendor/three/     three.js (MIT) + RoundedBoxGeometry, RoomEnvironment
```
