// Analytics seam. Today this sends nothing anywhere: no trackers, no network requests (see CLAUDE.md).
//
// The app calls track() at the moments worth counting, so a future adapter can be plugged in with one
// setAnalyticsAdapter() call and no changes to the modes. ANALYTICS.md lists every event, its properties,
// and the rules any adapter must follow (opt-in, first-party only, no artwork counts, no personal data).

/** @typedef {{ track(name: string, props: Record<string, string | number | boolean>): void }} AnalyticsAdapter */

/** @type {AnalyticsAdapter | null} */
let adapter = null;
const debug = (() => {
  try {
    return localStorage.getItem('artify-web.debugAnalytics') === 'true';
  } catch {
    return false;
  }
})();

/** Plugs in a backend. Pass null to turn analytics off again. */
export function setAnalyticsAdapter(next) {
  adapter = next;
}

/**
 * Records an event. Never throws and never blocks the UI.
 * @param {string} name one of the events in ANALYTICS.md
 * @param {Record<string, string | number | boolean>} [props]
 */
export function track(name, props = {}) {
  if (debug) console.debug('[analytics]', name, props);
  if (!adapter) return;
  try {
    adapter.track(name, props);
  } catch {
    // An adapter failure must never break the art.
  }
}
