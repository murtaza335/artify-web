// One toast at a time, with an optional action such as Undo. Replaces confirm dialogs.

const box = document.getElementById('toast');
const text = document.getElementById('toast-text');
const action = document.getElementById('toast-action');
let timer = 0;
let onAction = null;
let onExpire = null;

function hide() {
  clearTimeout(timer);
  box.hidden = true;
  onAction = null;
  const expire = onExpire;
  onExpire = null;
  if (expire) expire();
}

action.addEventListener('click', () => {
  const fn = onAction;
  onExpire = null;
  hide();
  if (fn) fn();
});

/**
 * @param {string} message
 * @param {{ action?: string, onAction?: () => void, onExpire?: () => void, ms?: number }} [opts]
 *   onExpire runs when the toast goes away without its action being pressed (timeout or replaced).
 */
export function toast(message, opts = {}) {
  hide();
  text.textContent = message;
  action.hidden = !opts.action;
  action.textContent = opts.action || '';
  onAction = opts.onAction || null;
  onExpire = opts.onExpire || null;
  box.hidden = false;
  // Re-trigger the entry animation.
  box.style.animation = 'none';
  void box.offsetWidth;
  box.style.animation = '';
  timer = setTimeout(hide, opts.ms || (opts.action ? 5000 : 2600));
}

/** Ends the current toast now, running its expiry (used before the page is hidden). */
export function flushToast() {
  if (!box.hidden) hide();
}
