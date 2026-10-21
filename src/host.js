// The web stand-in for the extension's src/play.js: it owns the Deck and Store and answers what the
// modes ask for (next design, save, paintings, Studio creations, export and import). It runs in the page,
// so there is no message passing, but the checks play.js does on webview messages are kept here.

import { Deck, Store, renderDesign, composeCreation, sanitizeCreation, formIds, CATEGORY_LABELS, SHAPES } from './vendor/artify-engine.js';
import { KEYS } from './memento.js';

// Same limits as the extension's play.js.
export const PUZZLE_MAX_PIECES = 45;
const MAX_IMAGE_CHARS = 600000;
const SHAPE_IDS = new Set(SHAPES.map((s) => s.id));
const KIND = 'dark'; // Artify Tile Night only
const EXPORT_FORMAT = 'artify-web-backup';

const isCategory = (c) => typeof c === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, c);
const sameDesign = (a, b) => a.seed === b.seed && a.category === b.category && (a.creation || '') === (b.creation || '') && (a.form || '') === (b.form || '');

/** A plain { seed, category, form?, creation? } with only the fields a design needs. */
export function designOf(item) {
  const out = { seed: item.seed || 0, category: item.category || 'all' };
  if (item.form) out.form = item.form;
  if (item.creation) out.creation = item.creation;
  return out;
}

export function createHost(memento) {
  const deck = new Deck(memento);
  const store = new Store(memento);

  const host = {
    memento,
    kind: KIND,
    shapes: SHAPES,

    /** Deals the next design for Reform. */
    next(category) {
      return deck.next(isCategory(category) ? category : 'all', store.creations());
    },

    /** Deals a design small enough to be a comfortable puzzle. */
    nextPuzzle(category) {
      return deck.next(isCategory(category) ? category : 'all', store.creations(), { maxParts: PUZZLE_MAX_PIECES });
    },

    /** @returns {{ svg: string, name: string, parts: number }} */
    render(item) {
      return renderDesign(KIND, item, store.creations());
    },

    renderCreation(creation) {
      return composeCreation(KIND, creation);
    },

    /** Reads a deep link's parts back into a design, or null if they don't describe one. */
    fromLink(category, form, seed) {
      const n = Number(seed);
      if (!isCategory(category) || category === 'mine' || !Number.isInteger(n) || n < 1 || n > 1e9) return null;
      if (!formIds(category).includes(form)) return null;
      return { seed: n, category, form };
    },

    // ---- Saved designs -------------------------------------------------------------------------

    collection() {
      return store.collection();
    },

    isSaved(item) {
      return Boolean(item) && store.collection().some((s) => sameDesign(s, designOf(item)));
    },

    async save(item) {
      if (!item || (!item.seed && !item.creation)) return false;
      await store.addToCollection(designOf(item));
      return true;
    },

    async unsave(item) {
      const i = store.collection().findIndex((s) => sameDesign(s, designOf(item)));
      if (i >= 0) await store.removeFromCollection(i);
    },

    async removeSavedAt(index) {
      await store.removeFromCollection(index);
    },

    newRound() {
      return deck.newRound();
    },

    // ---- Paintings -----------------------------------------------------------------------------

    paintings() {
      return store.paintings();
    },

    async savePainting(dataUrl) {
      if (typeof dataUrl !== 'string' || !/^data:image\/(jpeg|png);base64,/.test(dataUrl) || dataUrl.length >= MAX_IMAGE_CHARS) return false;
      await store.addPainting(dataUrl);
      return true;
    },

    removePainting(id) {
      return store.removePainting(String(id));
    },

    // ---- Studio creations ----------------------------------------------------------------------

    creations() {
      return store.creations();
    },

    /** Saves a design from Studio. Returns the stored creation, or undefined if it had no valid shapes. */
    async saveCreation(raw) {
      const creation = sanitizeCreation(raw, SHAPE_IDS);
      if (!creation) return undefined;
      await store.saveCreation(creation);
      return creation;
    },

    sanitizeCreation(raw) {
      return sanitizeCreation(raw, SHAPE_IDS);
    },

    removeCreation(id) {
      return store.removeCreation(String(id));
    },

    // ---- Backup --------------------------------------------------------------------------------

    /** Everything the user saved, as a JSON-ready object. The deck is left out: it is only progress. */
    exportAll() {
      return {
        format: EXPORT_FORMAT,
        version: 1,
        exportedAt: new Date().toISOString(),
        collection: store.collection(),
        paintings: store.paintings(),
        creations: store.creations()
      };
    },

    /**
     * Merges a backup into what is saved, skipping anything already here or malformed.
     * Writes go through the memento with the extension's keys and limits, like Store's own writes.
     * @returns {{ designs: number, paintings: number, creations: number }} how many items were added
     */
    async importAll(data) {
      if (!data || data.format !== EXPORT_FORMAT) throw new Error('This file is not an Artify backup.');
      const added = { designs: 0, paintings: 0, creations: 0 };

      const creations = store.creations();
      for (const raw of Array.isArray(data.creations) ? data.creations : []) {
        const c = sanitizeCreation(raw, SHAPE_IDS);
        if (!c || creations.some((x) => x.id === c.id)) continue;
        creations.push(c);
        added.creations++;
      }
      await memento.update(KEYS.creations, creations.slice(0, 40));

      const ids = new Set(creations.map((c) => c.id));
      const collection = store.collection();
      for (const raw of Array.isArray(data.collection) ? data.collection : []) {
        if (!raw || !isCategory(raw.category)) continue;
        const item = designOf({ seed: Number(raw.seed) || 0, category: raw.category, form: typeof raw.form === 'string' ? raw.form : undefined, creation: typeof raw.creation === 'string' ? raw.creation : undefined });
        if (item.creation ? !ids.has(item.creation) : !(item.seed >= 1)) continue;
        if (collection.some((s) => sameDesign(s, item))) continue;
        collection.push(item);
        added.designs++;
      }
      await memento.update(KEYS.collection, collection.slice(0, 24));

      const paintings = store.paintings();
      for (const raw of Array.isArray(data.paintings) ? data.paintings : []) {
        if (!raw || typeof raw.dataUrl !== 'string' || !/^data:image\/(jpeg|png);base64,/.test(raw.dataUrl) || raw.dataUrl.length >= MAX_IMAGE_CHARS) continue;
        const id = typeof raw.id === 'string' && /^\w{1,40}$/.test(raw.id) ? raw.id : String(Date.now() + paintings.length);
        if (paintings.some((p) => p.id === id || p.dataUrl === raw.dataUrl)) continue;
        paintings.push({ id, dataUrl: raw.dataUrl });
        added.paintings++;
      }
      await memento.update(KEYS.paintings, paintings.slice(0, 12));
      return added;
    }
  };
  return host;
}

export { CATEGORY_LABELS };
