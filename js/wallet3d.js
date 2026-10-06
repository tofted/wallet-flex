import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { CONFIG } from './config.js';
import { amount, compactUsd, shortAddr, sol, usd } from './format.js';
import { safeUrl } from './data.js';

// ---------------------------------------------------------------- dimensions
const W = 2.2; // width of one half
const H = 3.0;
const T = 0.1; // leather thickness
const GAP = 0.14; // room between the two halves when closed
const CARD = { w: 1.7, h: 1.05, d: 0.016 };

const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (v) => {
  v = clamp01(v);
  return v * v * (3 - 2 * v);
};
const easeInOut = (v) => (v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2);

// -------------------------------------------------------------- canvas helpers
function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx, text, maxWidth, size, weight = 700, family = FONT) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && s > 18) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  return s;
}

function noiseCanvas(size, scale, seedAlpha = 1) {
  const [small, sctx] = makeCanvas(size / scale, size / scale);
  const img = sctx.createImageData(small.width, small.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + Math.random() * 120;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255 * seedAlpha;
  }
  sctx.putImageData(img, 0, 0);
  const [big, bctx] = makeCanvas(size, size);
  bctx.imageSmoothingEnabled = true;
  bctx.imageSmoothingQuality = 'high';
  bctx.drawImage(small, 0, 0, size, size);
  return big;
}

function stitch(ctx, x, y, w, h, r, color, dash = [14, 11], width = 4) {
  ctx.save();
  ctx.setLineDash(dash);
  ctx.lineCap = 'round';
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
  ctx.restore();
}

function paintLeather(ctx, w, h, base, grain) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = grain;
  ctx.drawImage(noiseCanvas(512, 2), 0, 0, w, h);
  ctx.globalAlpha = grain * 0.7;
  ctx.drawImage(noiseCanvas(512, 6), 0, 0, w, h);
  ctx.restore();
  // soft vignette so the edges look worn in
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

// -------------------------------------------------------- panel/face textures
const TEX_W = 1024;
const TEX_H = Math.round((TEX_W * H) / W);

function exteriorTexture({ logo }) {
  const [c, ctx] = makeCanvas(TEX_W, TEX_H);
  paintLeather(ctx, TEX_W, TEX_H, '#4a2c1a', 0.55);
  stitch(ctx, 46, 46, TEX_W - 92, TEX_H - 92, 40, 'rgba(232,196,128,0.9)');
  if (logo) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const cx = TEX_W / 2;
    const cy = TEX_H / 2 - 40;
    // debossed ring + monogram: dark offset first, light offset second, then the base tone
    for (const [dx, dy, col] of [
      [3, 3, 'rgba(255,225,170,0.22)'],
      [-2, -2, 'rgba(0,0,0,0.55)'],
      [0, 0, 'rgba(48,26,14,0.9)'],
    ]) {
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 150, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = `800 190px ${FONT}`;
      ctx.fillText('C', cx + dx, cy + dy + 8);
      ctx.font = `700 46px ${FONT}`;
      ctx.letterSpacing = '14px';
      ctx.fillText(CONFIG.pumpUsername.toUpperCase(), cx + dx + 7, cy + 300 + dy);
    }
    ctx.restore();
  }
  return finishTexture(c);
}

function liningTexture() {
  const [c, ctx] = makeCanvas(TEX_W, TEX_H);
  paintLeather(ctx, TEX_W, TEX_H, '#1c1511', 0.4);
  stitch(ctx, 40, 40, TEX_W - 80, TEX_H - 80, 34, 'rgba(232,196,128,0.45)', [10, 9], 3);
  return finishTexture(c);
}

function finishTexture(canvas, color = true) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

// ------------------------------------------------------------- card painting
const CARD_PX = { w: 1024, h: Math.round((1024 * CARD.h) / CARD.w) };

function cardBase(ctx, c1, c2, accent) {
  const { w, h } = CARD_PX;
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // faint diagonal sheen
  const s = ctx.createLinearGradient(0, 0, w, h * 0.6);
  s.addColorStop(0.35, 'rgba(255,255,255,0)');
  s.addColorStop(0.5, 'rgba(255,255,255,0.07)');
  s.addColorStop(0.65, 'rgba(255,255,255,0)');
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, 10);
}

function label(ctx, text, accent, y = 74) {
  ctx.font = `700 30px ${FONT}`;
  ctx.letterSpacing = '6px';
  ctx.fillStyle = accent;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillText(text, 56, y);
  ctx.letterSpacing = '0px';
}

function row(ctx, y, left, right, { dim = 'rgba(255,255,255,0.55)', fg = '#fff', size = 40 } = {}) {
  ctx.textAlign = 'left';
  ctx.font = `600 ${size}px ${FONT}`;
  ctx.fillStyle = fg;
  ctx.fillText(left, 56, y);
  ctx.textAlign = 'right';
  ctx.fillStyle = dim;
  ctx.fillText(right, CARD_PX.w - 56, y);
}

// label on the left (dim), value on the right (bright)
function kv(ctx, y, k, v, { color = '#fff', size = 34 } = {}) {
  row(ctx, y, k, v, { fg: 'rgba(255,255,255,0.5)', dim: color, size });
}

const CARD_PAINTERS = {
  pump(ctx, d, avatar) {
    const accent = '#5cffb0';
    cardBase(ctx, '#10241b', '#07110c', accent);
    label(ctx, 'PUMP.FUN  ·  CREATOR', accent);
    const name = `@${d?.pump.profile?.username ?? CONFIG.pumpUsername}`;
    fitText(ctx, name, 640, 96, 800);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(name, 56, 200);

    // avatar
    const cx = CARD_PX.w - 140;
    const cy = 160;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.clip();
    if (avatar) {
      ctx.drawImage(avatar, cx - 78, cy - 78, 156, 156);
    } else {
      ctx.fillStyle = '#143827';
      ctx.fillRect(cx - 78, cy - 78, 156, 156);
      ctx.fillStyle = accent;
      ctx.font = `800 84px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('C', cx, cy + 4);
      ctx.textBaseline = 'alphabetic';
    }
    ctx.restore();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, Math.PI * 2);
    ctx.stroke();

    const p = d?.pump.profile;
    const coins = d?.pump.coins;
    ctx.font = `600 38px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.textAlign = 'left';
    ctx.fillText(
      [
        p?.followers != null ? `${p.followers.toLocaleString()} followers` : null,
        coins ? `${coins.length} coin${coins.length === 1 ? '' : 's'} created` : null,
      ]
        .filter(Boolean)
        .join('   ·   ') || 'profile loading…',
      56,
      290,
    );

    // below the pocket line, visible once the card slides out
    kv(ctx, 430, 'wallet', shortAddr(CONFIG.wallet, 6, 6));
    const graduated = coins?.filter((c) => c.graduated).length;
    if (graduated != null) kv(ctx, 500, 'graduated', String(graduated), { color: accent });
    ctx.font = `500 30px ${MONO}`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'left';
    ctx.fillText('pump.fun/profile', 56, 580);
  },

  balance(ctx, d) {
    const accent = '#8f7bff';
    cardBase(ctx, '#1e1740', '#0b0918', '#14f195');
    const g = ctx.createLinearGradient(0, 0, CARD_PX.w, 0);
    g.addColorStop(0, '#9945ff');
    g.addColorStop(1, '#14f195');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_PX.w, 10);
    label(ctx, 'SOL BALANCE', accent);

    const s = d?.sol.amount;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    const text = s == null ? '—' : sol(s);
    fitText(ctx, text, 620, 112, 800);
    ctx.fillText(text, 56, 205);
    const tw = ctx.measureText(text).width;
    ctx.font = `700 44px ${FONT}`;
    ctx.fillStyle = '#14f195';
    ctx.fillText('SOL', 56 + tw + 20, 205);

    ctx.font = `600 44px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(d?.sol.valueUsd != null ? `≈ ${usd(d.sol.valueUsd)}` : 'price unavailable', 56, 290);

    kv(ctx, 430, 'portfolio', usd(d?.totalUsd), { color: '#14f195', size: 38 });
    kv(ctx, 500, 'tokens held', d ? String(d.tokens.length) : '—');
    kv(ctx, 570, 'SOL price', usd(d?.sol.priceUsd));
  },

  coins(ctx, d) {
    const accent = '#ffc15a';
    cardBase(ctx, '#2b1d0d', '#120c05', accent);
    const coins = d?.pump.coins;
    const held = d?.tokens.filter((t) => t.isPump) ?? [];
    label(ctx, coins?.length ? 'PUMP.FUN  ·  TOP COINS' : 'PUMP.FUN  ·  COINS HELD', accent);

    const list = coins?.length
      ? coins.slice(0, 5).map((c) => [c.symbol ? `$${c.symbol}` : c.name, compactUsd(c.marketCapUsd)])
      : held.slice(0, 5).map((t) => [t.symbol ? `$${t.symbol}` : shortAddr(t.mint), compactUsd(t.valueUsd)]);

    if (!list.length) {
      ctx.font = `600 44px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(d ? 'nothing found yet' : 'loading…', 56, 180);
      return;
    }
    list.forEach(([l, r], i) => {
      row(ctx, 160 + i * 84, l, r, { fg: i === 0 ? '#fff' : 'rgba(255,255,255,0.85)', dim: accent, size: i === 0 ? 54 : 42 });
    });
    ctx.font = `500 28px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'left';
    ctx.fillText(coins?.length ? 'ranked by market cap' : 'ranked by value held', 56, 600);
  },

  holdings(ctx, d) {
    const accent = '#58b8ff';
    cardBase(ctx, '#0f2036', '#070c14', accent);
    label(ctx, 'TOP HOLDINGS', accent);
    const top = d?.tokens.slice(0, 4) ?? [];
    if (!top.length) {
      ctx.font = `600 44px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.textAlign = 'left';
      ctx.fillText(d ? 'no tokens' : 'loading…', 56, 180);
    }
    top.forEach((t, i) => {
      row(ctx, 160 + i * 84, t.symbol ? `$${t.symbol}` : shortAddr(t.mint), t.valueUsd != null ? usd(t.valueUsd) : amount(t.amount), {
        fg: i === 0 ? '#fff' : 'rgba(255,255,255,0.85)',
        dim: accent,
        size: i === 0 ? 54 : 42,
      });
    });
    ctx.font = `500 30px ${MONO}`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'left';
    ctx.fillText(shortAddr(CONFIG.wallet, 8, 8), 56, 600);
  },
};

// ------------------------------------------------------------------ the thing
export function createWallet(stage) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.prepend(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const key = new THREE.DirectionalLight(0xffe2bd, 2.6);
  key.position.set(-3.5, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 1.4);
  rim.position.set(5, 2, -4);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  const FOV_TAN = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  const aniso = renderer.capabilities.getMaxAnisotropy();
  const own = []; // things to dispose
  const track = (o) => (own.push(o), o);

  // --- materials
  const edgeMat = track(new THREE.MeshStandardMaterial({ color: 0x24140a, roughness: 0.7, metalness: 0 }));
  const bump = track(finishTexture(noiseCanvas(512, 2), false));
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.repeat.set(2, 2.7);
  const leatherMat = (map, rough = 0.62) =>
    track(new THREE.MeshStandardMaterial({ map, roughness: rough, bumpMap: bump, bumpScale: 1.4, metalness: 0 }));

  const exteriorFront = track(exteriorTexture({ logo: true }));
  const exteriorBack = track(exteriorTexture({ logo: false }));
  const lining = track(liningTexture());
  [exteriorFront, exteriorBack, lining].forEach((t) => (t.anisotropy = aniso));

  // faces order from BoxGeometry: +x, -x, +y, -y, +z, -z
  const panelGeo = track(new RoundedBoxGeometry(W, H, T, 5, 0.075));
  const backMats = [edgeMat, edgeMat, edgeMat, edgeMat, leatherMat(lining, 0.85), leatherMat(exteriorBack)];
  const coverMats = [edgeMat, edgeMat, edgeMat, edgeMat, leatherMat(exteriorFront), leatherMat(lining, 0.85)];

  // --- hierarchy
  const rig = new THREE.Group();
  scene.add(rig);
  const wallet = new THREE.Group();
  rig.add(wallet);

  // The spine axis sits halfway between the two panels' mid planes. Closed, the cover
  // is 2 * pivotZ in front of the back panel; open, it swings round to exactly z = 0.
  const pivotZ = (T + GAP) / 2;
  const back = new THREE.Mesh(panelGeo, backMats);
  back.position.set(W / 2, 0, 0);
  wallet.add(back);

  const coverPivot = new THREE.Group();
  coverPivot.position.set(0, 0, pivotZ);
  wallet.add(coverPivot);
  const cover = new THREE.Mesh(panelGeo, coverMats);
  cover.position.set(W / 2, 0, pivotZ); // closed: sits one pivotZ in front of pivot
  coverPivot.add(cover);

  const spineGeo = track(new THREE.CylinderGeometry(1, 1, H - 0.12, 24, 1));
  const spine = new THREE.Mesh(
    spineGeo,
    track(new THREE.MeshStandardMaterial({ color: 0x3a2214, roughness: 0.6, bumpMap: bump, bumpScale: 1 })),
  );
  wallet.add(spine);

  // --- interior contents (built facing +z, origin at the middle of the panel's inner face)
  const cards = []; // {mesh, base:{y,z}, lift, order}
  const cardTextures = {};
  const pocketMat = track(
    new THREE.MeshStandardMaterial({ map: pocketTexture(), roughness: 0.75, bumpMap: bump, bumpScale: 1.2 }),
  );
  function pocketTexture() {
    const [c, ctx] = makeCanvas(1024, 256);
    paintLeather(ctx, 1024, 256, '#33201a', 0.5);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, 1024, 18);
    stitch(ctx, 22, 34, 980, 200, 16, 'rgba(232,196,128,0.75)', [14, 10], 4);
    return track(finishTexture(c));
  }

  const cardGeo = track(new RoundedBoxGeometry(CARD.w, CARD.h, CARD.d, 3, 0.012));
  const cardBackMat = track(new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.5 }));

  function addCard(parent, kind, { y, z, order, lift }) {
    const [canvas2d, ctx] = makeCanvas(CARD_PX.w, CARD_PX.h);
    const tex = track(finishTexture(canvas2d));
    tex.anisotropy = aniso;
    cardTextures[kind] = { tex, ctx, canvas: canvas2d, avatar: null };
    const face = track(new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.05 }));
    const m = new THREE.Mesh(cardGeo, [cardBackMat, cardBackMat, cardBackMat, cardBackMat, face, cardBackMat]);
    m.position.set(0, y, z);
    parent.add(m);
    cards.push({ mesh: m, baseY: y, baseZ: z, lift, order, kind });
    paintCard(kind, null);
    return m;
  }

  function pocket(parent, y, h) {
    const geo = track(new RoundedBoxGeometry(CARD.w + 0.16, h, 0.03, 3, 0.012));
    const m = new THREE.Mesh(geo, pocketMat);
    m.position.set(0, y, 0.1);
    parent.add(m);
    return m;
  }

  function bills(parent) {
    const [c, ctx] = makeCanvas(768, 360);
    const g = ctx.createLinearGradient(0, 0, 768, 360);
    g.addColorStop(0, '#2c8a57');
    g.addColorStop(1, '#17563a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 768, 360);
    ctx.strokeStyle = 'rgba(220,255,230,0.55)';
    ctx.lineWidth = 6;
    ctx.strokeRect(22, 22, 724, 316);
    ctx.fillStyle = 'rgba(220,255,230,0.85)';
    ctx.font = `800 120px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◎ 100', 384, 185);
    const billMat = track(new THREE.MeshStandardMaterial({ map: track(finishTexture(c)), roughness: 0.9 }));
    const geo = track(new THREE.PlaneGeometry(1.8, 0.84));
    [
      { x: -0.08, y: 1.14, r: 0.05, z: 0.058 },
      { x: 0.06, y: 1.12, r: -0.035, z: 0.062 },
      { x: 0.0, y: 1.16, r: 0.012, z: 0.066 },
    ].forEach((b, i) => {
      const m = new THREE.Mesh(geo, billMat);
      m.position.set(b.x, b.y, b.z);
      m.rotation.z = b.r;
      m.userData = { baseY: b.y, order: i };
      parent.add(m);
      billMeshes.push(m);
    });
  }
  const billMeshes = [];

  const backInterior = new THREE.Group();
  backInterior.position.set(W / 2, 0, T / 2);
  wallet.add(backInterior);
  const coverInterior = new THREE.Group();
  coverInterior.position.set(0, 0, -T / 2);
  coverInterior.rotation.y = Math.PI;
  cover.add(coverInterior);

  // right half: cash + balance + holdings
  bills(backInterior);
  addCard(backInterior, 'balance', { y: 0.74, z: 0.075, order: 2, lift: 0.5 });
  pocket(backInterior, 0.5, 0.5);
  addCard(backInterior, 'holdings', { y: -0.28, z: 0.065, order: 3, lift: 0.46 });
  pocket(backInterior, -0.52, 0.56);
  // left half: pump.fun profile + coins
  addCard(coverInterior, 'pump', { y: 0.74, z: 0.075, order: 0, lift: 0.5 });
  pocket(coverInterior, 0.5, 0.5);
  addCard(coverInterior, 'coins', { y: -0.28, z: 0.065, order: 1, lift: 0.46 });
  pocket(coverInterior, -0.52, 0.56);

  // --- soft shadow on the "table"
  const [sc, sctx] = makeCanvas(256, 256);
  const sg = sctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  sg.addColorStop(0, 'rgba(0,0,0,0.75)');
  sg.addColorStop(0.5, 'rgba(0,0,0,0.3)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 256, 256);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    track(new THREE.MeshBasicMaterial({ map: track(finishTexture(sc)), transparent: true, depthWrite: false, toneMapped: false })),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -2.0;
  scene.add(shadow);

  // --- hit area (bigger when open so the wallet doesn't flicker shut under the cursor)
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ visible: false }));
  hit.scale.set(W, H + 0.3, 1.2);
  rig.add(hit);

  // --- state
  const state = {
    target: 0,
    open: 0, // 0..1 smoothed
    pinned: false, // opened by an explicit click/tap, so hover must not close it
    px: 0, // pointer in -1..1 over the stage
    py: 0,
    data: null,
    visible: true,
    reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
  const listeners = new Set();
  const coarse = window.matchMedia('(hover: none)').matches;

  function setOpen(v, pin = false) {
    state.pinned = Boolean(v) && pin;
    if (state.target === v) return;
    state.target = v;
    hit.scale.x = v ? W * 2.08 : W;
    listeners.forEach((fn) => fn(Boolean(v)));
  }

  // --- input
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pointerHits(ev) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -(((ev.clientY - r.top) / r.height) * 2 - 1));
    state.px = ndc.x;
    state.py = ndc.y;
    ray.setFromCamera(ndc, camera);
    return ray.intersectObject(hit, false).length > 0;
  }
  stage.addEventListener('pointermove', (ev) => {
    if (ev.pointerType === 'touch') return;
    const over = pointerHits(ev);
    if (!state.pinned) setOpen(over ? 1 : 0);
  });
  stage.addEventListener('pointerleave', (ev) => {
    if (ev.pointerType === 'touch') return;
    if (!state.pinned) setOpen(0);
    state.px = state.py = 0;
  });
  stage.addEventListener('click', (ev) => {
    // On touch there is no hover, so a tap on the wallet toggles it.
    if (!(coarse || ev.pointerType === 'touch')) return;
    if (pointerHits(ev)) setOpen(state.target ? 0 : 1, true);
    else setOpen(0);
  });

  // --- layout
  function resize() {
    const w = stage.clientWidth || 1;
    const h = stage.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  const io = new IntersectionObserver(([e]) => (state.visible = e.isIntersecting));
  io.observe(stage);

  // --- card textures
  function paintCard(kind, d) {
    const t = cardTextures[kind];
    if (!t) return;
    t.ctx.save();
    t.ctx.clearRect(0, 0, CARD_PX.w, CARD_PX.h);
    CARD_PAINTERS[kind](t.ctx, d, t.avatar);
    t.ctx.restore();
    t.tex.needsUpdate = true;
  }

  async function loadAvatar(url) {
    const safe = safeUrl(url);
    if (!safe) return null;
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = safe;
    });
  }

  async function setData(d) {
    state.data = d;
    for (const k of Object.keys(cardTextures)) paintCard(k, d);
    const url = d?.pump.profile?.image;
    if (url && !cardTextures.pump.avatarUrl) {
      cardTextures.pump.avatarUrl = url;
      // If the image host sends no CORS headers the load fails and we keep the monogram.
      const img = await loadAvatar(url);
      if (img) {
        cardTextures.pump.avatar = img;
        paintCard('pump', state.data);
      }
    }
  }

  // --- animation
  const timer = new THREE.Timer();
  timer.connect(document); // ignores time spent in a background tab
  let t = 0;
  let raf = 0;
  const dist = { closed: 8.2, open: 8.2 };

  function frame() {
    raf = requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    if (!state.visible) return;
    t += dt;

    const speed = state.reduced ? 14 : 3.4;
    state.open += (state.target - state.open) * (1 - Math.exp(-dt * speed));
    if (Math.abs(state.target - state.open) < 0.0005) state.open = state.target;
    const o = state.open;
    const e = easeInOut(o);

    // cover swings about the spine toward the viewer, slightly short of flat
    coverPivot.rotation.y = -e * Math.PI * 0.992;
    // spine flattens as the wallet opens
    const sp = 1 - smooth(o * 1.4);
    spine.scale.set(0.012 + 0.09 * sp, 1, 0.012 + (pivotZ + T / 2) * sp);
    spine.position.set(0, 0, pivotZ * sp);

    // keep the visual center of mass at the origin
    wallet.position.x = -W / 2 + e * (W / 2);

    // cards pop out one after another, bills rise first
    for (const c of cards) {
      const k = easeInOut(clamp01((o - 0.38 - c.order * 0.09) / 0.32));
      c.mesh.position.y = c.baseY + c.lift * k;
      c.mesh.position.z = c.baseZ + 0.07 * k;
    }
    for (const b of billMeshes) {
      const k = easeInOut(clamp01((o - 0.25 - b.userData.order * 0.05) / 0.4));
      b.position.y = b.userData.baseY + 0.24 * k;
    }

    // pose
    const idle = state.reduced ? 0 : 1;
    const px = state.px * idle;
    const py = state.py * idle;
    const tiltX = -0.2 - e * 0.38;
    const tiltY = 0.5 - e * 0.5;
    rig.rotation.x += (tiltX + py * -0.09 + Math.sin(t * 0.9) * 0.015 * idle - rig.rotation.x) * (1 - Math.exp(-dt * 6));
    rig.rotation.y += (tiltY + px * 0.2 + Math.sin(t * 0.7) * 0.03 * idle - rig.rotation.y) * (1 - Math.exp(-dt * 6));
    rig.position.y = Math.sin(t * 1.3) * 0.06 * idle + e * -0.05;

    const sx = 2.4 + e * 3.6;
    shadow.scale.set(sx, 2.0 + e * 1.2, 1);
    shadow.material.opacity = 0.9 - e * 0.25;
    shadow.position.y = -2.05 - e * 0.1 + rig.position.y * 0.3;

    // camera distance: fit the closed wallet snugly, back off for the open spread
    const aspect = camera.aspect;
    const fit = (halfW, halfH) => Math.max(halfH / FOV_TAN, halfW / (FOV_TAN * aspect));
    dist.closed = fit(W * 0.85, H * 0.78);
    dist.open = fit(W * 1.18, H * 0.82);
    const d = dist.closed + (dist.open - dist.closed) * e;
    camera.position.set(0, 0.15, d);
    camera.lookAt(0, -0.05, 0);

    renderer.render(scene, camera);
  }
  frame();

  return {
    canvas,
    setData,
    isOpen: () => Boolean(state.target),
    toggle: () => setOpen(state.target ? 0 : 1, true),
    onChange: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      own.forEach((o) => o.dispose?.());
      renderer.dispose();
      canvas.remove();
    },
  };
}
