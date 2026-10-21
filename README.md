# Artify Web

Artify Play in the browser. Tap for endless generated shard art, solve it as a puzzle, throw paint, or build your own design from shapes. It's mobile first, works offline, installs to the home screen, and the same build wraps into an Android app.

The art comes from the [Artify extension](https://github.com/murtaza335/artify) for VS Code and Open VSX editors. This repo is only the web shell around it: see [PLAN.md](PLAN.md) for the strategy and [CLAUDE.md](CLAUDE.md) for the rules.

No accounts, no tracking. Everything you save stays in your browser.

## Modes

| Mode | What you do |
| --- | --- |
| **Reform** | Tap the art (or press Space, → or R) for the next one. Swipe right or press ← to go back. Save with ♡, share a link that reproduces the exact artwork, download PNG or SVG, turn on auto-reform, or long-press (or press F) for zen mode |
| **Puzzle** | Drag the shards back into place. Tap the solved art for the next puzzle |
| **Splash** | Drag to splash paint, hold still to pour, and watch the drips run |
| **Studio** | Build a design from shapes. Pinch to scale and twist to rotate. Saved designs come up when you reform |
| **Saved** | Your designs, Studio designs and paintings, plus a backup export and import |

## Develop

Needs Node 20 or later. The extension repo should sit next to this one (`../artify`), or be pointed to with `ARTIFY_DIR`.

```sh
npm install
npm run dev            # http://localhost:5173
npm test               # contrast check, build, size budget, Playwright smoke tests
```

| Script | What it does |
| --- | --- |
| `npm run build:engine` | Bundles the extension's engine into `src/vendor/artify-engine.js`. Run it after the extension changes, then commit the result |
| `npm run build:icons` | Rebuilds the Lucide icon sprite `src/ui/icons.svg` from the `ICONS` list |
| `npm run build:images` | Renders the PWA icons and `og-image.png` into `public/` |
| `npm run check:contrast` | Checks every text and surface pair in `src/styles/tokens.css` against WCAG AA |
| `npm run check:size` | Fails if the gzipped JS and CSS go over the 200 KB budget |

The first time you run the tests, install the browser with `npx playwright install chromium`.

### The engine bridge

The engine is never forked. `scripts/build-engine.mjs` bundles `forms.js`, `deck.js`, `store.js`, `shapes/engine.js` and `shapes/library.js` from the extension into one ES module. Its header records the extension's version and commit. To change a shape, fix it in `artify`, run `npm test` there, then run `npm run build:engine` here.

`Deck` and `Store` run unchanged on [src/memento.js](src/memento.js), a stand-in for VS Code's `Memento` backed by `localStorage`, with paintings in IndexedDB.

## Layout

```
index.html              the shell: top bar, nav/rail, stage, action rows, sheets
src/main.js             routing (#/reform, #/art/<category>/<form>/<seed>, …), chips, keys, zen
src/host.js             stands in for the extension's src/play.js: deck, store, export/import
src/memento.js          localStorage + IndexedDB Memento shim
src/analytics.js        no-op analytics seam (see ANALYTICS.md)
src/pwa.js              service worker and install button
src/modes/              reform, puzzle, splash, studio, saved
src/ui/                 icons.svg, sheet, toast, tooltip, export/share
src/styles/             tokens.css (Artify Tile Night), base.css, layout.css
src/vendor/             artify-engine.js (generated, committed)
scripts/                engine, icons, images, contrast, size
tests/                  Playwright smoke tests at 360×780 and 1440×900
android/                Capacitor Android project
```

## Deploy

It's a static site. On Cloudflare Pages (preferred, for preview deploys per branch) or GitHub Pages:

- Build command: `npm run build`
- Output directory: `dist`

The build uses relative paths, so it also works from a sub-path such as GitHub Pages' `/artify-web/`.

## Android

The same build is wrapped with [Capacitor](https://capacitorjs.com). It needs a JDK (21) and the Android SDK.

```sh
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
npx cap open android                         # or open it in Android Studio
```

For the Play Store, build a signed `bundleRelease` with your own upload key (never commit it) and fill in the listing. The app ID is `io.github.murtaza335.artify`.

## Analytics and backend

There aren't any. [ANALYTICS.md](ANALYTICS.md) describes the seams left for them (an event hook and a storage-sync hook), the rules any future adapter must follow, and every event the app would send.

## Licence

MIT. Icons are from [Lucide](https://lucide.dev) (ISC).
