# Analytics and backend: placeholders

Artify Web sends **nothing** today. It has no trackers, no accounts and makes no network requests at runtime (see [CLAUDE.md](CLAUDE.md)), and the About sheet promises the same: "No accounts, no tracking. Everything you save stays in this browser."

The code still leaves room for both later. There are two seams, each a single function call to switch on, so none of the modes have to change:

| Seam | File | Today |
| --- | --- | --- |
| Analytics events | [src/analytics.js](src/analytics.js): `track(name, props)` and `setAnalyticsAdapter(adapter)` | `track()` is called at every moment worth counting. With no adapter set it does nothing |
| Storage sync | [src/memento.js](src/memento.js): `memento.subscribe((key, value) => …)` | Fires after every write to the user's data. Nothing subscribes |

To watch events in the browser console while developing:

```js
localStorage.setItem('artify-web.debugAnalytics', 'true'); location.reload();
```

---

## Rules before turning anything on

These come from the product's privacy promise and from [CLAUDE.md](CLAUDE.md). An adapter that breaks one of them shouldn't ship.

1. **Opt-in, or aggregate and cookieless.** The default stays off. If you add an opt-in, put the toggle in the About sheet. Respect `navigator.globalPrivacyControl` and Do Not Track.
2. **First-party only.** Events go to an endpoint on our own domain (a Cloudflare Worker or Pages Function). No third-party scripts, SDKs or pixels, so the "no third-party requests" smoke test keeps passing. Allow that one origin in `tests/smoke.spec.js`.
3. **No personal data.** No IP storage, no fingerprinting, no user IDs across sessions, no artwork pixels or Studio content.
4. **Never reveal how many artworks, shapes or forms exist.** Don't send or show totals, "x of y" progress or category sizes. The events below carry only what the user did.
5. **Never block or break the art.** Use `navigator.sendBeacon` or `fetch(..., { keepalive: true })`, batch the events, and swallow every error. `track()` already catches adapter exceptions.
6. **Update the copy in the same change:** the About sheet, the README's privacy line, CLAUDE.md's rule, and the store listing for the Android app (Data safety form).

---

## Plugging in an adapter

Call this once, in [src/main.js](src/main.js), after consent if you use an opt-in:

```js
import { setAnalyticsAdapter } from './analytics.js';

const queue = [];
let timer = 0;
const flush = () => {
  if (!queue.length) return;
  navigator.sendBeacon('/api/events', JSON.stringify(queue.splice(0)));
};

setAnalyticsAdapter({
  track(name, props) {
    queue.push({ name, props, t: Date.now() });
    clearTimeout(timer);
    timer = setTimeout(flush, 5000);
  }
});
document.addEventListener('visibilitychange', () => document.hidden && flush());
```

Suggested receiver: a Pages Function at `/api/events` that validates event names against the list below, drops unknown properties, and writes counts to Workers Analytics Engine or D1. It stores no IPs or user agents.

---

## Event catalogue

Every `track()` call in the app is listed here. Keep the table in step with the code (`grep -rn "track('" src`).

| Event | When | Properties |
| --- | --- | --- |
| `app_open` | The app starts | `mode`, `standalone` (opened as an installed app) |
| `mode` | The user switches mode | `mode`, `from` |
| `category` | A category chip is picked | `category`, `mode` |
| `deep_link_open` | A shared `#/art/...` link is opened | `category`, `form` |
| `reform` | A new artwork is shown in Reform | `source` (`tap`, `click`, `swipe`, `key`, `auto`, `category`), `category`, `made` (reforms this session) |
| `reform_back` | Swipe right or ← in Reform | none |
| `save_design` | ♡ on an artwork | `mode`, `category`, `mine` (a Studio design) |
| `unsave` | ♡ again to remove | `mode` |
| `download` | PNG or SVG downloaded | `mode`, `format`, `kind` (in Saved) |
| `share` | Share used | `mode`, `result` (`shared`, `copied`, `downloaded`), `link` |
| `auto` | Auto-reform toggled | `on` |
| `zen` | Zen mode toggled | `on` |
| `new_round` | "Start a new round" | none |
| `puzzle_start` | A puzzle is dealt | `category`, `pieces` |
| `puzzle_solved` | All pieces placed, or Show answer | `moves`, `pieces`, `seconds`, `answer` |
| `splash_clear` | Canvas cleared | `strokes` |
| `painting_saved` | A painting is saved | `strokes` |
| `studio_add` | A shape is added in Studio | `shape` |
| `creation_saved` | A Studio design is saved | `items`, `isNew` |
| `saved_open` | A saved item is opened full screen | `kind` (`design`, `creation`, `painting`) |
| `saved_delete` | A deletion is committed (after the Undo window) | `kind` |
| `backup_export` | Backup exported | `designs`, `paintings`, `creations` (the user's own items) |
| `backup_import` | Backup imported | `designs`, `paintings`, `creations` added |
| `about_open` | About sheet opened | `mode` |
| `outbound` | A link to Open VSX or GitHub is clicked | `href` |
| `install_prompt` | The install prompt is answered | `outcome` |
| `installed` | The app was installed | none |
| `offline_ready` | The service worker has cached the app | none |

### Questions these answer

- **Does the core loop hook people?** `reform` per session (`made`), and the `source` mix of taps, swipes and auto.
- **Which categories pull people in?** `category` and `save_design.category`.
- **Is sharing working as a growth loop?** `share` with `link: true`, compared with `deep_link_open`.
- **Do the other modes earn their place?** `mode`, `puzzle_solved`, `painting_saved`, `creation_saved`.
- **Does the web app send people to the extension?** `outbound` to open-vsx.org.

---

## Backend placeholders

None of these exist yet. They are listed so the client stays ready for them.

### 1. Optional sync across devices

- **Client:** subscribe to `memento.subscribe()` and push the three user keys (`artify.collection`, `artify.creations`, `artify.paintings`) to the server. Leave out `artify.deck`, which is progress only. On start, pull and merge before `createHost()` runs, using the same merge rules as `host.importAll()`: dedupe by design or id, and respect Store's limits.
- **Server:** `GET/PUT /api/sync` with a passkey or magic-link account, or a no-account "sync code" pairing. Paintings are JPEG data URLs of up to about 600 KB each, so store them in R2 or a blob store, not in the JSON document.
- Until then, **Export/Import backup** in Saved covers moving between devices.

### 2. Rich previews for shared links

Today every shared link uses the static `og-image.png`. A Pages Function on `/s/<category>/<form>/<seed>` could render that exact artwork to PNG on the edge (the engine is pure JS with no DOM) for the OG tags, then redirect to `/#/art/...`. This makes the share loop much stronger and needs no user data.

### 3. Daily artwork

PLAN.md §10 lists this as a retention idea. It needs **no backend**: derive `seed` and `form` from the date (for example, hash `YYYY-MM-DD`), so everyone sees the same piece. A server is only needed if it is ever hand-curated.

### 4. Crash reports

The same rules apply: first-party, opt-in and anonymous. Hook `window.onerror` and `unhandledrejection` in `main.js` and send them through the analytics adapter as an `error` event (message and file:line only).

### Before you ship any of it

- [ ] Rules 1–6 above hold
- [ ] The smoke test's allow-list names exactly one first-party origin
- [ ] The About sheet, README, CLAUDE.md and Play Store Data safety form are updated
- [ ] A Content-Security-Policy `connect-src` names only that origin
