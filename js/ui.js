import { CONFIG, links } from './config.js';
import { amount, compactUsd, shortAddr, sol, timeAgo, usd } from './format.js';

// Tiny DOM builder. Text always goes through textContent, so nothing from an API
// response can inject markup.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return el;
}

const ext = (href, text, cls) => h('a', { href, target: '_blank', rel: 'noopener noreferrer', class: cls }, text);

function stat(label, value, { accent, small } = {}) {
  return h(
    'div',
    { class: 'stat' },
    h('dt', {}, label),
    h('dd', { class: [accent ? 'accent' : '', small ? 'small' : ''].join(' ').trim() }, value),
  );
}

function note(msg) {
  return h('p', { class: 'note' }, msg);
}

// <img> that swaps itself for a letter badge if the host is down, blocks hotlinking, etc.
function img(src, cls, letter) {
  const fallback = () => h('span', { class: `${cls} ${cls}-fallback` }, (letter || '?').slice(0, 1).toUpperCase());
  if (!src) return fallback();
  const el = h('img', { src, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer', class: cls });
  el.addEventListener('error', () => el.replaceWith(fallback()), { once: true });
  return el;
}

const tokenIcon = (t) => img(t.image, 'tok-img', t.symbol ?? '?');

function copyButton(text) {
  const btn = h('button', { type: 'button', class: 'copy', 'aria-label': 'Copy wallet address' }, 'Copy');
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Press ⌘/Ctrl+C';
    }
    setTimeout(() => (btn.textContent = 'Copy'), 1600);
  });
  return btn;
}

function walletPanel(d) {
  const e = d.errors;
  return h(
    'article',
    { class: 'panel' },
    h('header', {}, h('h2', {}, 'Wallet'), ext(links.solscan(), 'Solscan ↗', 'ghost')),
    h('div', { class: 'addr' }, h('code', {}, CONFIG.wallet), copyButton(CONFIG.wallet)),
    e.balance && e.tokens
      ? note('Could not reach a Solana RPC or price feed. Public endpoints rate limit hard, add your own in js/config.js.')
      : h(
          'dl',
          { class: 'stats' },
          stat('SOL balance', d.sol.amount != null ? `${sol(d.sol.amount)} SOL` : '—'),
          stat('SOL value', usd(d.sol.valueUsd)),
          stat('Portfolio', usd(d.totalUsd), { accent: true }),
          stat('Tokens', e.tokens ? '—' : String(d.tokens.length)),
          stat('SOL price', usd(d.sol.priceUsd), { small: true }),
        ),
    e.prices && !e.balance ? note('Token prices unavailable right now, values may be partial.') : null,
  );
}

function pumpPanel(d) {
  const { profile, coins } = d.pump;
  const e = d.errors;
  const username = profile?.username ?? CONFIG.pumpUsername;
  const held = d.tokens.filter((t) => t.isPump);

  let coinBlock;
  if (coins?.length) {
    coinBlock = h(
      'ul',
      { class: 'rows' },
      coins.slice(0, 8).map((c) =>
        h(
          'li',
          {},
          ext(`https://pump.fun/coin/${c.mint}`, [
            img(c.image, 'tok-img', c.symbol || c.name),
            h('span', { class: 'row-main' }, h('strong', {}, c.symbol ? `$${c.symbol}` : c.name), c.name && c.symbol ? h('small', {}, c.name) : null),
            c.graduated ? h('span', { class: 'badge' }, 'graduated') : null,
            h('span', { class: 'row-val' }, compactUsd(c.marketCapUsd)),
          ], 'row'),
        ),
      ),
    );
  } else if (coins) {
    coinBlock = note('No coins created from this wallet yet.');
  } else if (held.length) {
    coinBlock = h(
      'div',
      {},
      note("pump.fun's API didn't answer (it often blocks browsers). Showing pump.fun tokens this wallet holds instead:"),
      h(
        'ul',
        { class: 'rows' },
        held.slice(0, 6).map((t) =>
          h('li', {}, ext(`https://pump.fun/coin/${t.mint}`, [tokenIcon(t), h('span', { class: 'row-main' }, h('strong', {}, t.symbol ? `$${t.symbol}` : shortAddr(t.mint))), h('span', { class: 'row-val' }, usd(t.valueUsd))], 'row')),
        ),
      ),
    );
  } else {
    coinBlock = note("Couldn't load pump.fun data. The profile link above still works.");
  }

  return h(
    'article',
    { class: 'panel pump' },
    h('header', {}, h('h2', {}, 'pump.fun'), ext(links.pump(), 'Profile ↗', 'ghost')),
    h(
      'div',
      { class: 'profile' },
      img(profile?.image, 'avatar', username),
      h('div', {}, h('p', { class: 'handle' }, `@${username}`), profile?.bio ? h('p', { class: 'bio' }, profile.bio) : null),
    ),
    h(
      'dl',
      { class: 'stats' },
      stat('Followers', profile?.followers != null ? profile.followers.toLocaleString() : e.profile ? '—' : '…'),
      stat('Coins created', coins ? String(coins.length) : '—'),
      stat('Graduated', coins ? String(coins.filter((c) => c.graduated).length) : '—'),
    ),
    h('h3', {}, coins?.length ? 'Created coins' : 'Coins'),
    coinBlock,
  );
}

function holdingsPanel(d) {
  // If the price feed is down, show everything we have instead of hiding it as "unpriced".
  const priced = d.errors.prices ? d.tokens : d.tokens.filter((t) => t.valueUsd != null);
  const unpriced = d.errors.prices ? 0 : d.tokens.length - priced.length;
  let body;
  if (d.errors.tokens) body = note('Could not read token accounts from the RPC.');
  else if (!d.tokens.length) body = note('No SPL tokens in this wallet.');
  else
    body = h(
      'div',
      { class: 'table-wrap' },
      h(
        'table',
        {},
        h('thead', {}, h('tr', {}, h('th', {}, 'Token'), h('th', { class: 'num' }, 'Amount'), h('th', { class: 'num hide-sm' }, 'Price'), h('th', { class: 'num' }, 'Value'))),
        h(
          'tbody',
          {},
          priced.slice(0, 12).map((t) =>
            h(
              'tr',
              {},
              h('td', {}, ext(links.solscan(`token/${t.mint}`), [tokenIcon(t), h('span', {}, t.symbol ?? shortAddr(t.mint)), t.isPump ? h('span', { class: 'badge' }, 'pump') : null], 'tok')),
              h('td', { class: 'num' }, amount(t.amount)),
              h('td', { class: 'num hide-sm' }, usd(t.priceUsd)),
              h('td', { class: 'num strong' }, usd(t.valueUsd)),
            ),
          ),
        ),
      ),
      priced.length > 12 ? note(`+${priced.length - 12} more priced tokens`) : null,
      d.errors.prices ? note('Price feed unreachable, so values are missing.') : null,
      unpriced ? note(`${unpriced} token${unpriced === 1 ? '' : 's'} with no market price (dust or dead coins), hidden.`) : null,
    );
  return h('article', { class: 'panel' }, h('header', {}, h('h2', {}, 'Holdings')), body);
}

function activityPanel(d) {
  let body;
  if (d.errors.activity) body = note('Could not load recent transactions.');
  else if (!d.activity?.length) body = note('No transactions found.');
  else
    body = h(
      'ul',
      { class: 'rows' },
      d.activity.map((a) =>
        h(
          'li',
          {},
          ext(links.solscan(`tx/${a.signature}`), [
            h('span', { class: `dot ${a.ok ? 'ok' : 'fail'}`, title: a.ok ? 'Succeeded' : 'Failed' }),
            h('code', { class: 'row-main' }, shortAddr(a.signature, 8, 6)),
            h('span', { class: 'row-val' }, timeAgo(a.time)),
          ], 'row'),
        ),
      ),
    );
  return h('article', { class: 'panel' }, h('header', {}, h('h2', {}, 'Recent activity')), body);
}

export function renderOverview(root, d) {
  root.replaceChildren(walletPanel(d), pumpPanel(d), holdingsPanel(d), activityPanel(d));
  root.setAttribute('aria-busy', 'false');
}

export function renderSkeleton(root) {
  root.setAttribute('aria-busy', 'true');
  root.replaceChildren(
    ...[1, 2, 3, 4].map(() => h('article', { class: 'panel skeleton', 'aria-hidden': 'true' }, h('span', { class: 'sk w40' }), h('span', { class: 'sk w80' }), h('span', { class: 'sk w60' }), h('span', { class: 'sk w70' }))),
  );
}
