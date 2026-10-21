# Artify Web

The website (and later Android app) version of Artify Play. Read [PLAN.md](PLAN.md) before starting work.

## Source of truth: the Artify extension

The art comes from the VS Code extension at **`/home/murtazabaig/fun-projects/artify`**
(GitHub: https://github.com/murtaza335/artify). Read it before building any feature. This repo is only the web shell around it.

Read these files in the extension repo first:

| File | Why |
| --- | --- |
| `README.md` | What every mode does, and how it is described to users |
| `src/forms.js` | `compose`, `renderDesign`, `composeCreation`, `CATEGORIES`, `CATEGORY_LABELS`, `ANIMATION_CSS`: the art API |
| `src/shapes/engine.js` | Palettes (`COLORS.dark`), seeded random, the 240 x 380 viewBox |
| `src/deck.js` | The shuffled deck: no repeats until every form is seen, seeds never reused |
| `src/store.js` | Collection, paintings and Studio creations, with their limits and `sanitizeCreation` |
| `src/play.js` | The host side of Play: the message protocol each mode uses |
| `media/play.js`, `media/studio.js`, `media/play.css` | The Play UI: Reform, Puzzle, Splash and Studio logic to port |
| `scripts/palettes.js` | Tile Night colours, the source of this site's design tokens |

## Rules

- **Don't fork the engine.** Import it from the extension repo (see PLAN.md, "Engine bridge"). If a shape needs fixing, fix it in `artify` and run `npm test` there.
- `Deck` and `Store` take a VS Code `Memento` (`get(key, default)` / `update(key, value)`). On the web they get a storage-backed shim with the same interface. Don't rewrite them.
- **Never show how many artworks, shapes or forms exist**, in the UI, the copy, the metadata or the README.
- Dark theme only: Artify Tile Night. Use the CSS tokens in PLAN.md and don't hard-code colours outside `:root`.
- Mobile first. Design every screen at 360 px wide first, then scale up to desktop.
- Icon-only controls must have an `aria-label` and a tooltip on hover-capable devices. Touch targets must be at least 44 x 44 px.
- No trackers and no third-party network requests at runtime. Bundle fonts and icons.
