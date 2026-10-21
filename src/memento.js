// A storage-backed stand-in for VS Code's Memento, so the extension's Deck and Store run unchanged.
//
// get() must be synchronous, so everything is read into memory once at start (openMemento) and written
// through on update(). Paintings are large JPEG data URLs, so that one key lives in IndexedDB instead of
// localStorage. Every storage call is guarded: in private mode the app still works, it just forgets.

import { get as idbGet, set as idbSet } from 'idb-keyval';

// The extension's own keys, so exported data means the same thing in both places.
export const KEYS = {
  deck: 'artify.deck',
  collection: 'artify.collection',
  paintings: 'artify.paintings',
  creations: 'artify.creations'
};
const IDB_KEYS = new Set([KEYS.paintings]);

function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

class WebMemento {
  constructor(cache) {
    this.cache = cache;
    this.listeners = new Set();
    this.persistAsked = false;
  }

  get(key, defaultValue) {
    const v = this.cache.get(key);
    // Store mutates what it reads before writing it back, so callers always get their own copy.
    return v === undefined ? defaultValue : clone(v);
  }

  async update(key, value) {
    this.cache.set(key, clone(value));
    let ok = false;
    if (IDB_KEYS.has(key)) {
      try {
        await idbSet(key, value);
        ok = true;
      } catch {
        ok = false;
      }
    } else {
      ok = writeLocal(key, value);
    }
    if (key !== KEYS.deck) this.askPersist();
    // Hook for a future sync backend (see ANALYTICS.md). Nothing listens today.
    this.listeners.forEach((fn) => fn(key, value));
    return ok;
  }

  keys() {
    return [...this.cache.keys()];
  }

  /** Called with (key, value) after every write. For a future sync adapter. */
  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // After the first real save, ask the browser not to evict our storage.
  askPersist() {
    if (this.persistAsked) return;
    this.persistAsked = true;
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    } catch {
      // Not supported.
    }
  }
}

/** Loads every key into memory and returns a memento for Deck and Store. */
export async function openMemento() {
  const cache = new Map();
  for (const key of Object.values(KEYS)) {
    if (IDB_KEYS.has(key)) continue;
    const v = readLocal(key);
    if (v !== undefined) cache.set(key, v);
  }
  for (const key of IDB_KEYS) {
    try {
      const v = await idbGet(key);
      if (v !== undefined) cache.set(key, v);
    } catch {
      // IndexedDB unavailable (private mode in some browsers).
    }
  }
  return new WebMemento(cache);
}

/** Small per-browser preferences that are not part of the extension's data (hint seen, guide on, brush size). */
export const prefs = {
  get(name, fallback) {
    const v = readLocal('artify-web.' + name);
    return v === undefined ? fallback : v;
  },
  set(name, value) {
    writeLocal('artify-web.' + name, value);
  }
};
