// Splash: throw paint. Drag to splash, hold still to pour, drips run down. Ported from the extension's
// media/play.js; the canvas fills the stage and is scaled for devicePixelRatio.

import { COLORS, COLOR_NAMES } from '../vendor/artify-engine.js';
import { groundColor, canvasToBlob, download, share } from '../ui/export.js';

const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const PALETTE = COLORS.dark;
const NAMES = COLOR_NAMES.dark;

export function createSplash(ctx) {
  const { host, track, toast, prefs } = ctx;
  const cv = $('paint');
  const wrap = $('paint-wrap');
  const g2 = cv.getContext('2d');
  const size = $('s-size');
  const paint = { down: false, id: null, last: null, pool: 0, timer: 0, drips: [], raf: 0, w: 0, h: 0, dirty: false, strokes: 0 };
  let color = 0;
  size.value = prefs.get('brush', 26);

  // ---- Canvas sizing -------------------------------------------------------------------------

  function resize() {
    const w = Math.floor(wrap.clientWidth);
    const h = Math.floor(wrap.clientHeight);
    if (!w || !h || (w === paint.w && h === paint.h)) return;
    const dpr = window.devicePixelRatio || 1;
    // Keep what was painted: copy it out, resize, and draw it back at the same size, top left.
    let old = null;
    if (paint.w) {
      old = document.createElement('canvas');
      old.width = cv.width;
      old.height = cv.height;
      old.getContext('2d').drawImage(cv, 0, 0);
    }
    cv.width = Math.floor(w * dpr);
    cv.height = Math.floor(h * dpr);
    g2.setTransform(dpr, 0, 0, dpr, 0, 0);
    fillGround();
    if (old) g2.drawImage(old, 0, 0, paint.w, paint.h);
    paint.w = w;
    paint.h = h;
  }
  new ResizeObserver(() => {
    if (ctx.mode === 'splash') resize();
  }).observe(wrap);

  function fillGround() {
    g2.globalCompositeOperation = 'source-over';
    g2.fillStyle = groundColor();
    g2.fillRect(0, 0, cv.width, cv.height);
  }

  // ---- Swatches ------------------------------------------------------------------------------

  const swatches = $('tools-splash');
  PALETTE.forEach((c, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.tip = NAMES[i] + ' (' + (i + 1) + ')';
    b.setAttribute('aria-label', NAMES[i] + ', key ' + (i + 1));
    b.innerHTML = '<span class="dot"></span>';
    b.firstChild.style.background = c;
    b.addEventListener('click', () => pickColor(i));
    swatches.appendChild(b);
  });

  function pickColor(i) {
    if (i < 0 || i >= PALETTE.length) return;
    color = i;
    Array.from(swatches.children).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  }
  pickColor(0);

  // ---- Paint ---------------------------------------------------------------------------------

  function blob(x, y, r, fill) {
    g2.fillStyle = fill;
    g2.beginPath();
    const n = 16;
    for (let k = 0; k <= n; k++) {
      const a = (k / n) * Math.PI * 2;
      const rr = r * rand(0.82, 1.12);
      const px = x + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (k === 0) g2.moveTo(px, py);
      else g2.lineTo(px, py);
    }
    g2.closePath();
    g2.fill();
  }

  function splat(x, y, r, fill) {
    blob(x, y, r, fill);
    const sat = Math.floor(rand(2, 6));
    for (let k = 0; k < sat; k++) {
      const a = rand(0, Math.PI * 2);
      const d = r * rand(1.2, 2.4);
      g2.fillStyle = fill;
      g2.beginPath();
      g2.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * rand(0.08, 0.22), 0, Math.PI * 2);
      g2.fill();
    }
    if (Math.random() < 0.12) paint.drips.push({ x: x + rand(-r * 0.4, r * 0.4), y: y + r * 0.6, len: 0, max: rand(20, 80), w: Math.max(2, r * 0.14), color: fill });
    paint.dirty = true;
  }

  function loop() {
    paint.raf = 0;
    paint.drips = paint.drips.filter((d) => d.len < d.max);
    paint.drips.forEach((d) => {
      d.len += 1.1;
      g2.fillStyle = d.color;
      g2.beginPath();
      g2.arc(d.x, d.y + d.len, d.w, 0, Math.PI * 2);
      g2.fill();
    });
    if (paint.drips.length) paint.raf = requestAnimationFrame(loop);
  }

  const kick = () => {
    if (!paint.raf) paint.raf = requestAnimationFrame(loop);
  };

  function pt(e) {
    const r = cv.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  const brush = () => Number(size.value);

  cv.addEventListener('pointerdown', (e) => {
    if (paint.down) return;
    paint.down = true;
    paint.id = e.pointerId;
    paint.last = pt(e);
    paint.pool = 0;
    cv.setPointerCapture(e.pointerId);
    splat(paint.last.x, paint.last.y, brush() * 0.7, PALETTE[color]);
    kick();
    // Holding still pours a growing puddle.
    clearInterval(paint.timer);
    paint.timer = setInterval(() => {
      if (!paint.down) return;
      paint.pool += 1.4;
      splat(paint.last.x, paint.last.y, brush() * 0.5 + paint.pool, PALETTE[color]);
      kick();
    }, 90);
  });
  cv.addEventListener('pointermove', (e) => {
    if (!paint.down || e.pointerId !== paint.id) return;
    // Coalesced events keep fast strokes smooth on phones that batch input.
    const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of events.length ? events : [e]) {
      const p = pt(ev);
      const dist = Math.hypot(p.x - paint.last.x, p.y - paint.last.y);
      if (dist < 2) continue;
      paint.pool = 0;
      const steps = Math.max(1, Math.floor(dist / (brush() * 0.5)));
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        splat(paint.last.x + (p.x - paint.last.x) * t, paint.last.y + (p.y - paint.last.y) * t, brush() * rand(0.35, 0.7), PALETTE[color]);
      }
      paint.last = p;
    }
    kick();
  });
  const lift = (e) => {
    if (e.pointerId !== paint.id) return;
    if (paint.down) paint.strokes++;
    paint.down = false;
    paint.id = null;
    clearInterval(paint.timer);
  };
  cv.addEventListener('pointerup', lift);
  cv.addEventListener('pointercancel', lift);

  // ---- Actions -------------------------------------------------------------------------------

  function snapshot() {
    const c = document.createElement('canvas');
    c.width = cv.width;
    c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    return c;
  }

  function clearCanvas() {
    if (!paint.dirty) return;
    const before = snapshot();
    const wasDirty = paint.dirty;
    paint.drips = [];
    fillGround();
    paint.dirty = false;
    toast('Canvas cleared.', {
      action: 'Undo',
      onAction: () => {
        g2.save();
        g2.setTransform(1, 0, 0, 1, 0, 0);
        g2.drawImage(before, 0, 0);
        g2.restore();
        paint.dirty = wasDirty;
      }
    });
    track('splash_clear', { strokes: paint.strokes });
  }

  // Saved paintings are stored small, like the extension does; the full canvas exports as PNG.
  async function savePainting() {
    if (!paint.dirty) {
      toast('Throw some paint first.');
      return;
    }
    const small = document.createElement('canvas');
    small.width = 380;
    small.height = Math.round((380 * cv.height) / cv.width);
    small.getContext('2d').drawImage(cv, 0, 0, small.width, small.height);
    let quality = 0.85;
    let dataUrl = small.toDataURL('image/jpeg', quality);
    while (dataUrl.length >= 600000 && quality > 0.4) {
      quality -= 0.15;
      dataUrl = small.toDataURL('image/jpeg', quality);
    }
    if (await host.savePainting(dataUrl)) {
      toast('Painting saved.', { action: 'View', onAction: () => ctx.go('saved') });
      track('painting_saved', { strokes: paint.strokes });
    } else {
      toast('That painting could not be saved.');
    }
  }

  const fileName = () => `artify-painting-${new Date().toISOString().slice(0, 10)}.png`;

  async function downloadPng() {
    download(await canvasToBlob(cv), fileName());
    track('download', { mode: 'splash', format: 'png' });
  }

  async function sharePng() {
    const result = await share({ blob: await canvasToBlob(cv), filename: fileName(), title: 'My Artify painting' });
    if (result === 'downloaded') toast('Image downloaded.');
    if (result !== 'cancelled') track('share', { mode: 'splash', result, link: false });
  }

  /** Opens a saved painting on the canvas, fitted inside it without stretching. */
  function load(dataUrl) {
    const img = new Image();
    img.onload = () => {
      resize();
      paint.drips = [];
      fillGround();
      const k = Math.min(paint.w / img.width, paint.h / img.height);
      const w = img.width * k;
      const h = img.height * k;
      g2.drawImage(img, (paint.w - w) / 2, (paint.h - h) / 2, w, h);
      paint.dirty = true;
    };
    img.src = dataUrl;
  }

  $('s-clear').addEventListener('click', clearCanvas);
  $('s-save').addEventListener('click', savePainting);
  $('s-download').addEventListener('click', downloadPng);
  $('s-share').addEventListener('click', sharePng);
  size.addEventListener('change', () => prefs.set('brush', brush()));

  return {
    enter(opts) {
      resize();
      if (opts.painting) load(opts.painting);
    },
    leave() {
      paint.down = false;
      clearInterval(paint.timer);
    },
    key(e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return false;
      const k = e.key.toLowerCase();
      if (k === 'c') clearCanvas();
      else if (k === 's') savePainting();
      else if (k === 'd') downloadPng();
      else if (/^[1-8]$/.test(k)) pickColor(Number(k) - 1);
      else return false;
      return true;
    }
  };
}
