import { CONFIG } from './config.js';

// Tiny hash router. Hash routes work on any static host with zero server config.
//   #/            start menu
//   #/wallet      3D wallet + live overview
//   #/minecraft   portfolio (#/minecraft/csmp scrolls to a section)
const $ = (sel) => document.querySelector(sel);
const views = { menu: $('#view-menu'), wallet: $('#view-wallet'), minecraft: $('#view-minecraft') };
const titles = {
  menu: 'calanonsol',
  wallet: `@${CONFIG.pumpUsername} · wallet`,
  minecraft: `@${CONFIG.pumpUsername} · Minecraft`,
};

document.querySelectorAll('[data-username]').forEach((el) => (el.textContent = CONFIG.pumpUsername));

let current = null;
let walletMod = null;
let mcRendered = false;

function parse() {
  const [, name = '', section = ''] = location.hash.split('/');
  return { name: name in views ? name : 'menu', section };
}

async function show({ name, section }) {
  const changed = name !== current;
  const prev = current;
  current = name;

  for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
  document.title = titles[name];

  if (prev === 'wallet' && changed) walletMod?.leave();

  if (name === 'wallet') {
    walletMod ??= await import('./wallet-page.js');
    if (current === 'wallet') walletMod.enter(); // user may have navigated away while loading
  }

  if (name === 'minecraft' && !mcRendered) {
    mcRendered = true;
    const { renderMinecraft } = await import('./minecraft.js');
    renderMinecraft($('#mc-projects'), $('#mc-intro'), $('#mc-nav'));
  }

  if (changed) {
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Move focus into the new view so keyboard and screen reader users land somewhere sensible.
    views[name].querySelector('h1')?.focus({ preventScroll: true });
  }
  if (name === 'minecraft' && section) {
    document.getElementById(`mc-${section}`)?.scrollIntoView({ block: 'start' });
  }
}

addEventListener('hashchange', () => show(parse()));
show(parse());
