// Delayed tooltips for icon-only controls, on hover-capable devices and keyboard focus.
// Reads data-tip, so the accessible name stays on aria-label and screen readers don't hear it twice.

const tip = document.getElementById('tip');
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
let timer = 0;
let target = null;

function show(el) {
  target = el;
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  // Prefer the side for rail items, above for everything else; keep it on screen.
  const inRail = el.closest('.nav') && window.innerWidth >= 768;
  let x = inRail ? r.right + 8 : r.left + r.width / 2 - t.width / 2;
  let y = inRail ? r.top + r.height / 2 - t.height / 2 : r.top - t.height - 8;
  if (y < 4) y = r.bottom + 8;
  x = Math.max(4, Math.min(window.innerWidth - t.width - 4, x));
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
}

function hide() {
  clearTimeout(timer);
  target = null;
  tip.hidden = true;
}

export function setupTooltips() {
  document.addEventListener('pointerover', (e) => {
    if (e.pointerType !== 'mouse' || !canHover.matches) return;
    const el = e.target.closest('[data-tip]');
    if (el === target) return;
    hide();
    if (el) timer = setTimeout(() => show(el), 450);
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    hide();
    if (el && el.matches(':focus-visible')) timer = setTimeout(() => show(el), 300);
  });
  ['pointerdown', 'focusout', 'scroll', 'keydown'].forEach((type) => document.addEventListener(type, hide, true));
}
