// Studio: build a design from a picker of shapes. Ported from the extension's media/studio.js.
// Designs live in the same 240 x 380 box as the generated art, so saved ones come up when you reform.
// Web additions: handles keep a 32 px hit area at any zoom, pinch scales and two fingers rotate.

import { COLORS, COLOR_NAMES } from '../vendor/artify-engine.js';
import { openSheet, closeSheet } from '../ui/sheet.js';
import { svgToPng, svgBlob, download, slug } from '../ui/export.js';

const $ = (id) => document.getElementById(id);
const NS = 'http://www.w3.org/2000/svg';
const PALETTE = COLORS.dark;
const NAMES = COLOR_NAMES.dark;
const HIT_PX = 16; // handle hit radius in screen pixels (32 px across)
const DOT_PX = 7;

export function createStudio(ctx) {
  const { host, track, toast } = ctx;
  const shapes = host.shapes;
  const nameInput = $('t-name');
  const sheet = $('sheet-shapes');

  const state = {
    items: [],
    selected: null,
    bg: null,
    nextId: 1,
    nextColor: 0,
    undo: [],
    editingId: null,
    drag: null,
    pointers: new Map()
  };

  const wrap = $('studio-wrap');
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('id', 'studio');
  svg.setAttribute('viewBox', '0 0 240 380');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('role', 'application');
  svg.setAttribute('aria-label', 'Design canvas. Add a shape with the plus button. Arrow keys move the selected shape.');
  wrap.appendChild(svg);
  const empty = document.createElement('p');
  empty.className = 'studio-empty';
  wrap.style.position = 'relative';
  wrap.appendChild(empty);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const selectedItem = () => state.items.find((it) => it.uid === state.selected);
  const shapeOf = (id) => shapes.find((s) => s.id === id);
  // Screen pixels per viewBox unit, so handles stay finger-sized however big the canvas is.
  const unitsPerPx = () => {
    const m = svg.getScreenCTM();
    return m && m.a ? 1 / m.a : 1;
  };

  // ---- Rendering -----------------------------------------------------------------------------

  function render() {
    let html = '';
    html += state.bg === null
      ? '<rect class="frame" x="0" y="0" width="240" height="380"/>'
      : `<rect x="0" y="0" width="240" height="380" fill="${PALETTE[state.bg]}"/>`;
    state.items.forEach((it) => {
      const shape = shapeOf(it.shape);
      if (!shape) return;
      const k = it.size / 100;
      html += `<path class="item" data-uid="${it.uid}" d="${shape.d}"${shape.evenodd ? ' fill-rule="evenodd"' : ''} fill="${PALETTE[it.color]}" transform="translate(${it.x} ${it.y}) rotate(${it.rot}) scale(${it.flip ? -k : k} ${k})"/>`;
    });
    const sel = selectedItem();
    if (sel) {
      const u = unitsPerPx();
      const h = sel.size / 2;
      const hit = HIT_PX * u;
      const dot = DOT_PX * u;
      const stem = 22 * u;
      html += `<g class="overlay" transform="translate(${sel.x} ${sel.y}) rotate(${sel.rot})">
<rect class="sel-box" x="${-h}" y="${-h}" width="${sel.size}" height="${sel.size}"/>
<line class="sel-box" x1="0" y1="${-h}" x2="0" y2="${-h - stem}"/>
<circle class="hit h-scale" cx="${h}" cy="${h}" r="${hit}"/><circle class="handle" cx="${h}" cy="${h}" r="${dot}"/>
<circle class="hit h-rot" cx="0" cy="${-h - stem}" r="${hit}"/><circle class="handle" cx="0" cy="${-h - stem}" r="${dot}"/>
</g>`;
    }
    svg.innerHTML = html;
    empty.textContent = state.items.length ? '' : 'Tap + to add your first shape';
    empty.hidden = state.items.length > 0;
    syncControls();
  }

  function syncControls() {
    const sel = selectedItem();
    Array.from($('tools-studio').children).forEach((b, i) => b.setAttribute('aria-pressed', String(sel ? sel.color === i : state.nextColor === i)));
    Array.from($('t-bg').children).forEach((b, i) => b.setAttribute('aria-pressed', String(state.bg === (i === 0 ? null : i - 1))));
    ['t-forward', 't-back', 't-flip', 't-dup', 't-del'].forEach((id) => { $(id).disabled = !sel; });
    $('t-undo').disabled = state.undo.length === 0;
    ctx.setStatus(state.editingId ? 'Editing “' + (nameInput.value.trim() || 'My design') + '”' : 'New design');
  }

  function swatch(fill, label, onPick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.setAttribute('aria-label', label);
    b.dataset.tip = label;
    b.innerHTML = '<span class="dot"></span>';
    if (fill) b.firstChild.style.background = fill;
    b.addEventListener('click', onPick);
    return b;
  }

  function buildSwatches() {
    const colors = $('tools-studio');
    PALETTE.forEach((c, i) => colors.appendChild(swatch(c, NAMES[i], () => {
      const sel = selectedItem();
      if (sel && sel.color !== i) { snapshot(); sel.color = i; }
      state.nextColor = i;
      render();
    })));
    const bg = $('t-bg');
    const none = swatch(null, 'No background', () => { snapshot(); state.bg = null; render(); });
    none.classList.add('none');
    bg.appendChild(none);
    PALETTE.forEach((c, i) => bg.appendChild(swatch(c, NAMES[i] + ' background', () => { snapshot(); state.bg = i; render(); })));
  }

  function buildPicker() {
    const box = $('picker');
    shapes.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'shape-btn';
      b.setAttribute('aria-label', 'Add ' + s.name.toLowerCase());
      b.dataset.tip = s.name;
      b.innerHTML = `<svg viewBox="-60 -60 120 120" aria-hidden="true"><path d="${s.d}"${s.evenodd ? ' fill-rule="evenodd"' : ''} fill="currentColor"/></svg>`;
      b.addEventListener('click', () => {
        addItem(s.id);
        closeSheet(sheet);
      });
      box.appendChild(b);
    });
  }

  // ---- Editing -------------------------------------------------------------------------------

  function snapshot() {
    state.undo.push(JSON.stringify({ items: state.items, bg: state.bg, selected: state.selected }));
    if (state.undo.length > 50) state.undo.shift();
  }

  function undo() {
    const last = state.undo.pop();
    if (!last) return;
    const prev = JSON.parse(last);
    state.items = prev.items;
    state.bg = prev.bg;
    state.selected = state.items.some((it) => it.uid === prev.selected) ? prev.selected : null;
    render();
  }

  function addItem(shape) {
    snapshot();
    const item = {
      uid: state.nextId++, shape, x: Math.round(120 + (Math.random() - 0.5) * 60), y: Math.round(190 + (Math.random() - 0.5) * 100),
      size: 80, rot: 0, color: state.nextColor, flip: false
    };
    state.items.push(item);
    state.selected = item.uid;
    render();
    track('studio_add', { shape });
  }

  function select(uid) {
    state.selected = uid;
    render();
  }

  function reorder(delta) {
    const i = state.items.findIndex((it) => it.uid === state.selected);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= state.items.length) return;
    snapshot();
    [state.items[i], state.items[j]] = [state.items[j], state.items[i]];
    render();
  }

  function remove() {
    if (!selectedItem()) return;
    snapshot();
    state.items = state.items.filter((it) => it.uid !== state.selected);
    state.selected = null;
    render();
  }

  function duplicate() {
    const sel = selectedItem();
    if (!sel) return;
    snapshot();
    const copy = Object.assign({}, sel, { uid: state.nextId++, x: sel.x + 12, y: sel.y + 12 });
    state.items.push(copy);
    state.selected = copy.uid;
    render();
  }

  function flip() {
    const s = selectedItem();
    if (!s) return;
    snapshot();
    s.flip = !s.flip;
    render();
  }

  // Starts over. Undo brings the old design back, so no confirm is needed.
  function newDesign() {
    if (!state.items.length && state.bg === null && !state.editingId) return;
    snapshot();
    const before = { editingId: state.editingId, name: nameInput.value };
    state.items = [];
    state.bg = null;
    state.selected = null;
    state.editingId = null;
    nameInput.value = 'My design';
    render();
    closeSheet($('sheet-more'));
    toast('New design.', {
      action: 'Undo',
      onAction: () => {
        undo();
        state.editingId = before.editingId;
        nameInput.value = before.name;
        syncControls();
      }
    });
  }

  $('t-add').addEventListener('click', () => openSheet(sheet));
  $('t-forward').addEventListener('click', () => reorder(1));
  $('t-back').addEventListener('click', () => reorder(-1));
  $('t-flip').addEventListener('click', flip);
  $('t-dup').addEventListener('click', duplicate);
  $('t-del').addEventListener('click', remove);
  $('t-undo').addEventListener('click', undo);
  $('t-new').addEventListener('click', newDesign);
  nameInput.addEventListener('input', syncControls);

  // ---- Pointer: move, handles, pinch and rotate ----------------------------------------------

  function toSvg(e) {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function startPinch(it) {
    const [a, b] = [...state.pointers.values()];
    state.drag = {
      kind: 'pinch',
      dist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
      angle: Math.atan2(b.y - a.y, b.x - a.x),
      size: it.size,
      rot: it.rot
    };
  }

  svg.addEventListener('pointerdown', (e) => {
    state.pointers.set(e.pointerId, toSvg(e));
    svg.setPointerCapture(e.pointerId);
    const sel = selectedItem();
    if (state.pointers.size === 2 && sel) {
      startPinch(sel);
      e.preventDefault();
      return;
    }
    if (state.pointers.size > 1) return;
    const t = e.target;
    const p = toSvg(e);
    if (t.classList.contains('h-scale') && sel) state.drag = { kind: 'scale' };
    else if (t.classList.contains('h-rot') && sel) state.drag = { kind: 'rot' };
    else if (t.dataset && t.dataset.uid) {
      const it = state.items.find((x) => x.uid === Number(t.dataset.uid));
      state.selected = it.uid;
      state.drag = { kind: 'move', dx: p.x - it.x, dy: p.y - it.y };
      render();
    } else {
      state.drag = null;
      select(null);
      return;
    }
    snapshot();
    svg.focus({ preventScroll: true });
    e.preventDefault();
  });

  svg.addEventListener('pointermove', (e) => {
    if (!state.pointers.has(e.pointerId)) return;
    const p = toSvg(e);
    state.pointers.set(e.pointerId, p);
    const it = selectedItem();
    if (!state.drag || !it) return;
    if (state.drag.kind === 'pinch') {
      if (state.pointers.size < 2) return;
      const [a, b] = [...state.pointers.values()];
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      it.size = Math.round(clamp(state.drag.size * (dist / state.drag.dist), 12, 480));
      it.rot = Math.round(state.drag.rot + ((angle - state.drag.angle) * 180) / Math.PI);
    } else if (state.drag.kind === 'move') {
      it.x = Math.round(clamp(p.x - state.drag.dx, -40, 280));
      it.y = Math.round(clamp(p.y - state.drag.dy, -40, 420));
    } else if (state.drag.kind === 'scale') {
      it.size = Math.round(clamp(Math.hypot(p.x - it.x, p.y - it.y) * Math.SQRT2, 12, 480));
    } else {
      let deg = (Math.atan2(p.y - it.y, p.x - it.x) * 180) / Math.PI + 90;
      if (e.shiftKey) deg = Math.round(deg / 15) * 15;
      it.rot = Math.round(deg);
    }
    render();
  });

  const release = (e) => {
    state.pointers.delete(e.pointerId);
    // Lifting one finger of a pinch ends it; the other finger does not start a move.
    state.drag = null;
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);

  // ---- Saving --------------------------------------------------------------------------------

  function currentCreation() {
    return {
      id: state.editingId || 'c' + Date.now(),
      name: nameInput.value.trim() || 'My design',
      bg: state.bg,
      items: state.items.map(({ shape, x, y, size, rot, color, flip: f }) => ({ shape, x, y, size, rot, color, flip: f }))
    };
  }

  async function save() {
    if (!state.items.length) {
      toast('Add at least one shape first.');
      return;
    }
    const creation = await host.saveCreation(currentCreation());
    if (!creation) {
      toast('Add at least one shape first.');
      return;
    }
    const isNew = !state.editingId;
    state.editingId = creation.id;
    ctx.refreshChips();
    syncControls();
    toast('Saved. It can come up when you reform.', { action: 'View', onAction: () => ctx.go('saved') });
    track('creation_saved', { items: creation.items.length, isNew });
  }

  function exportable() {
    const creation = host.sanitizeCreation(currentCreation());
    if (!creation) toast('Add at least one shape first.');
    return creation;
  }

  $('t-save').addEventListener('click', save);
  $('t-svg').addEventListener('click', () => {
    const c = exportable();
    if (!c) return;
    download(svgBlob(host.renderCreation(c).svg), `artify-${slug(c.name)}.svg`);
    track('download', { mode: 'studio', format: 'svg' });
  });
  $('t-png').addEventListener('click', async () => {
    const c = exportable();
    if (!c) return;
    download(await svgToPng(host.renderCreation(c).svg), `artify-${slug(c.name)}.png`);
    track('download', { mode: 'studio', format: 'png' });
  });

  /** Loads a saved creation for editing. */
  function edit(c) {
    snapshot();
    state.items = c.items.map((it) => Object.assign({ uid: state.nextId++ }, it));
    state.bg = c.bg === undefined ? null : c.bg;
    state.selected = null;
    state.editingId = c.id;
    nameInput.value = c.name;
    render();
  }

  buildPicker();
  buildSwatches();
  // Handles are sized in screen pixels, so redraw when the canvas changes size.
  new ResizeObserver(() => {
    if (ctx.mode === 'studio' && selectedItem()) render();
  }).observe(wrap);

  return {
    enter(opts) {
      if (opts.creation) {
        const found = host.creations().find((c) => c.id === opts.creation);
        if (found) edit(found);
      }
      render();
    },
    leave() {
      state.drag = null;
      state.pointers.clear();
    },
    key(e) {
      const tag = e.target && e.target.tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        undo();
        return true;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const onButton = tag === 'BUTTON' || tag === 'A';
      const it = selectedItem();
      const step = e.shiftKey ? 10 : 2;
      const nudge = (fn) => { snapshot(); fn(it); render(); };
      if (e.key === ',' || e.key === '.') {
        if (!state.items.length) return false;
        const i = state.items.findIndex((x) => x.uid === state.selected);
        select(state.items[(i + (e.key === '.' ? 1 : state.items.length - 1) + state.items.length) % state.items.length].uid);
      } else if (!it) return false;
      else if (e.key === 'ArrowLeft' && !onButton) nudge((s) => { s.x -= step; });
      else if (e.key === 'ArrowRight' && !onButton) nudge((s) => { s.x += step; });
      else if (e.key === 'ArrowUp' && !onButton) nudge((s) => { s.y -= step; });
      else if (e.key === 'ArrowDown' && !onButton) nudge((s) => { s.y += step; });
      else if (e.key === '+' || e.key === '=') nudge((s) => { s.size = clamp(Math.round(s.size * 1.1), 12, 480); });
      else if (e.key === '-') nudge((s) => { s.size = clamp(Math.round(s.size / 1.1), 12, 480); });
      else if (e.key === '[') nudge((s) => { s.rot -= 15; });
      else if (e.key === ']') nudge((s) => { s.rot += 15; });
      else if (e.key.toLowerCase() === 'd') duplicate();
      else if (e.key === 'Delete' || e.key === 'Backspace') remove();
      else if (e.key === 'Escape') select(null);
      else return false;
      return true;
    }
  };
}
