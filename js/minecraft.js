import { PORTFOLIO } from './portfolio.js';
import { h } from './ui.js';

// Only https URLs or files shipped in this repo (no protocol, no leading slash tricks).
function okUrl(u) {
  if (typeof u !== 'string' || !u) return null;
  if (/^https:\/\//i.test(u)) return u;
  if (/^[\w][\w./-]*$/.test(u) && !u.includes('..')) return u;
  return null;
}

function hasDetails(p) {
  return Boolean(p.tagline || p.description || p.address || p.stats?.length || p.tags?.length || p.links?.length || p.images?.length || p.sections?.length);
}

function copy(text) {
  const btn = h('button', { type: 'button', class: 'copy' }, 'Copy');
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

function section(sec) {
  const items = (sec.items ?? []).filter((i) => i.title || i.text);
  if (!items.length) return null;
  return h(
    'div',
    { class: 'mc-section' },
    h('h3', {}, String(sec.title ?? '')),
    sec.intro ? h('p', { class: 'mc-text' }, String(sec.intro)) : null,
    h(
      'ul',
      { class: 'mc-items' },
      items.map((i) => h('li', { class: 'mc-item' }, i.title ? h('h4', {}, String(i.title)) : null, i.text ? h('p', {}, String(i.text)) : null)),
    ),
  );
}

function project(p) {
  const paragraphs = String(p.description ?? '')
    .split(/\n\s*\n/)
    .map((t) => t.trim())
    .filter(Boolean);

  const images = (p.images ?? [])
    .map((i) => ({ src: okUrl(i.src), alt: String(i.alt ?? '') }))
    .filter((i) => i.src);
  const links = (p.links ?? []).map((l) => ({ label: String(l.label ?? ''), href: okUrl(l.href) })).filter((l) => l.href && l.label);

  return h(
    'section',
    { class: 'mc-project', id: `mc-${p.id}`, 'aria-labelledby': `mc-${p.id}-title` },
    h('div', { class: 'mc-project-head' }, h('h2', { id: `mc-${p.id}-title` }, p.name), p.tagline ? h('p', { class: 'mc-tagline' }, p.tagline) : null),
    hasDetails(p)
      ? h(
          'div',
          { class: 'mc-body' },
          paragraphs.map((t) => h('p', { class: 'mc-text' }, t)),
          p.address ? h('div', { class: 'mc-join' }, h('span', {}, 'Server address'), h('div', { class: 'addr mc-addr' }, h('code', {}, p.address), copy(p.address))) : null,
          p.stats?.length
            ? h(
                'dl',
                { class: 'stats' },
                p.stats.map((s) => h('div', { class: 'stat' }, h('dt', {}, String(s.label ?? '')), h('dd', {}, String(s.value ?? '')))),
              )
            : null,
          p.tags?.length ? h('ul', { class: 'tags' }, p.tags.map((t) => h('li', {}, String(t)))) : null,
          links.length
            ? h(
                'p',
                { class: 'mc-links' },
                links.map((l) => h('a', { class: 'btn small', href: l.href, target: '_blank', rel: 'noopener noreferrer' }, `${l.label} ↗`)),
              )
            : null,
          (p.sections ?? []).map(section),
          images.length
            ? h(
                'div',
                { class: 'mc-gallery' },
                images.map((i) => h('img', { src: i.src, alt: i.alt, loading: 'lazy', referrerpolicy: 'no-referrer' })),
              )
            : null,
        )
      : h('p', { class: 'note mc-soon' }, 'Details coming soon.'),
  );
}

export function renderMinecraft(root, introEl, navEl) {
  introEl.textContent = PORTFOLIO.intro || 'My Minecraft projects.';
  navEl.replaceChildren(...PORTFOLIO.projects.map((p) => h('a', { class: 'btn small', href: `#/minecraft/${p.id}` }, p.name)));
  root.replaceChildren(...PORTFOLIO.projects.map(project));
}
