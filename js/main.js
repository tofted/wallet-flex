import { CONFIG } from './config.js';

// Tiny hash router. Hash routes work on any static host with zero server config.
//   #/                              start menu
//   #/wallet                        3D wallet + live overview
//   #/minecraft                     Minecraft homepage
//   #/minecraft/technology[/id]     the technical portfolio (id: network | csmp | cminigames)
const $ = (sel) => document.querySelector(sel);
const views = { menu: $('#view-menu'), wallet: $('#view-wallet'), minecraft: $('#view-minecraft') };
const mcPages = { '': $('#mc-home'), technology: $('#mc-tech') };
const titles = {
  menu: 'calanonsol',
  wallet: `@${CONFIG.pumpUsername} · wallet`,
  minecraft: `@${CONFIG.pumpUsername} · Minecraft`,
  technology: `@${CONFIG.pumpUsername} · Minecraft technology`,
};
const LEGACY = ['csmp', 'cminigames', 'network']; // old links: #/minecraft/csmp

document.querySelectorAll('[data-username]').forEach((el) => (el.textContent = CONFIG.pumpUsername));

let currentKey = null;
let walletMod = null;
let techRendered = false;
let homeRendered = false;

function parse() {
  const seg = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const name = seg[0] in views ? seg[0] : 'menu';
  if (name !== 'minecraft') return { name, sub: '', section: '' };
  if (LEGACY.includes(seg[1])) return { redirect: `#/minecraft/technology/${seg[1]}` };
  const sub = seg[1] === 'technology' ? 'technology' : '';
  return { name, sub, section: sub ? (seg[2] ?? '') : '' };
}

async function show({ name, sub, section }) {
  const key = `${name}:${sub}`;
  const changed = key !== currentKey;
  const prevName = currentKey?.split(':')[0];
  currentKey = key;

  for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
  document.title = titles[sub || name];

  if (prevName === 'wallet' && name !== 'wallet') walletMod?.leave();

  if (name === 'wallet') {
    walletMod ??= await import('./wallet-page.js');
    if (currentKey === key) walletMod.enter(); // user may have navigated away while loading
  }

  if (name === 'minecraft') {
    for (const [k, el] of Object.entries(mcPages)) el.hidden = k !== sub;
    document.querySelectorAll('#mc-topnav a').forEach((a) => {
      if (a.dataset.sub === sub) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    if (sub === 'technology' && !techRendered) {
      techRendered = true;
      const { renderMinecraft } = await import('./minecraft.js');
      renderMinecraft($('#mc-projects'), $('#mc-intro'), $('#mc-nav'));
    }
    if (sub === '' && !homeRendered) {
      homeRendered = true;
      const [{ renderHome }, { createMinecraftScene }] = await Promise.all([import('./minecraft-home.js'), import('./minecraft-scene.js')]);
      renderHome($('#mch-hero'), $('#mch-body'));
      // Created after the page is visible so it measures a real size. No WebGL just means a plain gradient.
      if (!createMinecraftScene($('#mch-stage'))) $('#mch-hero').classList.add('no-webgl');
    }
  }

  if (changed) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Move focus into the new page so keyboard and screen reader users land somewhere sensible.
    const page = name === 'minecraft' ? mcPages[sub] : views[name];
    page?.querySelector('h1')?.focus({ preventScroll: true });
  }
  if (name === 'minecraft' && sub === 'technology' && section) {
    document.getElementById(`mc-${section}`)?.scrollIntoView({ block: 'start' });
  }
}

function route() {
  const r = parse();
  if (r.redirect) return location.replace(r.redirect); // fires hashchange again
  return show(r);
}

addEventListener('hashchange', route);
route();
