import { CONFIG, links } from './config.js';
import { loadOverview } from './data.js';
import { timeAgo } from './format.js';
import { renderOverview, renderSkeleton } from './ui.js';
import { createWallet } from './wallet3d.js';

const $ = (sel) => document.querySelector(sel);

const stage = $('#stage');
const overview = $('#overview');
const refreshBtn = $('#refresh');
const updated = $('#updated');
const toggleBtn = $('#toggle');
const hint = $('#hint');

$('#link-pump').href = links.pump();
$('#link-solscan').href = links.solscan();
document.querySelectorAll('[data-username]').forEach((el) => (el.textContent = CONFIG.pumpUsername));

// ---- 3D wallet (optional: the overview below works without WebGL)
const wallet = createWallet(stage);
if (wallet) {
  const touch = window.matchMedia('(hover: none)').matches;
  const label = (open) => {
    toggleBtn.textContent = open ? 'Close wallet' : 'Open wallet';
    toggleBtn.setAttribute('aria-expanded', String(open));
    hint.textContent = open ? 'Details below ↓' : touch ? 'Tap the wallet to open' : 'Hover to open';
    stage.classList.toggle('is-open', open);
  };
  label(false);
  wallet.onChange(label);
  toggleBtn.addEventListener('click', () => wallet.toggle());
} else {
  stage.classList.add('no-webgl');
  toggleBtn.hidden = true;
  hint.textContent = '';
}

// ---- live data
let lastData = null;
let inflight = false;

function setUpdated() {
  if (!lastData) return;
  const failed = Object.values(lastData.errors).filter(Boolean).length;
  updated.textContent =
    failed >= 5 ? 'Live data unreachable' : `Updated ${timeAgo(lastData.fetchedAt)}${failed ? ` · ${failed} source${failed === 1 ? '' : 's'} failed` : ''}`;
}

async function refresh() {
  if (inflight) return;
  inflight = true;
  refreshBtn.disabled = true;
  refreshBtn.textContent = 'Refreshing…';
  try {
    const d = await loadOverview();
    lastData = d;
    renderOverview(overview, d);
    wallet?.setData(d);
    setUpdated();
  } catch (err) {
    console.error(err);
    updated.textContent = 'Something broke loading data';
  } finally {
    inflight = false;
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  }
}

renderSkeleton(overview);
refreshBtn.addEventListener('click', refresh);
refresh();
setInterval(() => {
  if (!document.hidden) refresh();
}, CONFIG.refreshMs);
setInterval(() => {
  if (!inflight) setUpdated();
}, 15_000);
