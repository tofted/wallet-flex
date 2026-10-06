export const shortAddr = (a, head = 4, tail = 4) =>
  a && a.length > head + tail + 1 ? `${a.slice(0, head)}…${a.slice(-tail)}` : (a ?? '');

export function usd(v) {
  if (v === null || v === undefined) return '—';
  if (Math.abs(v) >= 1) return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  if (v === 0) return '$0.00';
  return `$${v.toPrecision(2)}`;
}

export function compactUsd(v) {
  if (v === null || v === undefined) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export function amount(v) {
  if (v === null || v === undefined) return '—';
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e4) return `${(v / 1e3).toFixed(1)}K`;
  return v.toLocaleString('en-US', { maximumFractionDigits: v < 1 ? 6 : 2 });
}

export function sol(v) {
  if (v === null || v === undefined) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
}

export function timeAgo(ms) {
  if (!ms) return '—';
  const s = Math.max(1, Math.round((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
