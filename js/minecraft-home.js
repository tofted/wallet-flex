import { PORTFOLIO } from './portfolio.js';
import { h } from './ui.js';

const HOME = PORTFOLIO.home;
const byId = (id) => PORTFOLIO.projects.find((p) => p.id === id);

function copyChip(address) {
  const btn = h('button', { type: 'button', class: 'mch-copybtn', 'aria-label': `Copy ${address}` }, 'Copy');
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(address);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Select + copy';
    }
    setTimeout(() => (btn.textContent = 'Copy'), 1600);
  });
  return h('div', { class: 'mch-addr' }, h('code', {}, address), btn);
}

function serverCard(id, theme) {
  const p = byId(id);
  const c = HOME.cards[id];
  if (!p) return null;
  return h(
    'article',
    { class: `mch-server ${theme}` },
    h('p', { class: 'mch-kicker' }, c.kicker),
    h('h2', {}, p.name),
    p.tagline ? h('p', { class: 'mch-tagline' }, p.tagline) : null,
    h('ul', { class: 'mch-facts' }, c.facts.map((f) => h('li', {}, f))),
    p.address ? copyChip(p.address) : null,
    h('a', { class: 'mch-more', href: `#/minecraft/technology/${id}` }, 'How it works →'),
  );
}

function ecosystem() {
  const e = HOME.ecosystem;
  const node = (n, theme) =>
    h('div', { class: `eco-node ${theme}` }, h('strong', {}, n.name), h('span', { class: 'eco-engine' }, n.engine), h('small', {}, n.note));
  return h(
    'section',
    { class: 'mch-eco', 'aria-labelledby': 'eco-title' },
    h('div', { class: 'mch-eco-copy' }, h('p', { class: 'mch-kicker' }, 'The network'), h('h2', { id: 'eco-title' }, e.title), h('p', {}, e.text)),
    h(
      'div',
      { class: 'eco-diagram' },
      node(e.hub, 'hub'),
      h(
        'div',
        { class: 'eco-lanes' },
        e.lanes.map((l, i) =>
          h('div', { class: `eco-lane ${i === 0 ? 'fwd' : 'rev'}` }, h('span', { class: 'eco-dir' }, l.dir), h('strong', {}, l.title), h('small', {}, l.text), h('i', { class: 'eco-arrow', 'aria-hidden': 'true' })),
        ),
        h('span', { class: 'eco-badge' }, 'No proxy'),
      ),
      node(e.smp, 'smp'),
    ),
  );
}

export function renderHome(hero, body) {
  // hero copy
  const heroCopy = hero.querySelector('.mch-copy');
  const h1 = heroCopy.querySelector('h1');
  h1.replaceChildren(...HOME.headline.flatMap((line, i) => [h('span', { class: i === 0 ? 'l1' : 'l2' }, line), i === 0 ? h('br') : null]).filter(Boolean));
  heroCopy.querySelector('.mch-sub').textContent = HOME.sub;
  const ctas = hero.querySelector('.mch-ctas');
  ctas.replaceChildren(
    ...PORTFOLIO.projects.map((p) =>
      h('div', { class: `mch-join ${p.id === 'csmp' ? 'csmp' : 'cmg'}` }, h('span', {}, p.name), p.address ? copyChip(p.address) : null),
    ),
  );

  body.replaceChildren(
    h('section', { class: 'mch-servers', 'aria-label': 'The servers' }, serverCard('csmp', 'csmp'), serverCard('cminigames', 'cmg')),
    ecosystem(),
    h(
      'section',
      { class: 'mch-numbers', 'aria-label': 'By the numbers' },
      HOME.numbers.map((n) => h('div', { class: 'mch-num' }, h('strong', {}, n.value), h('span', {}, n.label))),
    ),
    h(
      'section',
      { class: 'mch-teaser' },
      h('div', {}, h('p', { class: 'mch-kicker' }, 'Technology'), h('h2', {}, HOME.teaser.title), h('p', {}, HOME.teaser.text), h('ul', { class: 'tags' }, HOME.teaser.chips.map((c) => h('li', {}, c)))),
      h('a', { class: 'mch-cta', href: '#/minecraft/technology' }, 'Explore the technology', h('span', { 'aria-hidden': 'true' }, '→')),
    ),
  );
}
