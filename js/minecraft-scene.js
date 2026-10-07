import * as THREE from 'three';

// Two floating voxel islands over the void: a quartz plaza (the hub) and a grass
// chunk (the SMP). Pulses of light travel between them in both directions.
// Everything is generated here. No game textures or assets are used.

const ICE = 0x7fd6ff;

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 16x16 greyscale tile with a darker rim: tinted per block, it gives every cube a pixel-art outline.
function tileTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 16;
  const ctx = c.getContext('2d');
  const r = rng(7);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let v = 228 + Math.floor((r() - 0.5) * 36);
      if (x === 0 || y === 0 || x === 15 || y === 15) v -= 40;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  return t;
}

function voxels(list, material, seed) {
  const r = rng(seed);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, list.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  list.forEach((b, i) => {
    const s = b.s ?? 1;
    m.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(s, s, s));
    mesh.setMatrixAt(i, m);
    col.set(b.c).multiplyScalar(0.9 + r() * 0.2);
    mesh.setColorAt(i, col);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.instanceColor.needsUpdate = true;
  return mesh;
}

function hubBlocks() {
  const r = rng(11);
  const out = [];
  const R = 7.4;
  const quartz = ['#f1eee7', '#ebe7df', '#f6f3ec'];
  for (let x = -8; x <= 8; x++) {
    for (let z = -8; z <= 8; z++) {
      const d = Math.hypot(x, z);
      if (d > R) continue;
      let c = quartz[Math.floor(r() * quartz.length)];
      if ([3, 4].includes(Math.abs(x)) && [3, 4].includes(Math.abs(z))) c = '#74c8ff'; // the four pools
      else if (d <= 1.6) c = '#d9d4c8';
      if (x === 0 && z === 0) c = '#f0c64a';
      out.push({ x, y: 0, z, c });
    }
  }
  const stone = ['#7b7f89', '#6b6f78', '#5b5f68', '#4c4f58'];
  for (let y = -1; y >= -8; y--) {
    const rad = R * (1 - -y / 10);
    for (let x = -8; x <= 8; x++) {
      for (let z = -8; z <= 8; z++) {
        const d = Math.hypot(x, z);
        if (d > rad) continue;
        if (d > rad - 1 && r() < -y * 0.07) continue; // ragged underside
        out.push({ x, y, z, c: stone[Math.min(3, Math.floor(-y / 2))] });
      }
    }
  }
  // colonnade
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const px = Math.round(Math.cos(a) * 5.9);
    const pz = Math.round(Math.sin(a) * 5.9);
    for (let y = 1; y <= 4; y++) out.push({ x: px, y, z: pz, c: '#f3f0e8' });
    out.push({ x: px, y: 5, z: pz, c: '#e2ddd2' });
  }
  // a little mannequin per game
  const body = ['#e0554f', '#f0a43c', '#f2d04a', '#7ed957', '#3fc6a5', '#4fa8f0', '#6a6cf0', '#a45cf0', '#ef6fb4', '#cfd6df'];
  for (let i = 0; i < 10; i++) {
    const a = ((i + 0.5) / 10) * Math.PI * 2;
    const x = Math.cos(a) * 4.7;
    const z = Math.sin(a) * 4.7;
    out.push({ x, y: 0.75, z, c: body[i], s: 0.5 });
    out.push({ x, y: 1.2, z, c: '#f1c9a5', s: 0.4 });
  }
  return out;
}

function smpBlocks() {
  const r = rng(23);
  const out = [];
  const top = new Map(); // "x,z" -> true for surface cells
  const R = 6.6;
  const grass = ['#5fa63d', '#58a036', '#69ad45'];
  for (let x = -9; x <= 9; x++) {
    for (let z = -9; z <= 9; z++) {
      const a = Math.atan2(z, x);
      const edge = R + 1.3 * Math.sin(a * 3 + 1) + 0.8 * Math.sin(a * 5 + 2);
      if (Math.hypot(x, z) > edge) continue;
      top.set(`${x},${z}`, true);
      out.push({ x, y: 0, z, c: grass[Math.floor(r() * grass.length)] });
      out.push({ x, y: -1, z, c: '#8b5a36' });
      out.push({ x, y: -2, z, c: '#7d4f2f' });
    }
  }
  for (let y = -3; y >= -8; y--) {
    for (const key of top.keys()) {
      const [x, z] = key.split(',').map(Number);
      const rad = R * (1 - (-y - 2) / 8);
      if (Math.hypot(x, z) > rad) continue;
      if (Math.hypot(x, z) > rad - 1 && r() < 0.35) continue;
      out.push({ x, y, z, c: ['#7a7a80', '#6c6c72', '#5d5d63'][Math.min(2, Math.floor((-y - 3) / 2))] });
    }
  }
  const free = (x, z, rad = 0) => top.has(`${x},${z}`) && Math.hypot(x, z) > rad;
  // trees
  for (const [tx, tz] of [[-3, -3], [3, -4], [4, 2], [-4, 3]]) {
    if (!free(tx, tz)) continue;
    for (let y = 1; y <= 4; y++) out.push({ x: tx, y, z: tz, c: '#6b4a2a' });
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = 3; dy <= 5; dy++) {
          const cut = Math.abs(dx) + Math.abs(dz) + (dy - 3) * 1.4;
          if (cut > 3.6 || (dx === 0 && dz === 0 && dy < 5)) continue;
          out.push({ x: tx + dx, y: dy, z: tz + dz, c: r() < 0.5 ? '#3f8f2e' : '#4a9b35' });
        }
      }
    }
  }
  // cabin
  for (let dx = 0; dx < 3; dx++) {
    for (let dz = 0; dz < 3; dz++) {
      for (let y = 1; y <= 2; y++) {
        if (dx === 1 && dz === 1) continue;
        out.push({ x: dx - 1, y, z: dz + 0, c: '#b9895a' });
      }
    }
  }
  for (let dx = -1; dx <= 3; dx++) for (let dz = -1; dz <= 3; dz++) out.push({ x: dx - 1, y: 3, z: dz, c: '#8a4b3a' });
  out.push({ x: 0, y: 1, z: 2, c: '#f2c14a', s: 0.5 }); // a lantern by the door
  // flowers
  for (let i = 0; i < 9; i++) {
    const x = Math.round((r() - 0.5) * 12);
    const z = Math.round((r() - 0.5) * 12);
    if (!free(x, z, 2.5)) continue;
    out.push({ x, y: 0.8, z, c: r() < 0.5 ? '#e04b4b' : '#f2d04a', s: 0.3 });
  }
  return out;
}

export function createMinecraftScene(host) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xb8d4ff, 0x20242c, 1.1));
  const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
  sun.position.set(-14, 22, 16);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x6fb6ff, 0.9);
  rim.position.set(18, 6, -14);
  scene.add(rim);

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

  const tile = tileTexture();
  const blockMat = new THREE.MeshStandardMaterial({ map: tile, roughness: 0.95, metalness: 0 });

  const world = new THREE.Group();
  scene.add(world);
  const hub = new THREE.Group();
  const smp = new THREE.Group();
  hub.add(voxels(hubBlocks(), blockMat, 3));
  smp.add(voxels(smpBlocks(), blockMat, 5));
  smp.rotation.y = 0.6;
  hub.rotation.y = -0.25;
  world.add(hub, smp);

  // --- the link: a faint dotted path with one orb travelling along it
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]);
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x9fb4c8, transparent: true, opacity: 0.45, toneMapped: false });
  const dots = new THREE.InstancedMesh(cube, dotMat, 34);
  world.add(dots);

  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.28)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  const glowSprite = (opacity) =>
    new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, color: ICE, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
    );

  // One blue orb that travels hub -> SMP, flashes on arrival, rests, then travels back.
  const orb = new THREE.Group();
  const orbCore = new THREE.Mesh(cube, new THREE.MeshBasicMaterial({ color: 0xbfeaff, toneMapped: false }));
  orbCore.scale.setScalar(0.5);
  const orbHot = new THREE.Mesh(cube, new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
  orbHot.scale.setScalar(0.26);
  const orbHalo = glowSprite(0.95);
  orb.add(orbHalo, orbCore, orbHot);
  world.add(orb);

  const TRAIL = 14;
  const trail = Array.from({ length: TRAIL }, () => {
    const sp = glowSprite(0);
    world.add(sp);
    return sp;
  });
  const flashes = [glowSprite(0), glowSprite(0)]; // [at the hub, at the SMP]
  flashes.forEach((f) => world.add(f));

  const TRAVEL = 2.4; // seconds one way
  const REST = 0.5; // seconds spent glowing at each island
  const CYCLE = 2 * (TRAVEL + REST);
  const easeSine = (x) => -(Math.cos(Math.PI * x) - 1) / 2;

  // --- layout: side by side on wide screens, diagonal stack on tall ones
  const hubPos = new THREE.Vector3();
  const smpPos = new THREE.Vector3();
  let fitHalfW = 20;
  let fitHalfH = 12;
  function layout() {
    const aspect = camera.aspect;
    if (aspect >= 1.1) {
      const sx = Math.min(16, Math.max(9.5, aspect * 3.2)); // use the width the slot gives us
      hubPos.set(-sx, 1.2, 0);
      smpPos.set(sx, -1.2, 0);
      fitHalfW = sx + 9;
      fitHalfH = 8.8;
    } else {
      hubPos.set(-3.5, 8.5, 0);
      smpPos.set(3.5, -8.5, 0);
      fitHalfW = 3.5 + 9;
      fitHalfH = 17;
    }
    hub.position.copy(hubPos);
    smp.position.copy(smpPos);
    const dir = smpPos.clone().sub(hubPos).normalize();
    const a = hubPos.clone().addScaledVector(dir, 8.2).add(new THREE.Vector3(0, 2.4, 0));
    const b = smpPos.clone().addScaledVector(dir, -8.2).add(new THREE.Vector3(0, 2.4, 0));
    const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(0, aspect >= 1.1 ? 5 : 3, 0));
    curve.points = [a, mid, b];
    curve.updateArcLengths();
    const m = new THREE.Matrix4();
    for (let i = 0; i < dots.count; i++) {
      const p = curve.getPoint((i + 0.5) / dots.count);
      m.compose(p, new THREE.Quaternion(), new THREE.Vector3(0.2, 0.2, 0.2));
      dots.setMatrixAt(i, m);
    }
    dots.instanceMatrix.needsUpdate = true;
  }

  function resize() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    layout();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // --- input + loop
  const state = { px: 0, py: 0, visible: true, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
  host.addEventListener('pointermove', (e) => {
    const r = host.getBoundingClientRect();
    state.px = ((e.clientX - r.left) / r.width) * 2 - 1;
    state.py = ((e.clientY - r.top) / r.height) * 2 - 1;
  });
  host.addEventListener('pointerleave', () => (state.px = state.py = 0));
  const io = new IntersectionObserver(([e]) => (state.visible = e.isIntersecting));
  io.observe(host);

  const timer = new THREE.Timer();
  timer.connect(document);
  let t = 0;
  const tmp = new THREE.Vector3();
  const yawBase = world.rotation.y;
  function frame() {
    requestAnimationFrame(frame);
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    if (!state.visible) return;
    const still = state.reduced;
    t += still ? 0 : dt;

    hub.position.y = hubPos.y + Math.sin(t * 0.8) * 0.35;
    smp.position.y = smpPos.y + Math.sin(t * 0.8 + 2.1) * 0.35;
    hub.rotation.y = -0.25 + t * 0.05;
    smp.rotation.y = 0.6 - t * 0.04;

    // orb: hub -> SMP -> hub, eased, with a rest at each end
    const ph = t % CYCLE;
    let lin; // 0 at the hub, 1 at the SMP
    let dir; // +1 outbound, -1 returning, 0 resting
    if (ph < TRAVEL) [lin, dir] = [ph / TRAVEL, 1];
    else if (ph < TRAVEL + REST) [lin, dir] = [1, 0];
    else if (ph < 2 * TRAVEL + REST) [lin, dir] = [1 - (ph - TRAVEL - REST) / TRAVEL, -1];
    else [lin, dir] = [0, 0];
    const u = still ? 0.5 : easeSine(lin);
    const moving = still ? 0 : Math.sin(Math.PI * (dir === 0 ? 0 : dir > 0 ? lin : 1 - lin)); // 0 at the ends, 1 mid-flight

    curve.getPoint(u, tmp);
    orb.position.copy(tmp);
    orb.position.y += Math.sin(u * Math.PI) * 0.25;
    orbCore.rotation.set(t * 1.7, t * 2.3, 0);
    orbHot.rotation.copy(orbCore.rotation);
    const breathe = still ? 1 : 1 + 0.18 * Math.sin(t * 9);
    orbHalo.scale.setScalar((3.2 + moving * 0.8) * breathe);

    // trail: afterimages lagging behind along the curve, only while moving
    const sign = dir < 0 ? -1 : 1;
    trail.forEach((sp, i) => {
      const ut = Math.min(1, Math.max(0, u - sign * (i + 1) * 0.02));
      curve.getPoint(ut, sp.position);
      sp.position.y += Math.sin(ut * Math.PI) * 0.25;
      const fade = 1 - (i + 1) / (TRAIL + 1);
      sp.material.opacity = 0.55 * fade * moving;
      sp.scale.setScalar((2.6 - i * 0.12) * (0.6 + 0.4 * moving));
    });

    // arrival flashes: a soft burst on the island the orb just reached
    flashes.forEach((f, i) => {
      const start = i === 0 ? 2 * TRAVEL + REST : TRAVEL; // when the orb lands at the hub / SMP
      const age = still ? 9 : (ph - start + CYCLE) % CYCLE;
      const life = Math.min(1, age / 0.9);
      curve.getPoint(i === 0 ? 0 : 1, f.position);
      f.material.opacity = age < 0.9 ? 0.85 * (1 - life) * (1 - life) : 0;
      f.scale.setScalar(2.4 + life * 6.5);
    });

    const k = 1 - Math.exp(-dt * 4);
    world.rotation.y += (yawBase + state.px * 0.14 - world.rotation.y) * k;
    world.rotation.x += (state.py * 0.05 - world.rotation.x) * k;

    const fitW = fitHalfW / (tanHalf * camera.aspect);
    const fitH = fitHalfH / tanHalf;
    const dist = Math.max(fitW, fitH) * 1.03;
    camera.position.set(0, dist * 0.2, dist);
    camera.lookAt(0, -1, 0);
    renderer.render(scene, camera);
  }
  frame();
  return { canvas };
}
