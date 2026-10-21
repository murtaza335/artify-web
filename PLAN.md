# Artify Web: strategy

Goal: bring Artify Play to the browser as a fast, installable, mobile-first web app. It should be addictive enough that someone opens it for a few seconds and stays for ten minutes. It should also work well on a desktop screen and later wrap into an Android app with no rewrite.

Source extension: `/home/murtazabaig/fun-projects/artify` (see [CLAUDE.md](CLAUDE.md)).

---

## 1. What we reuse and what we write

| Piece in the extension | VS Code dependency | Plan |
| --- | --- | --- |
| `src/shapes/*`, `src/forms.js` (art engine) | None, pure functions | Reuse as is, bundled to ESM |
| `src/deck.js` (shuffled deck) | Takes a `Memento` | Reuse, given a localStorage-backed memento shim |
| `src/store.js` (saved items) | Takes a `Memento` | Reuse with the same shim. Paintings go to IndexedDB (see §6) |
| `src/play.js` (Play host) | `vscode`, `crypto`, `os` | Replace with `src/host.js`, a small in-page module that answers the same messages |
| `media/play.js`, `media/studio.js` | `acquireVsCodeApi` only | Port the mode logic (puzzle drag, splash physics, studio handles). They already use pointer events, so touch mostly works |
| `media/play.css`, `--vscode-*` vars | VS Code CSS vars | Rewrite. The new layout is mobile first and uses our own tokens |

The engine is the product. The web app is a new shell around it.

## 2. Tech stack

- **Vite + vanilla JS (ES modules)**, with no framework. That matches the extension, keeps the bundle small and makes Capacitor wrapping trivial later.
- **Engine bridge:** a `scripts/build-engine.mjs` step uses **esbuild** to bundle `../artify/src/forms.js`, `deck.js`, `store.js` and `shapes/engine.js` (all CommonJS) into `src/vendor/artify-engine.js` (ESM). Its path is configurable with `ARTIFY_DIR`, and it defaults to the sibling folder.
  - Commit the bundled file so the site builds without the extension checked out (CI, Cloudflare). Rebuild it whenever the extension changes, and record the extension's version and commit in a header comment.
  - Alternative if this gets awkward: add `artify` as a git submodule. Don't start there.
- **PWA:** `vite-plugin-pwa` gives offline support, an install prompt and a manifest. The Android path (Capacitor or TWA) builds on this.
- **Hosting:** Cloudflare Pages or GitHub Pages, both static and free. Cloudflare is preferred for preview deploys per branch.
- **Tests:** the extension's `npm test` keeps guarding the art. Here, Playwright smoke tests at 360x780 (phone) and 1440x900 (desktop): load, tap to reform, save, reload and still saved, plus a Lighthouse score of at least 90 for performance and accessibility.

Proposed layout:

```
artify-web/
  index.html
  src/
    main.js          app shell, routing between modes
    host.js          replaces src/play.js: compose, deck, store, export
    memento.js       localStorage shim with VS Code's Memento interface
    modes/reform.js  puzzle.js  splash.js  studio.js  saved.js
    ui/icons.svg     sprite   ui/sheet.js (bottom sheet)   ui/toast.js
    styles/tokens.css  base.css  layout.css
    vendor/artify-engine.js   (generated)
  scripts/build-engine.mjs
  public/  icons, manifest images, og-image.png
```

## 3. Theme: Artify Tile Night

Dark only, with tokens taken from `scripts/palettes.js` (`dark`). Art is drawn with `COLORS.dark` from the engine.

```css
:root {
  --bg:        #1B1016;  /* page / stage ground (editor bg) */
  --bg-deep:   #0F0A0E;  /* bars: top bar, bottom nav, rail (titleBg) */
  --surface:   #241520;  /* sheets, cards, menus (widget) */
  --teal-deep: #10232B;  /* secondary surface, active chip ground (sidebar) */
  --line:      #3A2630;  /* hairlines */
  --line-strong: #4A3040;
  --fg:        #F3EBDD;  /* cream text */
  --fg-muted:  #B9A8AE;
  --accent:    #E9A93B;  /* ochre: primary action, active tab, focus */
  --on-accent: #1B1016;
  --link:      #62C3E3;  /* sky */
  --brick:     #E5534B;  /* destructive only */
  --hover:     #16303A;
  --radius: 14px;
}
```

- `<meta name="theme-color" content="#0F0A0E">` makes the Android status bar blend in.
- Focus rings are a 2 px `--accent` outline. Every text and surface pair must pass WCAG AA, the same rule as the extension. Port `check-contrast.js` logic for the tokens.
- Type is the system UI stack, and the ARTIFY wordmark uses the extension's letter-spaced heavy style. No webfont is needed for v1.

## 4. Layout: mobile first, then desktop

The art is a **240 x 380 portrait**, almost exactly a phone screen. On phones the art should feel full screen.

**Phone (default, < 768 px):**

```
┌──────────────────────────┐
│ ARTIFY            ⓘ  ⋯  │  thin top bar (bg-deep)
│ ‹ All  Faces  Animals … ›│  category chips, horizontal scroll (Reform/Puzzle only)
│                          │
│                          │
│        ARTWORK           │  stage: as large as fits, centred
│     (tap = next)         │
│                          │
│                          │
│      ♡    ⤴    ⬇    ⟲   │  floating action row: save, share, download, auto
├──────────────────────────┤
│  ◇     ⧉     ✺     ✎    ▤ │  bottom nav: Reform Puzzle Splash Studio Saved
└──────────────────────────┘
```

**Desktop (≥ 1024 px):**

```
┌────┬───────────────────────────────────────────┬──────────────┐
│ ◇  │                                           │ CATEGORY     │
│ ⧉  │                                           │ (chip grid)  │
│ ✺  │               ARTWORK                     │              │
│ ✎  │          (click = next)                   │ ♡ ⤴ ⬇ ⟲      │
│ ▤  │                                           │              │
│    │                                           │ shortcuts    │
│ ⓘ  │                                           │ links        │
└────┴───────────────────────────────────────────┴──────────────┘
 rail           stage (max height ~88vh)            side panel (300px)
```

- Tablet (768–1023 px): the bottom nav becomes the left rail, and the side panel stays a bottom sheet.
- Use CSS grid with `dvh` units (not `vh`) so mobile browser chrome doesn't crop the art. Respect `env(safe-area-inset-*)` for notches and the Android gesture bar.
- No page scroll in Reform, Puzzle or Splash. The app is a fixed viewport. Saved and About scroll normally.

## 5. Interaction design

### Reform, the core loop

| Gesture | Phone | Desktop |
| --- | --- | --- |
| Next artwork | **Tap the art**, or swipe left | **Click the art**, `Space`, `→`, `R` |
| Previous artwork | Swipe right | `←` |
| Save | ♡ button | ♡ or `S` |
| Share | ⤴ (Web Share API with PNG + link) | ⤴ copies link, `C` |
| Download | ⬇ PNG (SVG in the long-press / overflow menu) | ⬇ or `D` |
| Auto-reform | ⟲ toggle, 5 s, pauses while hidden | ⟲ or `A` |
| Zen mode | Long-press the art: hides all chrome, tap the corner to exit | `F` |

Decisions:

- **Tap means next, and it reacts instantly.** No double-tap gesture, because detecting one forces a ~300 ms delay on every single tap and kills the snappy feel. Save is the ♡ button, which fills ochre when saved.
- **A tap during the fly-in skips to the next artwork immediately**, with no queueing. Fast tappers are the most engaged users. Debounce to about 120 ms so one tap can't register twice.
- **History:** keep the last 50 `{category, form, seed}` items in the session so swipe-back works. Going back never consumes the deck.
- **Swipe thresholds:** horizontal distance > 50 px and greater than the vertical distance, otherwise it counts as a tap. Use pointer events and `touch-action: pan-y` on the stage.
- **Cursor and affordance:** on desktop, a `pointer` cursor and a subtle scale on hover. On first visit only, show a hint pill: "Tap the art for the next one", dismissed after the first tap and remembered.
- **Accessibility:** the stage is a `<button aria-label="Next artwork">`, and the art has a `<title>` with the form name. `prefers-reduced-motion` swaps the fly-in for a 150 ms fade.
- **Deep links:** every artwork is deterministic, so `/#/art/<category>/<formId>/<seed>` reproduces it exactly. Shared links open straight to that artwork, which makes it the best organic growth loop. Opening a link doesn't consume the deck.

### Other modes (a tap is not "next" there)

- **Puzzle:** drag the shards. A finished puzzle shows a small celebration and a **Next puzzle** button. Tapping the solved art then moves to the next puzzle, so the core loop stays consistent. Keep the "faint guide" and "Show answer" options in the ⋯ menu.
- **Splash:** drag to splash and hold to pour (existing logic). On phones the colour picker is a row of 8 swatch dots above the nav, and clearing has a confirm-free undo toast. Canvas is sized to the stage with `devicePixelRatio` scaling.
- **Studio:** the hardest one on mobile. The shape picker is a bottom sheet grid, the selected shape gets larger handles (32 px hit area), and there's pinch to scale and two-finger rotate. Put it last in the build order.
- **Saved:** a grid of thumbnails (designs, paintings, Studio creations). Tap opens one full screen with the same action row. Long-press or ⋯ deletes, and an undo toast replaces confirm dialogs. There's also export/import of everything as a JSON file, because browser storage can be cleared.

### Icons

- One minimalist line set: **Lucide** (ISC licence), only the ~20 icons needed, inlined as an SVG sprite. 24 px, 1.75 stroke, `currentColor`.
- Mapping: Reform `sparkles`/`shuffle`, Puzzle `puzzle`, Splash `paintbrush`/`droplets`, Studio `shapes`, Saved `heart` or `bookmark`, Share `share-2`, Download `download`, Auto `repeat`/`play`, Info `info`, More `more-horizontal`, GitHub `github`, plus the back and close icons.
- Icon-only everywhere except the bottom nav, which shows tiny labels under the icons on phones because 5 unlabeled icons is too ambiguous. Desktop gets tooltips (`title` plus a custom delayed tooltip).

## 6. Storage

- `memento.js` implements `get(key, default)` and `update(key, value)` (returning a Promise) over `localStorage`, with the extension's own keys (`artify.deck`, `artify.collection`, `artify.creations`). That lets `Deck` and `Store` run unchanged.
- Paintings are JPEG data URLs (up to `MAX_IMAGE_CHARS`). Twelve of them can approach localStorage's ~5 MB limit, so the shim routes `artify.paintings` to **IndexedDB** (via `idb-keyval`, ~1 KB).
- Call `navigator.storage.persist()` after the first save so the browser is less likely to evict data.
- Wrap all storage calls in try/catch. Private mode must still work, just without persistence.

## 7. Links and the About sheet

The About sheet opens from ⓘ in the top bar or rail. The desktop side panel also shows the links in a compact footer.

- **Get Artify for your editor**, the primary CTA: Open VSX, https://open-vsx.org/extension/artify/artify
  - Verify the namespace: `package.json` says publisher `murtazabaig` while the README link uses `artify/artify`. Check both before shipping.
  - VS Code Marketplace: add only if the extension is published there. It isn't referenced anywhere yet.
- **Source on GitHub:** https://github.com/murtaza335/artify, plus a link to the web repo once it's public.
- **Report an issue:** https://github.com/murtaza335/artify/issues
- **Themes:** a short note that the colours come from Artify Tile Night, with a link to the README's theme section.
- Licence (MIT) and a one-line privacy note: "No accounts, no tracking. Everything you save stays in this browser."

Never mention how many artworks exist anywhere in this copy.

## 8. Performance budget

- Shape source is ~550 KB raw. Minified and gzipped it should be ~100–150 KB. Measure it in phase 0.
  - If it's over 200 KB, split the engine per category with dynamic `import()` and load "All" lazily after first paint.
- Time to first artwork under 1.5 s on a mid-range Android over 4G. Render the first artwork from a fixed seed inline if needed.
- The SVG art is cheap, but large shard counts animate with CSS transforms only (no layout properties).
- Auto-reform pauses on `visibilitychange`.

## 9. Build order

Each phase ends deployable.

| Phase | Scope | Done when |
| --- | --- | --- |
| **0. Bridge** | Scaffold Vite, `build-engine.mjs`, memento shim, render one `compose('dark', seed)` SVG | An artwork renders in the browser, and the bundle size is measured |
| **1. Reform MVP** | Tokens, responsive shell, bottom nav and rail, tap/swipe/keys, categories, deck, history, save ♡, download PNG/SVG, About sheet with links | It feels good on a real Android phone and desktop. Deploy to a preview URL |
| **2. Share and install** | Deep links, Web Share plus PNG, OG image, PWA manifest, offline, first-run hint, zen mode, auto-reform | It installs to the home screen, works offline, and shared links reproduce the artwork |
| **3. Saved** | Saved grid, open/delete/undo, IndexedDB paintings, export/import JSON | Survives a reload. Import restores everything |
| **4. Puzzle** | Port the drag logic, touch tuning, celebration, next puzzle | Solvable comfortably with a thumb |
| **5. Splash** | Port the paint canvas, DPR scaling, swatches, save/export | 60 fps on a mid-range phone |
| **6. Studio** | Port the editor, bottom-sheet picker, pinch/rotate | Can build and save a design on a phone. Creations come up in Reform |
| **7. Android** | Capacitor wrap of the same build: icon, splash screen, Play Store listing | APK installs and behaves like the PWA |

## 10. Retention ideas (after v1, keep it light)

- **Daily artwork:** one seed per date, the same for everyone, shareable.
- **Favourites wall:** your saved designs as a shuffling screensaver in zen mode.
- A haptic tick on reform (`navigator.vibrate(8)`) on Android, with an off switch.

Avoid streak guilt, notifications and accounts in v1.

## 11. Open questions

1. Domain: something like `artify.<tld>`, or start on `*.pages.dev`?
2. Is the extension on the VS Code Marketplace too, or Open VSX only?
3. Should the web repo be public under `murtaza335/artify-web`, or live inside the main repo as `web/`? A separate repo is recommended, since it keeps the extension package clean.
4. Any analytics at all? The default is none, matching the extension's "no network requests" promise.
