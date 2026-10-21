// Reform: endless shard art. Tap (or Space, →, R) for the next one, swipe right or ← to go back.
// Taps react on pointer-up with no double-tap detection, so every tap feels instant.

import { designOf } from '../host.js';
import { svgToPng, svgBlob, download, share, slug } from '../ui/export.js';

const $ = (id) => document.getElementById(id);
const HISTORY = 50;
const DEBOUNCE = 120;
const SWIPE = 50;
const LONG_PRESS = 550;
const AUTO_MS = 5000;

export const capitalise = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
export const caption = (name, item) => capitalise(name) + (item.seed ? ' · ' + item.seed : '');

/** Adds a <title> so the art is named for assistive tech and on hover. */
export const withTitle = (svg, name) => svg.replace(/^(<svg[^>]*>)/, `$1<title>${capitalise(name).replace(/[<>&]/g, '')}</title>`);

/** The shareable link for a generated design. Studio designs live only in this browser, so they have none. */
export function linkFor(item) {
  if (!item || item.creation || !item.form) return null;
  return `${location.origin}${location.pathname}#/art/${encodeURIComponent(item.category)}/${encodeURIComponent(item.form)}/${item.seed}`;
}

export function createReform(ctx) {
  const { host, track, toast } = ctx;
  const art = $('art');
  const saveBtn = $('r-save');
  const autoBtn = $('r-auto');
  const hint = $('hint');

  const history = [];
  let index = -1;
  let shown = null; // { item, svg, name }
  let lastAt = 0;
  let auto = 0;
  let autoOn = false;
  let made = 0;

  const current = () => history[index];

  function show(item) {
    const { svg, name } = host.render(item);
    shown = { item, svg, name };
    art.innerHTML = withTitle(svg, name);
    ctx.setStatus(caption(name, item));
    saveBtn.setAttribute('aria-pressed', String(host.isSaved(item)));
    saveBtn.setAttribute('aria-label', host.isSaved(item) ? 'Remove from saved' : 'Save design');
    const link = linkFor(item);
    if (ctx.mode === 'reform') replaceHash(link ? link.slice(link.indexOf('#')) : '#/reform');
  }

  function replaceHash(hash) {
    if (location.hash !== hash) window.history.replaceState(null, '', hash);
  }

  function push(item) {
    history.splice(index + 1);
    history.push(designOf(item));
    if (history.length > HISTORY) history.shift();
    index = history.length - 1;
    show(current());
  }

  function next(source = 'tap') {
    const now = performance.now();
    if (now - lastAt < DEBOUNCE) return;
    lastAt = now;
    dismissHint();
    if (index < history.length - 1) {
      // Going forward again after going back replays history instead of dealing.
      index++;
      show(current());
    } else {
      push(host.next(ctx.category));
      made++;
    }
    track('reform', { source, category: ctx.category, made });
    if (autoOn && source !== 'auto') restartAuto();
  }

  function prev() {
    if (index <= 0) {
      art.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(12px)' }, { transform: 'translateX(0)' }], { duration: 220 });
      return;
    }
    index--;
    show(current());
    track('reform_back');
  }

  // ---- Hint for first-time visitors ----------------------------------------------------------

  function dismissHint() {
    if (hint.hidden) return;
    hint.hidden = true;
    ctx.prefs.set('hintSeen', true);
  }

  // ---- Pointer: tap, swipe, long-press for zen -----------------------------------------------

  let start = null;
  let longTimer = 0;
  let longFired = false;

  art.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    start = { x: e.clientX, y: e.clientY };
    longFired = false;
    clearTimeout(longTimer);
    longTimer = setTimeout(() => {
      longFired = true;
      ctx.setZen(!ctx.zen);
    }, LONG_PRESS);
  });
  art.addEventListener('pointermove', (e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearTimeout(longTimer);
  });
  art.addEventListener('pointerup', (e) => {
    clearTimeout(longTimer);
    if (!start || longFired) {
      start = null;
      return;
    }
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next('swipe');
      else prev();
    } else if (Math.hypot(dx, dy) < 24) {
      next(e.pointerType === 'mouse' ? 'click' : 'tap');
    }
  });
  art.addEventListener('pointercancel', () => {
    clearTimeout(longTimer);
    start = null;
  });
  // Pointer input is handled above; a click with no pointer behind it is the keyboard.
  art.addEventListener('click', (e) => {
    if (e.detail === 0) next('key');
  });
  art.addEventListener('contextmenu', (e) => e.preventDefault());

  // ---- Actions -------------------------------------------------------------------------------

  async function toggleSave() {
    const item = current();
    if (!item) return;
    if (host.isSaved(item)) {
      await host.unsave(item);
      toast('Removed from Saved.');
      track('unsave', { mode: 'reform' });
    } else {
      await host.save(item);
      saveBtn.classList.remove('bump');
      void saveBtn.offsetWidth;
      saveBtn.classList.add('bump');
      toast('Saved.', { action: 'View', onAction: () => ctx.go('saved') });
      track('save_design', { mode: 'reform', category: item.category, mine: Boolean(item.creation) });
    }
    show(item);
  }

  const fileName = (ext) => `artify-${slug(shown.name)}${shown.item.seed ? '-' + shown.item.seed : ''}.${ext}`;

  async function downloadPng() {
    if (!shown) return;
    download(await svgToPng(shown.svg), fileName('png'));
    track('download', { mode: 'reform', format: 'png' });
  }

  function downloadSvg() {
    if (!shown) return;
    download(svgBlob(shown.svg), fileName('svg'));
    track('download', { mode: 'reform', format: 'svg' });
  }

  async function doShare() {
    if (!shown) return;
    const url = linkFor(shown.item);
    const blob = await svgToPng(shown.svg).catch(() => null);
    const result = await share({ blob, filename: fileName('png'), url, title: capitalise(shown.name) + ' by Artify' });
    if (result === 'copied') toast('Link copied. It opens this exact artwork.');
    else if (result === 'downloaded') toast('Image downloaded.');
    if (result !== 'cancelled') track('share', { mode: 'reform', result, link: Boolean(url) });
  }

  // ---- Auto-reform ---------------------------------------------------------------------------

  function restartAuto() {
    clearInterval(auto);
    auto = autoOn && !document.hidden ? setInterval(() => next('auto'), AUTO_MS) : 0;
  }

  function setAuto(on) {
    autoOn = on;
    autoBtn.setAttribute('aria-pressed', String(on));
    restartAuto();
    if (on) toast('Auto-reform on: a new one every 5 seconds.');
    track('auto', { on });
  }

  saveBtn.addEventListener('click', toggleSave);
  $('r-share').addEventListener('click', doShare);
  $('r-download').addEventListener('click', downloadPng);
  autoBtn.addEventListener('click', () => setAuto(!autoOn));
  $('r-svg').addEventListener('click', downloadSvg);
  $('r-zen').addEventListener('click', () => {
    const more = $('sheet-more');
    if (more.open) more.close();
    ctx.setZen(true);
  });
  $('r-round').addEventListener('click', async () => {
    await host.newRound();
    toast('New round: everything counts as unseen again.');
    track('new_round');
  });

  return {
    enter(opts) {
      if (opts.item) {
        const same = current() && JSON.stringify(current()) === JSON.stringify(designOf(opts.item));
        if (!same) push(opts.item);
        else show(current());
      } else if (!current()) {
        push(host.next(ctx.category));
      } else {
        show(current());
      }
      if (!ctx.prefs.get('hintSeen', false) && !opts.fromLink) hint.hidden = false;
      if (autoOn) restartAuto();
    },
    leave() {
      clearInterval(auto);
      auto = 0;
      hint.hidden = true;
    },
    onCategory() {
      lastAt = 0;
      next('category');
    },
    onVisibility() {
      if (ctx.mode === 'reform') restartAuto();
    },
    key(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const onControl = e.target.closest && e.target.closest('button, a');
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === ' ' || k === 'Enter') {
        if (onControl) return false;
        next('key');
      } else if (k === 'ArrowRight' || k === 'r') next('key');
      else if (k === 'ArrowLeft') prev();
      else if (k === 's') toggleSave();
      else if (k === 'c') doShare();
      else if (k === 'd') downloadPng();
      else if (k === 'a') setAuto(!autoOn);
      else if (k === 'f') ctx.setZen(!ctx.zen);
      else return false;
      return true;
    }
  };
}
