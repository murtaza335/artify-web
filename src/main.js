// App shell: storage, routing between modes, category chips, keys and zen mode.

import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import { ANIMATION_CSS, CATEGORY_LABELS } from './vendor/artify-engine.js';
import { openMemento, prefs } from './memento.js';
import { createHost } from './host.js';
import { track } from './analytics.js';
import { toast, flushToast } from './ui/toast.js';
import { setupSheets, openSheet, closeSheet } from './ui/sheet.js';
import { setupTooltips } from './ui/tooltip.js';
import { setupInstall } from './pwa.js';
import { createReform } from './modes/reform.js';
import { createPuzzle } from './modes/puzzle.js';
import { createSplash } from './modes/splash.js';
import { createStudio } from './modes/studio.js';
import { createSaved } from './modes/saved.js';

const $ = (id) => document.getElementById(id);
const app = $('app');
const MODES = ['reform', 'puzzle', 'splash', 'studio', 'saved'];
const MORE_TITLES = { reform: 'Reform', puzzle: 'Puzzle', splash: 'Splash', studio: 'Studio', saved: 'Artify' };

// The engine's fly-in animation, shared by every mode that shows generated art.
const style = document.createElement('style');
style.textContent = ANIMATION_CSS;
document.head.appendChild(style);

const memento = await openMemento();
const host = createHost(memento);

const ctx = {
  host,
  prefs,
  toast,
  track,
  mode: null,
  category: 'all',
  zen: false,
  setStatus(text) {
    $('status').textContent = text || '';
  },
  /** Switches mode through the URL, so Back works and links can be shared. */
  go(mode, opts) {
    pendingOpts = opts || null;
    const hash = '#/' + mode;
    if (location.hash === hash) route();
    else location.hash = hash;
  },
  setZen(on) {
    ctx.zen = on;
    app.classList.toggle('zen', on);
    if (on) toast('Zen mode. Tap the corner or press F to leave.', { ms: 1800 });
    track('zen', { on });
  },
  /** Called when Studio designs change, so the "My designs" chip appears or goes. */
  refreshChips: () => renderChips()
};

const modes = {
  reform: createReform(ctx),
  puzzle: createPuzzle(ctx),
  splash: createSplash(ctx),
  studio: createStudio(ctx),
  saved: createSaved(ctx)
};

// ---- Category chips ------------------------------------------------------------------------

function renderChips() {
  const hasMine = host.creations().length > 0;
  if (ctx.category === 'mine' && !hasMine) ctx.category = 'all';
  const box = $('chips');
  box.innerHTML = '';
  Object.entries(CATEGORY_LABELS).forEach(([id, label]) => {
    if (id === 'mine' && !hasMine) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.category = id;
    b.textContent = label;
    b.setAttribute('aria-pressed', String(id === ctx.category));
    b.addEventListener('click', () => pickCategory(id));
    box.appendChild(b);
  });
}

function pickCategory(id) {
  ctx.category = id;
  prefs.set('category', id);
  $('chips').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.category === id)));
  const active = $('chips').querySelector('[aria-pressed="true"]');
  if (active) active.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  track('category', { category: id, mode: ctx.mode });
  const m = modes[ctx.mode];
  if (m && m.onCategory) m.onCategory();
}

// ---- Modes and routing ---------------------------------------------------------------------

let pendingOpts = null;

function showMode(mode) {
  app.dataset.mode = mode;
  document.querySelectorAll('[data-modes]').forEach((el) => {
    el.hidden = !el.dataset.modes.split(' ').includes(mode);
  });
  document.querySelectorAll('.nav-item').forEach((a) => {
    if (a.dataset.mode === mode) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  $('more-title').textContent = MORE_TITLES[mode];
  document.title = mode === 'reform' ? 'Artify: endless shard art' : 'Artify ' + MORE_TITLES[mode];
}

function setMode(mode, opts) {
  if (ctx.mode !== mode) {
    if (ctx.mode && modes[ctx.mode].leave) modes[ctx.mode].leave();
    document.querySelectorAll('dialog[open]').forEach(closeSheet);
    if (ctx.zen) ctx.setZen(false);
    ctx.setStatus('');
    const from = ctx.mode;
    ctx.mode = mode;
    showMode(mode);
    if (from) track('mode', { mode, from });
  }
  modes[mode].enter(opts || {});
}

function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
  const opts = pendingOpts || {};
  pendingOpts = null;
  if (parts[0] === 'art') {
    const item = host.fromLink(parts[1], parts[2], parts[3]);
    if (item) {
      ctx.category = item.category;
      renderChips();
      track('deep_link_open', { category: item.category, form: item.form });
      setMode('reform', { item, fromLink: true });
      return;
    }
    history.replaceState(null, '', '#/reform');
    setMode('reform', {});
    return;
  }
  setMode(MODES.includes(parts[0]) ? parts[0] : 'reform', opts);
}

// ---- Global controls -----------------------------------------------------------------------

$('btn-more').addEventListener('click', () => openSheet($('sheet-more')));
const openAbout = () => {
  openSheet($('sheet-about'));
  track('about_open', { mode: ctx.mode });
};
$('btn-info').addEventListener('click', openAbout);
$('rail-info').addEventListener('click', openAbout);
$('zen-exit').addEventListener('click', () => ctx.setZen(false));
document.querySelectorAll('.links a, .link-list a, .about a.btn').forEach((a) =>
  a.addEventListener('click', () => track('outbound', { href: a.href }))
);

document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === 'Escape' && ctx.zen) {
    ctx.setZen(false);
    return;
  }
  const m = modes[ctx.mode];
  if (m && m.key && m.key(e)) e.preventDefault();
});

document.addEventListener('visibilitychange', () => {
  Object.values(modes).forEach((m) => m.onVisibility && m.onVisibility(document.hidden));
  if (document.hidden) flushToast();
});
window.addEventListener('pagehide', flushToast);
window.addEventListener('hashchange', route);

setupSheets();
setupTooltips();
setupInstall(ctx);

ctx.category = prefs.get('category', 'all');
if (!Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, ctx.category)) ctx.category = 'all';
renderChips();
route();
track('app_open', { mode: ctx.mode, standalone: window.matchMedia('(display-mode: standalone)').matches });
