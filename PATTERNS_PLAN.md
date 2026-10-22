# Plan: patterns and abstract art, round two

> Copy of `../artify/PATTERNS_PLAN.md`. The extension repo holds the original, so edit it there and copy it back here. Section 11 covers the work in this repo.

A plan for adding a large new set of Reform forms to Artify: geometric tilings, mathematical art, world pattern traditions and more abstract movements. It covers 312 forms in twelve families of 26. **Status: implemented in 0.13.0.** See "Implementation notes" at the end for what changed from this plan.

It builds on [SHAPES_PLAN.md](../artify/SHAPES_PLAN.md), whose ground rules still apply, and on the Abstract round (0.12.0), whose conventions it follows: `abstract-kit.js`, framed panels, `hues()` and puzzle-sized bundles.

> **Count rule.** The totals in this file are for planning only. Don't put them in the README, the UI, `package.json`, the store listing or the changelog. The changelog can name families and describe what they contain, but never how many forms there are.

---

## 1. Where things stand

- Each form is a `form(ctx)` function in `src/shapes/*.js`. It draws shards into a 240 x 380 viewBox and returns a lower-case display name.
- `src/forms.js` registers forms in `CATEGORIES`. `FORMS_BY_ID` keys them by **function name**, and the registry throws if two forms share a name. `scripts/shipped-forms.json` lists every id that has shipped, and `check-art.js` fails if any of them disappears.
- The **Abstract** category spreads eight files (`abstract-*.js`) into one array with `...Object.values(file)`. Its helpers live in `src/shapes/abstract-kit.js`: `panel`, `frame`, `hues`, `ground`, `bundle`, `batcher`, `polyline`, `veil`, `glow`, `ring` and `noise2`.
- `src/shapes/engine.js` already has `radial`, `arcBand`, `blob`, `dotField`, `stripes`, `starPoints`, `circleBand`, `rotRect` and `curvePoly`.
- Some subjects are already covered, and this plan doesn't repeat them: `penrose` (rhombs), `honeycomb`, `islamicStar`, `truchet`, `triangleTruchet`, `voronoi`, `spirograph`, `lissajous`, `sierpinski`, `hilbertCurve`, `dragonCurve`, `harmonograph`, `cellularAutomaton`, `gameOfLife`, `flowField`, `circlePacking`, `contours`, `waveScales` (seigaiha), `hempLattice` (asanoha), `overlappingRings` (shippō), `thresholdLoops` (kolam), `mudcloth`, `kilimSteps`, `ikatDiamonds`, `tartan`, `herringbone`, `stepFret`, `cutPileMaze`, `paintedWall`, `polygonVariations`, `interruptions`, `gravel`, `nailField`, `lightRaster`, `rotoRelief`, `opArt`, `rileyStripes`, `kusamaDots` and `artDeco`, among others.
- **Deck:** `Deck.mergeNew` already shuffles forms added in a release into rounds that are in progress, so new forms show up without the user starting a new round.
- **Web:** Artify Web builds its category pills from `CATEGORY_LABELS` (`artify-web/src/main.js`), so a new category reaches the web app once its engine bundle is rebuilt.

## 2. Research summary

The catalog in section 5 draws on these sources:

- **Tilings and tessellations:** the Archimedean (semi-regular) tilings, the Cairo pentagonal tiling (paving made of congruent convex pentagons, formed by overlaying two hexagon tilings and dual to the snub square tiling), Heesch-type tiles in the manner of Escher, substitution tilings (pinwheel, chair, sphinx, Ammann–Beenker), Wang tiles, and the 2023 "hat" aperiodic monotile.
- **Islamic geometry:** the five girih tiles (*tabl* decagon, *shesh band* elongated hexagon, *sormeh dan* bow-tie, *torange* rhombus and *pange* pentagon) carry strapwork lines. Lu and Steinhardt argue that by the 15th century these were combined with self-similar subdivision to make quasi-crystalline patterns, as at the Darb-i Imam shrine. Zellige builds radiating star patterns from hand-chiselled tiles. Hankin's polygons-in-contact method gives a practical algorithm for drawing all of them.
- **Japanese *wagara*:** seigaiha, asanoha, kikkō, shippō, yagasuri, ichimatsu and uroko, many of them built on simple grids. They reached kimono cloth through *katagami* paper stencils.
- **Kolam:** loops drawn around a dot grid (the sikku and pulli kolam). Researchers study them through symmetry groups and Eulerian circuits. Artify already has `thresholdLoops`, so this round adds rangoli colour work instead.
- **Op and kinetic art:** these use parallel lines, checks, concentric circles, moiré and complementary colours of equal intensity. Soto used wires in front of a striped ground, Cruz-Diez made additive colour from raised strips, and Agam made works that change as the viewer walks past. The movement's landmark was *The Responsive Eye* (MoMA, 1965). ZERO (Mack, Piene, Uecker), Gutai and Nul worked with light, movement and the monochrome.
- **Minimal and conceptual systems:** LeWitt's wall drawings use lines in four directions, arcs from the sides, and isometric figures drawn with superimposed line layers or ink washes. The instruction is the work, so every execution differs, which suits seeded forms well.
- **Latin American abstraction:** Asociación Arte Concreto-Invención (Buenos Aires, 1944), Brazilian Neo-Concretism (Lygia Clark, Lygia Pape and Hélio Oiticica), Gego's wire nets, and Geraldo de Barros's *Diagonal Function* (1952).
- **Pattern and Decoration** (1975–85): Schapiro (who coined "femmage"), Kozloff, Jaudon, Kushner, MacConnel and Zakanitch revived the decorative as a challenge to Modernist hierarchies.
- **Generative art:** flow fields, L-systems (turtle drawings from rewrite grammars), reaction–diffusion (after Turing, 1952, converted to contours with marching squares for plotters), Reynolds' boids, differential growth and the space-colonisation algorithm. Plotter art goes back to pioneers such as Jean-Pierre Hébert.
- **Textiles:** kente, adinkra stamping, suzani, Fair Isle, Seminole patchwork, azulejo and cement tiles. Mid-century prints such as Lucienne Day's *Calyx* (1951) used spidery, doodle-like stems.
- **Celtic ornament:** George Bain sorted it into three methods (knotwork, spirals and key patterns), each built on a grid.

Sources are listed in section 12.

## 3. Ground rules (in addition to SHAPES_PLAN.md)

1. **Unique, permanent function names.** Every name in section 5 has been checked against today's `FORMS_BY_ID` (see section 9). Once a form ships, its name is permanent.
2. **Deterministic.** Use `ctx.rand`, `ctx.between`, `ctx.int` and `ctx.pick` only. Simulations seed from `ctx.rand` and run a fixed number of steps.
3. **At least three seeded variables per form,** such as grid size, symmetry order, palette rotation, ground, density, crop or a rule parameter.
4. **Palette only.** Get colours from `hues(ctx, n, [bg])` so shapes never match the ground, and use `ground(ctx)` or `ctx.ink`/`ctx.colors[1]` for the field. Don't hard-code hex values. Every form must read in both `dark` and `light`.
5. **Framed abstract style.** Pattern and abstract forms call `panel(ctx, bg)` first, so everything is clipped to the frame, as in the Abstract round.
6. **Piece budget.** Each form needs 3 to 150 parts. At least half of its seeds should come in at 45 parts or fewer, so it can be played as a puzzle. Bundle small marks with `batcher()` or `dotField()`. Use a single part only for the ground.
7. **Time budget.** This is new. A median `compose()` must take 8 ms or less, and none may take more than 40 ms, on the test machine. Simulations (reaction–diffusion, growth, DLA, sandpile) run on small grids of about 48 x 76 cells with step caps.
8. **Respectful interpretation.** These are original pieces in the spirit of a tradition, not reproductions:
   - Don't copy a specific artwork. Take the method, not the picture.
   - Display names describe what you see ("serrated diamonds", "pendulum web"), never a person, a people or a trademark. This matches the existing forms.
   - Leave out sacred or restricted imagery: Aboriginal dot painting and Dreaming designs, Tibetan sand mandalas, Diné sandpaintings, real family crests (*kamon*), named adinkra or nsibidi symbols with specific meanings, and anything shaped like a swastika or *manji* (so no sayagata).
   - Don't draw script or letters that could be read as words. "Calligraphic" forms use gesture only.
9. **No counts** anywhere a user can see them, as stated at the top.

## 4. Categories

| Category | Change | Families added |
|---|---|---|
| `geometric` (Geometry) | Grows | Tilings and tessellations; Curves and fractals |
| **`patterns` (Patterns)** | **New** | Islamic and Persian geometry; East and South Asia; Textiles of Africa, the Americas and Europe; Ornament through the ages. `abstract-world.js` is also listed here, and stays in Abstract. |
| `abstract` (Abstract) | Grows | Kinetic and light; Concrete and constructivist; Systems and early computer art; Spirit, craft and decoration; Simulation and growth; Global modernisms |

**Why a new Patterns category:** these forms are repeat patterns, not single compositions, and Abstract already has eight families. Splitting them out keeps the Abstract and Patterns decks each feeling varied. A form may belong to two categories: `ALL` is de-duplicated with a `Set`, and `compose()` consumes the same random number whichever pool it picks from, so listing `abstract-world` under both is safe for saved designs.

**Open decision:** if you'd rather not add a pill, put the four pattern families into `geometric` and `abstract` instead. Nothing else in this plan changes.

## 5. The catalog

Each table gives the function name, the display name returned, what inspired it, and how to build it, including what the seed varies.

### 5.1 Tilings and tessellations: `src/shapes/geometry-tilings.js` → `geometric`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `cairoTiling` | cairo tiling | Cairo street paving | Two overlaid hex lattices give pentagons. Seed varies cell size, colouring (by orientation or in stripes) and rotation. |
| `snubSquare` | snub square tiling | Archimedean 3.3.4.3.4 | Alternately rotated squares with triangles in the gaps. Seed varies scale, tilt and two- or three-colour fill. |
| `trihexagonal` | kagome tiling | Archimedean 3.6.3.6 | Hexagons with triangles at their corners. Seed varies the hexagon colour cycle and scale. |
| `rhombitrihex` | rhombitrihexagonal tiling | Archimedean 3.4.6.4 | Hexagons, squares and triangles. Seed varies which tile family is ink and the zoom. |
| `octagonSquares` | octagons and squares | Archimedean 4.8.8 | Octagons with small square keys. Seed varies the key colour, size and diagonal crop. |
| `snubHexagonal` | snub hexagonal tiling | Archimedean 3.3.3.3.6, chiral | Hexagons in triangle pinwheels. Seed varies handedness and the colour of each pinwheel. |
| `elongatedTriangular` | triangle and square bands | Archimedean 3.3.3.4.4 | Alternating rows of squares and triangles. Seed varies the row period and band colours. |
| `dodecagonTiling` | dodecagons and triangles | Archimedean 3.12.12 | Large dodecagons with triangle gaps. Seed varies the inner star motif. |
| `pinwheelTiling` | pinwheel tiling | Conway–Radin | Subdivides a 1:2 right triangle 2–4 times. Seed varies depth, colour by level or orientation, and the crop. |
| `ammannBeenker` | eight-fold tiling | Ammann–Beenker | Rhomb and square substitution from an octagon seed. Seed varies depth, centre and palette rotation. |
| `robinsonTriangles` | robinson triangles | Penrose P2 | Robinson triangles deflated into kites and darts, unlike `penrose`, which uses rhombs. Seed varies the sun or star start and colour by tile type. |
| `tumblingBlocks` | tumbling blocks | Rhombille (cube) tiling | Hexagons split into three rhombs, coloured as isometric cubes. Seed varies scale and which cubes turn over. |
| `basketweave` | basketweave paving | Brick paving | Pairs of bricks alternating in direction. Seed varies the number of bricks per pair, mortar colour and tilt. |
| `pythagoreanTiling` | two-square tiling | Pythagorean tiling | Interlocking large and small squares. Seed varies the size ratio and rotation. |
| `kiteTiling` | kite tiling | Deltoidal trihexagonal (dual of 3.4.6.4) | Kites meeting at sixfold points. Seed varies colour by orientation and scale. |
| `floretTiling` | floret tiling | Floret pentagonal tiling | Six pentagons around each point. Seed varies petal colouring and spin. |
| `prismaticPentagons` | prism pentagons | Prismatic pentagonal tiling | House-shaped pentagons in rows. Seed varies the row offset and gable height. |
| `interlockingTiles` | interlocking tiles | Escher-style translation tiles | Square tiles whose edges are deformed by a seeded curve and mirrored to the opposite edge. Seed varies the edge curve, colouring and scale. |
| `curvyHexTiles` | interlocking hexes | Heesch-type hexagon tiles | Hex edges with S-curves under rotation symmetry. Seed varies the curve, three-colouring and size. |
| `wangTiles` | wang tiles | Wang edge-matching tiles | Each tile is four edge triangles whose colours match their neighbours, solved row by row. Seed varies the tile set and grid. |
| `multiscaleTruchet` | multi-scale truchet | Carlson's winged Truchet tiles | Quadtree cells at three sizes with arc tiles that line up across scales. Seed varies split probability and inversion. |
| `spiralTiling` | spiral tiling | Similarity and Voderberg-style spiral tilings | Arms of similar triangles growing logarithmically from the centre. Seed varies the arm count, growth and handedness. |
| `chairTiling` | chair tiling | L-tromino substitution | Recursive L-shapes. Seed varies depth, colour by level and the crop. |
| `sphinxTiling` | sphinx tiling | Sphinx hexiamond substitution | Recursive sphinx shapes. Seed varies depth and orientation colouring. |
| `aztecDiamond` | aztec diamond | Random domino tilings and the arctic circle | Domino shuffling to order 10–14, coloured by the four domino orientations. Seed varies order and palette. |
| `planePartition` | stacked lozenges | Random lozenge tilings of a hexagon | Random plane partition shown as three rhomb shades. Seed varies the hexagon sides and fill. |

### 5.2 Curves and fractals: `src/shapes/geometry-math.js` → `geometric`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `apollonianGasket` | apollonian gasket | Descartes circle theorem | Circle packing to depth 4–5. Seed varies the starting circles, colouring by depth and the crop. |
| `fordCircles` | ford circles | Farey fractions | Circles tangent to a line, for fractions up to n. Seed varies n, the axis and mirroring. |
| `kochSnowflake` | koch snowflake | Koch curve | Nested snowflakes, or an anti-snowflake. Seed varies depth, layers and inward or outward steps. |
| `vicsekFractal` | cross fractal | Vicsek fractal | A recursive plus or saltire. Seed varies depth and the cross or X form. |
| `sierpinskiCarpet` | square carpet | Sierpiński carpet | Holes punched to depth 3–4. Seed varies hole colour by level and the start square. |
| `pythagorasTree` | pythagoras tree | Pythagoras tree | Squares on right triangles. Seed varies the angle, depth and lean. |
| `hTree` | h-tree | H-tree fractal | Recursive H strokes. Seed varies depth, the length ratio and stroke taper. |
| `levyCurve` | lévy curve | Lévy C curve | A turtle path from an L-system. Seed varies depth and colour by segment run. |
| `gosperCurve` | flowsnake | Gosper curve | A hex-based space-filling curve. Seed varies depth and splits it into coloured runs. |
| `peanoCurve` | peano curve | Peano curve | A 3 x 3 space-filling curve. Seed varies depth and line width. |
| `terdragon` | terdragon | Terdragon fractal | Three-way folding curve. Seed varies depth and copies around the centre. |
| `fourierEpicycles` | epicycles | Fourier series drawing | A chain of rotating circles tracing a closed curve. Seed varies the coefficients and how many circles are shown. |
| `chladniPlate` | chladni figure | Vibrating-plate nodal lines | Marching squares on `sin(nx)sin(my) ± sin(mx)sin(ny)`. Seed varies (n, m), sign and fill bands. |
| `timesTable` | times-table circle | Modular multiplication chords | Chords from k to k·m mod n make cardioid and nephroid envelopes. Seed varies m, n and colour cycles. |
| `curveStitching` | curve stitching | String-art parabolas | Envelopes of lines between pairs of axes. Seed varies the number of axes, density and colours. |
| `maurerRose` | maurer rose | Maurer rose | The rose r = sin(nθ) sampled every d degrees. Seed varies n and d. |
| `butterflyCurve` | butterfly curve | Fay's butterfly curve | A polar curve in layered strokes. Seed varies turns, scale and fill. |
| `cassiniOvals` | cassini ovals | Cassini ovals | A family of ovals through the lemniscate. Seed varies foci spacing, count and fill. |
| `hyperbolicDisc` | hyperbolic disc | Poincaré-disc {p,q} tilings | Triangle-group reflections to depth 3 with geodesic arcs. Seed varies (p, q) from a safe list and colouring. |
| `conformalGrid` | conformal grid | Complex mappings | A square grid under z², 1/z or a Möbius map. Seed varies the map, grid and colouring. |
| `juliaBands` | julia bands | Julia sets | Escape-time on a 60 x 95 grid, as 3–5 contour bands. Seed varies c from a pretty list, and the bands. |
| `newtonBasins` | newton basins | Newton fractal | Root basins of z³ − 1 or z⁴ − 1, grouped into cells. Seed varies the polynomial and zoom. |
| `torusKnot` | torus knot | (p, q) torus knots | A ribbon with over-under gaps. Seed varies (p, q), width and stripe. |
| `platonicSolids` | platonic solid | The five Platonic solids | A projected solid with shaded faces. Seed varies the solid, rotation and wireframe overlay. |
| `stairRing` | stair ring | Stair rings | A square staircase ring in isometric blocks that climbs and then descends. Seed varies the step count, rise and palette. |
| `pascalMod` | pascal's triangle | Pascal's triangle mod p | Hex cells coloured by C(n, k) mod p. Seed varies p (2–7) and the number of rows. |

### 5.3 Islamic and Persian geometry: `src/shapes/pattern-islamic.js` → `patterns`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `girihTiles` | girih tiles | The five girih tiles | A patch of decagon, bow-tie, hexagon, rhomb and pentagon tiles with their strap lines. Seed varies the patch, whether tile edges show, and the palette. |
| `hankinRosette` | polygons in contact | Hankin's method | Hankin rays on a 4.8.8 or 3.6.3.6 base grid. Seed varies the contact angle, grid and fill. |
| `zelligeStar` | zellige star | Moroccan zellige | A 16-point star with chiselled pieces in rings. Seed varies the star order (8, 12 or 16) and ring colours. |
| `starAndCross` | stars and crosses | Kashan star-and-cross tiles | Eight-point stars and crosses. Seed varies inner motifs and alternating colours. |
| `muqarnasPlan` | muqarnas plan | Muqarnas vault plans | Stepped radial cells seen from below. Seed varies tiers, cell type and shading. |
| `shamsa` | sunburst medallion | Shamsa illumination | A radiating petal medallion with a scalloped edge. Seed varies petal count, rings and halo. |
| `tenfoldRosette` | ten-fold rosette | Decagonal rosettes | A ten-fold rosette with petals and a star. Seed varies the inner star and petal depth. |
| `twelvefoldRosette` | twelve-fold rosette | Dodecagonal rosettes | A twelve-fold rosette on a hex repeat. Seed varies the repeat crop. |
| `strapworkKnot` | interlaced strapwork | Interlace bands | A star pattern drawn as bands with over-under gaps (needs `strap()`). Seed varies the base pattern and band width. |
| `mashrabiya` | lattice screen | Mashrabiya | A turned-bead lattice of circles and bars over a light ground. Seed varies bead spacing and window shape. |
| `jaliScreen` | pierced screen | Mughal jali | Hex-star piercings in a stone slab inside an arch. Seed varies the star and arch. |
| `brickMosaic` | brick mosaic | Banna'i glazed brick | Stepped diamonds of glazed bricks. Seed varies diamond nesting and glaze colours. No script and no swastika shapes. |
| `islimiScrolls` | scrolling vines | Islimi arabesque | Spiral vine scrolls with split palmettes, mirrored. Seed varies spiral turns and density. |
| `pointedArches` | pointed arches | Mihrab and iwan arches | Nested pointed arches, each filled with a sub-pattern. Seed varies the arch profile and fills. |
| `fourGardens` | four gardens | Chahar bagh garden plans | A quartered garden plan with channels and beds. Seed varies the subdivisions and the central pool. |
| `starKnot` | star knot | Seljuk brick knots | An interwoven eight-fold knot in brick tones. Seed varies the knot order and band width. |
| `nasridTiles` | nasrid tessellation | Alhambra "bird" tiles | A rotational tile with deformed edges in three colours. Seed varies the curve and scale. |
| `domeRosette` | dome rosette | Tiled domes seen from below | Rings of radiating panels shrinking to the centre. Seed varies the ring count and panel motif. |
| `lustreStars` | lustre stars | Kashan lustre tiles | Stars and crosses with inner swirls. Seed varies swirl direction and glaze colour. |
| `carpetMedallion` | carpet medallion | Persian carpet layout | A lozenge medallion, corner pieces and border bands. Seed varies the medallion shape and borders. |
| `borderBands` | border bands | Cartouche borders | Stacked borders of cartouches, beads and zigzags. Seed varies the band order and number. |
| `fivefoldStars` | five-fold stars | Pentagonal girih | Ten-point stars and pentagons. Seed varies the star depth. |
| `ninefoldStar` | nine-fold star | Rare nine-fold rosettes | A nine-point rosette. Seed varies rings and colouring. |
| `darbImam` | self-similar girih | Darb-i Imam pattern | Girih at two scales, the small pattern inside the large tiles. Seed varies which tiles subdivide. |
| `kundekari` | inlaid star panel | Ottoman kündekari | Interlocking wooden stars and lozenges with frames. Seed varies wood tones and the star. |
| `eightfoldLattice` | eight-fold lattice | Octagonal star lattices | Overlapping octagrams on a square grid. Seed varies the overlap and fills. |

### 5.4 East and South Asia: `src/shapes/pattern-asia.js` → `patterns`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `kikkoHexes` | tortoise shell | Kikkō | Hexes with inner hexes or flowers. Seed varies the inner motif, scale and colours. |
| `yagasuri` | arrow feathers | Yagasuri | Columns of chevron fletching. Seed varies column width, direction and two-tone. |
| `ichimatsu` | offset checks | Ichimatsu | Checks with occasional dyed squares and a stencil grain. Seed varies scale and accents. |
| `uroko` | scale triangles | Uroko | Triangle scales in rows. Seed varies size and the alternating pair. |
| `kagomeWeave` | basket weave star | Kagome bamboo weave | Three strip directions woven over and under. Seed varies the strip width and colours. |
| `tachiwaki` | rising steam | Tatewaku | Bulging wavy verticals with motifs in the pockets. Seed varies amplitude and motifs. |
| `kumikoSakura` | wooden lattice | Kumiko joinery | A triangular lattice with sakura or goma infills. Seed varies the infill per cell and the wood tone. |
| `crestRings` | crest rings | Kamon geometry | Invented crest-like roundels of rotated motifs, not real crests. Seed varies the motif and symmetry. |
| `rakedGravel` | raked gravel | Karesansui | Raked lines that ring around stones. Seed varies the stones and line spacing. |
| `iceRayLattice` | ice-ray lattice | Chinese ice-crack windows | Fracture lines spread from the edges in a frame. Seed varies density and the frame shape. |
| `ruyiClouds` | auspicious clouds | Ruyi cloud scrolls | Mirrored cloud heads with tails. Seed varies count and curl. |
| `thunderFret` | thunder fret | Leiwen square spirals | A frieze or field of square spirals. Seed varies turns and band arrangement. |
| `coinLattice` | coin lattice | Coin-and-square motifs | Overlapping coin circles with square holes. Seed varies overlap and tone. |
| `moonGate` | moon gate | Garden moon gates | A round opening with a lattice view through it. Seed varies the lattice and the scene bands. |
| `dancheong` | painted bands | Dancheong | Banded beams with lotus rosettes. Seed varies band order and rosette type. |
| `bojagi` | wrapping cloth | Bojagi | Translucent patches with seams. Seed varies patch splits and opacity. |
| `rangoliPetals` | rangoli | Rangoli powder designs | Radial coloured petals and dots. Seed varies symmetry (6, 8 or 12) and rings. |
| `ajrakh` | block print | Ajrakh resist print | Star lattice repeats in indigo and madder roles. Seed varies the lattice and border. |
| `bandhani` | tie-dye dots | Bandhani | Clusters of tiny squares-in-circles forming motifs. Seed varies the motif and density. |
| `phulkari` | darning stitch | Phulkari | Triangles and diamonds filled with satin-stitch hatching. Seed varies the motif grid and stitch angle. |
| `parangBatik` | diagonal batik | Parang | S-curve bands on a diagonal. Seed varies band width and the motif row. |
| `kawung` | four-oval cross | Kawung | Four ellipses around a dot, repeated. Seed varies the ellipse shape and dots. |
| `songketDiamonds` | brocade diamonds | Songket | Gold-thread diamonds on a deep ground. Seed varies nesting and border. |
| `prajamYam` | four-petal flowers | Thai prajam yam | A four-petal grid. Seed varies the petal shape and spacing. |
| `endlessKnot` | endless knot | Endless-knot interlace | An interlaced square knot. Seed varies the number of loops and band colours. |
| `jamdani` | sheer motifs | Jamdani weave | Small geometric motifs scattered on a sheer ground. Seed varies motifs, density and border. |

### 5.5 Textiles of Africa, the Americas and Europe: `src/shapes/pattern-textiles.js` → `patterns`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `stampedGrid` | stamped grid | Adinkra cloth layout | A ruled grid of invented stamped geometric motifs, not named symbols. Seed varies motifs and ruling. |
| `adireIndigo` | resist indigo | Adire | Resist-dyed squares with dots, spirals and lines. Seed varies the motif set and grid. |
| `waxPrint` | wax print | Wax-print textiles | Bold concentric circles and crackle. Seed varies the circle grid and colour pairs. |
| `berberLattice` | lozenge lattice | Beni Ourain rugs | A sparse lozenge net of dark lines on cream. Seed varies lozenge size and irregularity. |
| `tifaifaiQuilt` | appliqué quilt | Tifaifai | A radial cut appliqué in two colours. Seed varies the fold symmetry and leaf shape. |
| `huipilBands` | brocade bands | Huipil brocade | Bands of diamonds, zigzags and steps. Seed varies band order and colours. |
| `steppedCross` | stepped cross | Andean chakana | A stepped cross with a central circle. Seed varies the steps and border. |
| `tocapuSquares` | tocapu squares | Tocapu tunics | A grid of invented geometric glyph squares. Seed varies the glyph mix and arrangement. |
| `serratedDiamonds` | serrated diamonds | Eyedazzler weaving | Nested diamonds with toothed edges. Seed varies the nesting and tooth size. |
| `potteryBands` | banded pot | Painted pottery bands | A pot silhouette with stepped and checked bands. Seed varies the profile and bands. |
| `seminolePatchwork` | strip patchwork | Seminole patchwork | Strip-pieced bands of tiny diamonds and steps. Seed varies the band patterns. |
| `starQuilt` | star quilt | Lone Star quilt | A star of diamond pieces radiating out. Seed varies rings and colours. |
| `logCabin` | log cabin quilt | Log Cabin blocks | Blocks in light and dark halves, set as barn raising or straight furrows. Seed varies the setting. |
| `drunkardsPath` | quarter-circle quilt | Drunkard's Path | Quarter-circle blocks. Seed varies the arrangement and colours. |
| `flyingGeese` | flying geese | Flying Geese blocks | Rows of triangle units. Seed varies direction and the number of rows. |
| `crazyQuilt` | crazy quilt | Victorian crazy quilts | Irregular polygons with stitched seams. Seed varies splits and stitch types. |
| `houndstooth` | houndstooth | Houndstooth check | A broken check. Seed varies scale and colours. |
| `argyle` | argyle | Argyle knit | Diamonds with an over-check. Seed varies the diamond ratio and lines. |
| `paisleyBoteh` | paisley | Boteh | Paisley drops with inner bands in a staggered repeat. Seed varies size and inner patterns. |
| `fairIsle` | knitted bands | Fair Isle | Pixel bands of peeries and stars (row-batched). Seed varies band order and colours. |
| `knittedStar` | knitted star | Selbu star | An eight-petal pixel star. Seed varies the star and lice dots. |
| `cableKnit` | cable knit | Aran cables | Braided cables with seed-stitch panels. Seed varies the cable types. |
| `eggBands` | painted egg | Pysanka bands | An egg outline with geometric bands of triangles and waves. Seed varies the band division. |
| `crossStitchRhombs` | cross-stitch rhombs | Folk cross-stitch | Two-colour rhombs in stitch pixels. Seed varies the motif and border. |
| `azulejoTiles` | azulejo tiles | Portuguese azulejo | A 2 x 2 tile repeat of quarter motifs. Seed varies the motif and grout. |
| `cementTiles` | cement tiles | Encaustic cement tiles | Quartered tiles forming larger rosettes. Seed varies the tile and the rotation scheme. |

### 5.6 Ornament through the ages: `src/shapes/pattern-ornament.js` → `patterns`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `celticKnot` | knotwork panel | Celtic knotwork | Grid-based plait with breaks (needs `strap()`). Seed varies the grid and break pattern. |
| `celticSpiral` | triple spirals | Celtic spirals | Linked triskeles. Seed varies the number of spirals and their turns. |
| `celticKey` | key pattern | Celtic key patterns | Diagonal key paths on a grid. Seed varies density and border. |
| `meander` | meander | Greek key | A meander border frame or field. Seed varies the key type and bands. |
| `eggAndDart` | egg and dart | Classical moulding | Moulding bands stacked. Seed varies the band types. |
| `opusSectile` | cut-stone floor | Roman opus sectile | Large geometric stone inlays. Seed varies the layout and stone tones. |
| `cosmati` | cosmati pavement | Cosmatesque floors | Linked roundels with triangle mosaics. Seed varies the roundel chain and fills. |
| `roseWindow` | rose window | Gothic rose windows | Radial tracery with lights. Seed varies symmetry and petal type. |
| `gothicTracery` | tracery | Gothic tracery | Lancets topped with foils. Seed varies the lancets and foils. |
| `quatrefoil` | quatrefoil lattice | Quatrefoil | A lattice of quatrefoils. Seed varies scale and colours. |
| `trellis` | trellis | Garden trellis | A diagonal trellis with rosettes at the crossings. Seed varies spacing and rosettes. |
| `damask` | damask | Damask weave | A mirrored flourish in an ogee lattice. Seed varies the flourish. |
| `ogeeLattice` | ogee lattice | Ogee | Onion-shaped lattice cells. Seed varies cell proportion and fill. |
| `prairieWindow` | prairie window | Prairie School leaded glass | A rectilinear leaded panel with small coloured squares. Seed varies the layout. |
| `glasgowRose` | stylised rose | Glasgow style | Concentric squared roses on long stems. Seed varies the number of roses and stems. |
| `decoSetbacks` | stepped tower | Art Deco setbacks | A stepped ziggurat with ribs and rays. Seed varies the steps and rays. |
| `decoFountain` | frozen fountain | Art Deco fountain motif | Fanned stepped jets. Seed varies jets and tiers. |
| `streamline` | speed lines | Streamline Moderne | Horizontal speed lines around rounded forms. Seed varies the forms and the number of lines. |
| `harlequin` | harlequin | Harlequin diamonds | A diamond lattice with lines. Seed varies the diamond ratio and colours. |
| `spindleBlooms` | spindle flowers | 1950s textile prints | Spidery stems with cup heads. Seed varies stems and heads. |
| `gingham` | gingham | Gingham check | Translucent crossing stripes in two colours. Seed varies scale. |
| `sgraffito` | sgraffito | Scratched plaster | Scratched geometric lines through a top coat. Seed varies the pattern and coats. |
| `parquetry` | parquetry | Versailles parquet | Panel parquet blocks. Seed varies the panel pattern and wood tones. |
| `marquetryStar` | inlaid star | Marquetry compass stars | Shaded diamond-point stars. Seed varies point count and tones. |
| `compassRose` | compass rose | Chart compass roses | A 16- or 32-point rose with rings. Seed varies points and rings. |
| `heraldicField` | heraldic field | Heraldic divisions | Field divisions (per bend, chevron, quarterly, gyronny) with ordinaries. These are invented arms only. Seed varies division and tinctures. |

### 5.7 Kinetic and light: `src/shapes/abstract-kinetic.js` → `abstract`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `vibratingWires` | vibrating wires | Soto | Thin vertical lines in front of a fine stripe ground, with hanging rods. Seed varies the rod count and stripe pitch. |
| `colorSlats` | colour slats | Cruz-Diez physichromies | Thin coloured fins on bands that create in-between colours. Seed varies band order and fin spacing. |
| `inductionBands` | induction colour | Cruz-Diez induction | Stripes crossing colour blocks that change colour where they cross. Seed varies blocks and stripe pitch. |
| `chromaInterference` | chromatic interference | Cruz-Diez chromointerference | Two stripe sets slightly out of phase. Seed varies the phase drift and colours. |
| `agamograph` | two-way picture | Agam | Two interleaved compositions on alternating folds. Seed varies both compositions. |
| `scatteredSquares` | scattered reflections | Le Parc continual light | A field of small squares offset by a wave. Seed varies the wave and density. |
| `lightModulator` | light modulator | Moholy-Nagy | Overlapping translucent discs and perforated plates. Seed varies the plates. |
| `stringConstruction` | string construction | Gabo | Chords between two curves forming a ruled surface. Seed varies the curves and density. |
| `aluminiumRelief` | metal relief | Alviani | A grid of squares with stripes that change by angle. Seed varies the angle field. |
| `studdedRelief` | studded relief | Castellani | A grid of bumps with a light half and a shadow half. Seed varies the grid offset and light angle. |
| `swollenCanvas` | stretched bulges | Bonalumi | Blobs with highlight crescents. Seed varies the blobs. |
| `mirrorFragments` | mirror fragments | Megert | Angled shards that reflect other parts of the palette. Seed varies the shard layout. |
| `reliefCells` | relief cells | Schoonhoven | A grid of cells with shadow edges. Seed varies the cell shape and light. |
| `wireNet` | wire net | Gego's reticulárea | An irregular net of triangles and quads in lines. Seed varies nodes and tension. |
| `lightRelief` | light ripples | Mack | Silver vertical ripple bands. Seed varies ripple frequency and groups. |
| `luminoDynamic` | turning planes | Schöffer | Overlapping coloured planes at stepped rotations. Seed varies planes and steps. |
| `kineticDiscs` | colour discs | Palatnik kinechromatics | Soft overlapping discs in motion arcs. Seed varies the discs and arcs. |
| `canvasHoles` | rows of holes | Dadamaino's *Volumi* | Rows of ellipse holes showing an inner ground. Seed varies hole size and rows. |
| `glowingDisc` | glowing disc | Irwin's discs | A disc with four soft shadow petals. Seed varies the shadow strength and size. |
| `strobeRods` | strobe rods | Tsai | Vertical wavy rods. Seed varies the wave and the rod count. |
| `louvres` | louvres | Agam and Cruz-Diez louvres | Panels whose two faces show different colours. Seed varies the angle and colours. |
| `lensGrid` | lens grid | Refraction pieces | Circles that shift the stripe behind them. Seed varies the lens grid and shift. |
| `lenticularRibs` | lenticular ribs | Lenticular prints | Ribs showing two gradients. Seed varies the rib pitch. |
| `interwovenOptics` | interwoven stripes | Op weaves | Two stripe fields interweaving. Seed varies the weave. |
| `lightCurtain` | light curtain | Strand curtains | Vertical translucent strands. Seed varies density and sway. |
| `perforatedPlate` | perforated plate | Layered perforations | A hole grid over an offset second grid. Seed varies the offset and pitch. |

### 5.8 Concrete and constructivist: `src/shapes/abstract-concrete.js` → `abstract`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `serialColumns` | serial columns | Lohse | Vertical columns stepping through a colour series. Seed varies the series and widths. |
| `colorRows` | colour rows | Lohse | A grid whose colours shift diagonally. Seed varies the shift rule. |
| `relationBlocks` | proportional blocks | Vantongerloo | Blocks sized by a ratio sequence. Seed varies the ratios. |
| `unistRelief` | even field | Strzemiński's Unism | An even textured field with curvilinear forms. Seed varies the forms. |
| `spatialComposition` | spatial composition | Kobro | Interlocking planes drawn isometrically. Seed varies the planes. |
| `lineConstruction` | ruler and compass | Rodchenko line works | Ruler and compass lines with arcs. Seed varies the construction. |
| `spaceForce` | space-force construction | Popova | Overlapping translucent wedges and arcs. Seed varies the wedges. |
| `constructivistTextile` | constructivist textile | Stepanova and Popova textiles | Circle and bar repeats. Seed varies the repeat. |
| `dynamicCity` | dynamic city | Klutsis | Floating cubes and arcs around a centre. Seed varies the cubes and arcs. |
| `structuralConstellation` | impossible lines | Albers' *Structural Constellations* | Ambiguous line figures. Seed varies the figure. |
| `transparentPlanes` | transparent planes | Moholy-Nagy | Overlapping translucent bars and circles. Seed varies the layers. |
| `colorStar` | colour star | Itten | A twelve-pointed colour star. Seed varies the star and tints. |
| `articulatedPlanes` | articulated planes | Arte Madí | A hinged irregular frame of coloured planes. Seed varies the hinges. |
| `coplanal` | separate planes | Coplanal | Separate coloured planes on a wall. Seed varies the planes. |
| `metaschema` | metaschema | Oiticica | Tilted rectangles in a grid. Seed varies the tilts. |
| `goldThreads` | gold threads | Pape's *Ttéia* | Diagonal beams of light threads. Seed varies the beams. |
| `diagonalFunction` | diagonal function | Geraldo de Barros | A diagonal line structure. Seed varies the function. |
| `modulatedSurface` | modulated surface | Lygia Clark | Black and white surfaces with organic lines. Seed varies the lines. |
| `universalGrid` | universal grid | Torres-García | An irregular grid of simple invented glyphs. Seed varies the grid and glyphs. |
| `colorRhythm` | colour rhythm | Graeser | Rhythmic coloured bars. Seed varies the rhythm. |
| `rotatedBands` | rotated bands | Loewensberg | Bands rotated against the frame. Seed varies the rotation. |
| `scatteredBars` | scattered bars | Van der Leck | Dispersed coloured bars on white. Seed varies the bars. |
| `asymmetricPlanes` | asymmetric planes | Vordemberge-Gildewart | Asymmetric planes and lines. Seed varies the layout. |
| `stijlWindow` | stained grid | Huszár's glass | A De Stijl stained-glass grid. Seed varies the grid. |
| `bauhausWeaving` | woven blocks | Anni Albers and Stölzl | Rectangles built from thread stripes. Seed varies the blocks. |
| `pictureArchitecture` | picture architecture | Kassák | Stacked planes like a building. Seed varies the planes. |

### 5.9 Systems and early computer art: `src/shapes/abstract-systems.js` → `abstract`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `fourDirections` | four directions | LeWitt line drawings | Lines in four directions layered by quadrant. Seed varies the layering. |
| `arcsAndLines` | arcs and lines | LeWitt arc drawings | Arcs from the sides and corners. Seed varies the origins. |
| `isometricWashes` | isometric washes | LeWitt isometric figures | Ink-wash planes of an isometric figure. Seed varies the figure. |
| `bandsOfLines` | bands of lines | LeWitt's Wall Drawing 63 | Four bands combining line directions. Seed varies the combinations. |
| `gaussianZigzag` | gaussian zigzag | Noll | A zigzag line with seeded x positions. Seed varies the spread. |
| `plusMinus` | plus and minus | Noll | Short bars in a soft oval. Seed varies density. |
| `walkThroughRaster` | walk-through raster | Nake | Hatches filling the cells of a grid. Seed varies the walk. |
| `homageBands` | banded homage | Nake | Horizontal bands of lines and circles. Seed varies the bands. |
| `markovPainting` | markov painting | Kawano | A coloured grid produced by a Markov chain. Seed varies the transitions. |
| `symbolMosaic` | symbol mosaic | Knowlton and Harmon | Tiny symbol tiles forming a gradient blob. Seed varies the blob. |
| `sineWarp` | sine warp | Csuri | Lines warped by sine curves. Seed varies the warp. |
| `permutationDots` | permutation dots | Whitney | Dots on circles moving at harmonic speeds. Seed varies the harmonics. |
| `polygonWalk` | random polygons | Nees | A grid of random 23-corner polygons. Seed varies the polygons. |
| `randomSquares` | random distribution | Morellet | Squares in two colours chosen by digits. Seed varies the digits. |
| `piLines` | pi lines | Morellet | Lines angled by successive digits. Seed varies the start. |
| `loopRows` | loop rows | Darboven | Rows of handwritten-looking loops. Seed varies the loops. |
| `fixedStripes` | fixed stripes | Buren | Equal stripes with one cut panel. Seed varies the cut. |
| `brushImprints` | brush imprints | Toroni | Regular brush marks. Seed varies spacing. |
| `serialProject` | serial project | LeWitt's *Serial Project #1* | A grid of squares-in-squares variations. Seed varies the series. |
| `fourColorMap` | four-colour map | The four colour theorem | A planar map coloured with four colours. Seed varies the map. |
| `xorPattern` | xor pattern | Bitwise art | Cells lit by (x ^ y) & mask. Seed varies the mask. |
| `langtonAnt` | langton's ant | Langton's ant | Ant trails on a grid. Seed varies the rules. |
| `sandpile` | sandpile | Abelian sandpile | A coloured sandpile pattern. Seed varies the grain count. |
| `dlaCluster` | aggregation | Diffusion-limited aggregation | A grown cluster. Seed varies the seed points. |
| `punchCard` | punched card | Punched cards | A grid of holes. Seed varies the holes. |
| `teletextMosaic` | teletext blocks | Teletext graphics | 2 x 3 block mosaic. Seed varies the image. |

### 5.10 Spirit, craft and decoration: `src/shapes/abstract-decorative.js` → `abstract`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `primordialPetals` | primordial petals | af Klint's *The Ten Largest* | Big pastel petals, spirals and rosettes. Seed varies the petals. |
| `altarpiece` | altarpiece | af Klint's altarpieces | A triangle with a sun disc and arcs. Seed varies the arcs. |
| `dualityDiscs` | duality discs | af Klint | Mirrored half-dark, half-light circles. Seed varies the discs. |
| `circlesAndBars` | circles and bars | Taeuber-Arp | Circles with bars. Seed varies the arrangement. |
| `verticalHorizontal` | vertical-horizontal | Taeuber-Arp | Grid compositions of rectangles. Seed varies the grid. |
| `simultaneousFabric` | simultaneous fabric | Sonia Delaunay textiles | Strips with half-discs. Seed varies the strips. |
| `dabRings` | concentric dabs | Alma Thomas | Rings of colour dabs. Seed varies the rings. |
| `dabColumns` | dab columns | Alma Thomas | Columns of vertical colour dabs. Seed varies the columns. |
| `pendulumWeb` | pendulum web | Emma Kunz | A radial web of lines on grid paper. Seed varies the web. |
| `luminousPeak` | luminous peak | Pelton | A glowing orb above soft forms. Seed varies the forms. |
| `wrappedBundles` | wrapped bundles | Sheila Hicks | Wrapped yarn bundles. Seed varies the bundles. |
| `polyphony` | polyphony | Klee's *Ad Parnassum* | Dotted layered squares over a coloured grid. Seed varies the layers. |
| `castleAndSun` | castle and sun | Klee | Stacked shapes forming a town. Seed varies the stacking. |
| `smallLandscape` | small landscape | Etel Adnan | A small square, ochre bands and a sun dot. Seed varies the landscape. |
| `interlacedBands` | interlaced bands | Jaudon | Architectural interlace. Seed varies the interlace. |
| `ornamentSampler` | ornament sampler | Kozloff | A grid of different ornaments. Seed varies the mix. |
| `femmageFan` | collage fan | Schapiro's femmage | A fan collaged from patterned segments. Seed varies the segments. |
| `stripSampler` | print strips | MacConnel | Vertical strips of different prints. Seed varies the strips. |
| `beadedBands` | beaded bands | Loom beadwork | Pixel bands of beads. Seed varies the bands. |
| `tapestryBlocks` | tapestry blocks | Slit tapestry | Blocks with diagonal hatching. Seed varies the blocks. |
| `foldedPaperCut` | folded paper cut | Wycinanki papercuts | Folded, symmetric radial cut-outs. Seed varies folds and cuts. |
| `omegaPanels` | painted panels | Omega Workshops | Colour blocks with brushy marks. Seed varies the blocks. |
| `roundedHills` | rounded hills | Tarsila do Amaral | Rounded hills with cactus geometry. Seed varies the hills. |
| `littleImages` | little images | Krasner's *Little Image* | A dense grid of small glyph marks. Seed varies the marks. |
| `loopedWire` | looped wire | Ruth Asawa | Hanging lobed forms. Seed varies the lobes. |
| `boxedAssemblage` | boxed assemblage | Nevelson | Monochrome boxes holding forms. Seed varies the boxes. |

### 5.11 Simulation and growth: `src/shapes/abstract-growth.js` → `abstract`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `reactionDiffusion` | turing spots | Gray–Scott model | Gray–Scott on a 48 x 76 grid, drawn as contours. Seed varies feed and kill from a spots list, and the bands. |
| `turingStripes` | labyrinth stripes | Gray–Scott model | The same model with maze parameters. Seed varies the parameters. |
| `differentialGrowth` | differential growth | Differential growth | A curve that grows and buckles over a fixed number of steps. Seed varies the steps and repulsion. |
| `lSystemPlant` | l-system bush | Lindenmayer systems | A turtle-drawn bush from a rule set. Seed varies the rules and angle. |
| `spaceColonization` | branching veins | Space-colonisation algorithm | Branches grow toward attractor points. Seed varies the attractors. |
| `lloydCells` | relaxed cells | Lloyd relaxation | Voronoi cells after relaxation. Seed varies the iterations. |
| `delaunayMesh` | low-poly mesh | Delaunay triangulation | A triangulation coloured by gradient. Seed varies the points. |
| `metaballs` | metaballs | Metaballs | Marching squares on summed falloffs. Seed varies the balls. |
| `waveCollapse` | wave function collapse | Wave function collapse | Pipe and road tiles placed under constraints. Seed varies the tile set. |
| `flockTrails` | flocking trails | Reynolds' boids | Boid paths. Seed varies the flock. |
| `slimeMould` | slime mould | Physarum agents | Agent trails. Seed varies the agents. |
| `snowflakeAutomaton` | hex snowflake | Reiter's hexagonal automaton | Snowflake growth on a hex grid. Seed varies the parameters. |
| `lichenGrowth` | lichen | Eden growth | A growing cluster coloured by age. Seed varies the growth. |
| `weightedStipple` | weighted stipple | Poisson-disc stippling | Dots weighted by a gradient. Seed varies the gradient. |
| `hatchShading` | cross-hatch shading | Hatching | A hatch field whose direction follows noise. Seed varies the noise. |
| `islandMap` | island map | Noise terrain | Thresholded noise with beach bands. Seed varies the terrain. |
| `mudCracks` | mud cracks | Crack networks | Jagged Voronoi cracks. Seed varies the cells. |
| `geodesicSphere` | geodesic sphere | Icospheres | A projected icosphere. Seed varies subdivision and rotation. |
| `ribbonSweep` | swept ribbon | Swept ribbons | A shaded ribbon along a noisy path. Seed varies the path. |
| `nailThread` | nail and thread | String art | Thread lines between nails on a circle. Seed varies the threading. |
| `shardSplits` | recursive shards | Recursive subdivision | Polygons split along random lines. Seed varies the splits. |
| `smoothUnion` | soft union | Signed distance fields | A smooth union of shapes with offset outlines. Seed varies the shapes. |
| `orbitTrails` | orbit trails | Gravitational orbits | Particle trails around attractors. Seed varies the attractors. |
| `domainWarp` | warped bands | Domain warping | Bands of warped noise. Seed varies the warp. |
| `noiseSpiral` | plotter spiral | Spiral plotter drawings | A single spiral whose radius follows noise. Seed varies the noise. |
| `orderedDither` | dithered gradient | Bayer dithering | Ordered dither of a shape in big blocks. Seed varies the shape. |

### 5.12 Global modernisms: `src/shapes/abstract-global.js` → `abstract`

| Function | Display name | Inspiration | Build / seed varies |
|---|---|---|---|
| `bindu` | bindu | Raza | A dark circle with concentric squares and triangles. Seed varies the rings. |
| `electricCircles` | bulbs and wires | Atsuko Tanaka | Circles joined by lines. Seed varies the network. |
| `stoneAndPlate` | stone and glass | Mono-ha | A stone on a cracked plate. Seed varies the cracks. |
| `ecritureRidges` | pencil ridges | Dansaekhwa | Rows of pencil ridges. Seed varies the rows. |
| `fadingPoints` | fading points | Lee Ufan | Dabs that fade along a row. Seed varies the fade. |
| `starDotGrid` | dot cosmos | Kim Whanki | A blue dot grid. Seed varies density. |
| `mirrorMosaic` | mirror mosaic | Monir Farmanfarmaian | Hexagonal mirror-mosaic reliefs. Seed varies the hexagons. |
| `talismanGrid` | charm grid | Saqqakhaneh school | A grid of invented charm glyphs. Seed varies the glyphs. |
| `interlockedPlanes` | interlocked planes | Mérida | Flat interlocking planes. Seed varies the planes. |
| `capTapestry` | bottle-cap tapestry | El Anatsui | Stitched metal pieces. Seed varies the pieces. |
| `uliLines` | spare lines | Uli painting | Sparse curvilinear lines. Seed varies the lines. |
| `jewelFracture` | fractured jewel | Fahrelnissa Zeid | Kaleidoscopic fractured colour cells. Seed varies the cells. |
| `stackedModules` | stacked modules | Choucair | Interlocking modules. Seed varies the modules. |
| `faintVectors` | faint vectors | Nasreen Mohamedi | Fine ruled lines meeting at diagonals. Seed varies the lines. |
| `glyphGlow` | sign field | Gaitonde | A luminous layered field with small signs. Seed varies the signs. |
| `pinprickLines` | pinprick map | Zarina | Pinpricks and lines. Seed varies the map. |
| `saetaLines` | fine lines | Zóbel | Fine lines on a pale ground. Seed varies the lines. |
| `inkStorm` | ink storm | Zao Wou-Ki | A gestural colour storm. Seed varies the storm. |
| `textureMoon` | paper moon | Liu Kuo-sung | A paper-textured cosmos with a sphere. Seed varies the texture. |
| `infinityNets` | infinity nets | Kusama's *Infinity Nets* | A scalloped loop net. Seed varies the net. |
| `openLattice` | open lattice | Araeen | A lattice of open cubes. Seed varies the lattice. |
| `rootsGrid` | roots grid | Shemza's *Roots* | Circles and rectangles (no letters). Seed varies the grid. |
| `carnivalLayers` | carnival layers | Milhazes | Layered circles, flowers and stripes. Seed varies the layers. |
| `emblematicTotem` | emblem totem | Rubem Valentim | Symmetric geometric emblems. Seed varies the emblems. |
| `drapedColor` | draped colour | Gilliam | Folds of stained colour. Seed varies the folds. |
| `tesseraeSlabs` | paint tesserae | Whitten | A mosaic of cut paint tiles. Seed varies the tiles. |

## 6. Engine and kit helpers to add first

Add these before any family that needs them, each with a unit check in `scripts/check-art.js`. Put pattern-wide helpers in a new `src/shapes/pattern-kit.js`. It can re-export `abstract-kit.js`.

| Helper | Signature (sketch) | Used by |
|---|---|---|
| `lattice` | `lattice(kind, cell, area, fn)` where `kind` is `square`, `hex`, `tri`, `kagome` or `4.8.8`, and `fn` gets centres, vertices and parity | Tilings, wagara, Islamic, quilts |
| `substitute` | `substitute(tiles, rules, depth)` → polygons with type and level | Pinwheel, chair, sphinx, Ammann–Beenker, Penrose P2 |
| `hankin` | `hankin(polygons, angle, delta)` → segments | Every Islamic star form, `kumikoSakura` |
| `strap` | `strap(ctx, segments, width, color, gap)` | Over-under interlace: `strapworkKnot`, `celticKnot`, `endlessKnot`, `torusKnot`, `kagomeWeave` |
| `lsystem` / `turtle` | `lsystem(axiom, rules, n)` → string; `turtle(str, step, angle)` → polylines | Lévy, Gosper, Peano, terdragon, `lSystemPlant` |
| `marching` | `marching(field, w, h, threshold)` → closed polygons | Chladni, Julia, Newton, reaction–diffusion, metaballs, `islandMap` |
| `poisson` | `poisson(ctx, area, r, k = 20)` | Stipple, mosaics, `mudCracks`, `delaunayMesh` |
| `voronoiCells`, `delaunay` | Lift `clipHalf` out of `more-art.js` and add Bowyer–Watson | `lloydCells`, `delaunayMesh`, `fourColorMap`, `mudCracks` |
| `smoothPath` | A private `smoothPath(points)` already exists in `faces.js`. Move it to the kit, add a `closed` option and import it back into `faces.js`, so its output stays the same | Ribbons, growth, vines, spindle blooms |
| `hatch` | `hatch(ctx, poly, angle, gap, color, width)`, clipped with a `clipPath` def | `phulkari`, `hatchShading`, `walkThroughRaster`, `tapestryBlocks` |
| `pixelRows` | `pixelRows(ctx, grid, area, colorFn)`, with one part per row band | Fair Isle, knitted star, cross-stitch, teletext, dither, beads |
| `dihedral` | `dihedral(ctx, n, mirror, fn)` | Rosettes, rangoli, papercuts, medallions |
| `simGrid` | `simGrid(w, h)` with `Float32Array` fields and a seeded fill | Reaction–diffusion, sandpile, DLA, Langton, snowflake |

`check-art` tests for helpers:
- `substitute` and `hankin` return finite coordinates.
- `marching` closes every contour.
- `strap` alternates over and under at every crossing.

## 7. Tests and quality gates

1. **Register the new files** in `NEW_FORMS` in `scripts/check-art.js`, so the frame, ceiling and puzzle rules apply to them.
2. **Add a time budget.** Time every `compose()` in the per-form loop. Fail when a form's median is over 8 ms or any single run is over 40 ms. Run it in Node 20, and add a `--slow` flag to print the slowest forms.
3. **Add a variety check.** Compute a cheap visual fingerprint (part count plus a rounded bounds histogram) for seeds 1–40. Fail when fewer than 8 of them are distinct, which catches forms that ignore their seed.
4. **Add a ground-contrast check.** Every part whose fill equals the panel `bg` must be a deliberate cut-out, so count them and warn above 20%. This extends the "never match the ground" rule from the Abstract round.
5. **Review contact sheets by family:** `node scripts/contact-sheet.js $(node -e "console.log(Object.keys(require('./src/shapes/pattern-islamic')).join(' '))") --seeds 8`. Review both themes at the Explorer size, and fix anything muddy, empty or clipped before merging.
6. **Update `shipped-forms.json`.** After each release, append the new ids. They can never be removed after that.
7. **Run `check-deck.js`.** Add a case that adds a new category mid-round, and check that the `patterns` bag starts cleanly.

## 8. Registry, settings and docs

For each family:

1. Create `src/shapes/<family>.js` with a header comment listing its forms in words, as the `abstract-*.js` files do.
2. Require the file in `src/forms.js`. Add it to its category with `...Object.values(file)`, appending only.

When adding the `patterns` category:

- Add `patterns: [...patternIslamic, ...patternAsia, ...patternTextiles, ...patternOrnament, ...Object.values(abstractWorld)]` to `CATEGORIES`. Spread with `Object.values()` as Abstract does.
- Add `CATEGORY_LABELS.patterns = 'Patterns'`, placed after `geometric`.
- In `package.json`, add `patterns` to the `artify.explorerShapes` `enum` and `enumDescriptions`, as "Tilings, ornament and textile patterns from around the world".
- In the README:
  - Add **Patterns** to the category list and to the settings table.
  - Extend the Geometry and Abstract lines in words.
  - Don't give counts.
- In the CHANGELOG, describe the families without counts, as the 0.12.0 entry does.

## 9. Name check

All 312 function names in section 5 were checked against today's registry (`FORMS_BY_ID`), against every top-level function under `src/shapes/` and against each other, and none collide. Of the helper names in section 6, only `smoothPath` already exists, and section 6 says how to reuse it. Re-run the check before each family lands:

```bash
node -e "
const { ALL } = require('./src/forms');
const have = new Set(ALL.map(f => f.name));
const plan = require('fs').readFileSync('PATTERNS_PLAN.md','utf8').match(/^\| \x60([a-zA-Z0-9]+)\x60 \|/gm).map(s => s.slice(3,-3));
const dupes = plan.filter((n,i) => plan.indexOf(n) !== i);
console.log('planned', plan.length, 'taken', plan.filter(n => have.has(n)), 'dupes', dupes);
"
```

## 10. Rollout

Ship in four releases, so each one is reviewable and the deck keeps feeling new. Each family is its own PR: helpers, then the file, contact sheet, registry and `npm test`.

| Release | Content | Helpers first |
|---|---|---|
| **0.13.0** | Tilings and tessellations, Curves and fractals (Geometry) | `lattice`, `substitute`, `lsystem`/`turtle`, `marching` |
| **0.14.0** | New **Patterns** category: Islamic and Persian; East and South Asia; Textiles; Ornament | `hankin`, `strap`, `dihedral`, `hatch`, `pixelRows` |
| **0.15.0** | Kinetic and light, Concrete and constructivist, Systems and early computer art (Abstract) | `simGrid`, `poisson` |
| **0.16.0** | Spirit, craft and decoration; Simulation and growth; Global modernisms (Abstract) | `voronoiCells`/`delaunay`, `smoothPath` |

Each PR is done when:

- `npm test` passes, including the new time and variety checks.
- The contact sheet has been reviewed in both themes.
- No form has a name that is already taken.
- The README and CHANGELOG are updated with no counts.
- `shipped-forms.json` is updated in the release commit.

**Effort:** a family of 26 takes about two to three focused days, including review. The helper work for 0.13.0 and 0.14.0 adds about two days each.

## 11. Artify Web follow-up

Artify Web (`/home/murtazabaig/fun-projects/artify-web`) imports the engine and doesn't fork it.

1. After each extension release, rebuild the engine bundle (`scripts/build-engine.mjs`, which writes `src/vendor/artify-engine.js`).
2. The Patterns pill appears on its own, because the pills come from `CATEGORY_LABELS`. Check that the pill row still scrolls cleanly at 360 px and that every pill keeps a 44 x 44 px touch target.
3. Bump the PWA cache version so returning visitors get the new bundle.
4. Run the Playwright suite. Add one test that opens Patterns and reforms a few times without errors.
5. Check the slowest forms (from `check-art --slow`) on a mid-range Android phone. The Reform animation must stay smooth, and if a form is too heavy, reduce its parts in the extension.
6. The web copy, metadata and README describe the new categories without counts.

## 12. Sources

- [Girih tiles: Wikipedia](https://www.wikipedia.org/wiki/Girih_tiles)
- [Lu and Steinhardt, *Decagonal and quasi-crystalline tilings in medieval Islamic architecture*, Science 315 (2007)](https://peterlu.org/pdf/publications/2007/Science_315_1106_2007.pdf)
- [Decagonal and quasi-crystalline tilings: Princeton](https://collaborate.princeton.edu/en/publications/decagonal-and-quasi-crystalline-tilings-in-medieval-islamic-archi/)
- [Islamic geometric patterns: Bridges 2025 paper](https://archive.bridgesmathart.org/2025/bridges2025-255.pdf)
- [Zellige and related concepts: EPFL Graph Search](https://graphsearch.epfl.ch/en/concept/21573591/concepts?page=1)
- [Cairo pentagonal tiling: Wikipedia](https://en.wikipedia.org/wiki/Cairo_pentagonal_tiling)
- [Convex pentagons with positive Heesch number: arXiv](https://arxiv.org/pdf/1802.00119)
- [Kaplan, *Computer Graphics and Geometric Ornamental Design* (Escher tilings), PhD thesis](https://cs.uwaterloo.ca/%7Ecsk/other/phd/kaplan_diss_escher_print.pdf)
- [Apollonian gasket](https://wikipedia2006.classicistranieri.com/en/a/p/o/Apollonian_gasket.html)
- [Bridges Mathematical Art Gallery, 2025](https://gallery.bridgesmathart.org/exhibitions/bridges-2025-exhibition-of-mathematical-art/frederic-jean)
- [Chladni figures in 3D: VSAC 2022](https://vsac2022.tudelft.nl/?p=208)
- [Wagara: Japanese patterns and what they mean, Tokyo Weekender](https://www.tokyoweekender.com/art_and_culture/japanese-culture/wagara-japanese-patterns-and-what-they-mean/)
- [Japanese patterns: FUN! JAPAN](https://www.fun-japan.jp/en/articles/14279)
- [Japanese kimono patterns: Voyapon](https://voyapon.com/japan-kimono-patterns/)
- [Kolam: Wikipedia](https://en.wikipedia.com/wiki/Kolam)
- [Significance of Kolam in Tamil culture: Sahapedia](https://www.sahapedia.org/significance-of-kolam-tamil-culture)
- [Symmetry classification of square-tile sikku kolams: Penn State](https://pure.psu.edu/en/publications/symmetry-classification-and-enumeration-of-square-tile-sikku-kola/)
- [Extending Hridaya Kolam: arXiv](https://arxiv.org/html/2507.02874v1)
- [Op art: Sotheby's](https://www.sothebys.com/en/art-movements/op-art)
- [Characteristics of Op art: P55](https://www.p55.art/en/blogs/p55-magazine/what-are-the-characteristics-of-the-op-art-artistic-movement)
- [Op art's tricky legacy: Robin Rosenberg Fine Art](https://robinrosenbergfineart.com/?p=5925)
- [ZERO and Gutai: Bonhams](https://bonhams.shorthandstories.com/zero-gutai-post-war-contemporary/)
- [Group Zero: Whitestone Gallery](https://www.whitestone-gallery.com/blogs/gutai/group-zero)
- [Sol LeWitt: MASS MoCA](https://massmoca.org/?p=12280)
- [Sol LeWitt, Wall Drawing 957: Cuseum](https://app.cuseum.com/art/sol-lewitt-wall-drawing-957)
- [Sol LeWitt, Wall Drawing 1094A: Cuseum](https://app.cuseum.com/art/sol-lewitt-wall-drawing-1094a)
- [Sol LeWitt: Art Institute of Chicago](https://www.artic.edu/artists/35429/sol-lewitt)
- [Pattern and Decoration: Wikipedia](https://en.wikipedia.org/wiki/Pattern_and_Decoration)
- [Joyce Kozloff: Wikipedia](https://en.wikipedia.org/wiki/Joyce_Kozloff)
- [Key figures of Pattern and Decoration: IdeelArt](https://www.ideelart.com/magazine/pattern-and-decoration-movement)
- [*With Pleasure*: Andy Warhol Foundation](https://warholfoundation.org/grants/archive/with-pleasure-pattern-and-decoration-in-american-art-1972-1985/)
- [*Abstract Experiments: Latin American Art on Paper after 1950*, Art Institute of Chicago](https://www.artic.edu/exhibitions/1663/abstract-experiments-latin-american-art-on-paper-after-1950)
- [*Radical Geometry*: Meer](https://www.meer.com/en/9590-radical-geometry)
- [Lygia Pape: La Escuela](https://laescuela.art/en/community/emeritus/lygia-pape)
- [Geometric abstraction artists: 1st Art Gallery](https://www.1st-art-gallery.com/blog/post/geometric-abstraction-artists-pushing-boundaries/)
- [From Albers to Mondrian: AstaGuru](https://www.astaguru.com/blogs/from-albers-to-mondrian-the-abstract-artists-who-painted-squares-527)
- [Generative techniques: ProceduralGen](https://drbaph.is-a.dev/ProceduralGen/about.html)
- [Algorithmic art notebooks: Observable](https://observablehq.com/collection/@mmansion/algorithmic-art)
- [L-systems: Building Creative Machines](https://buildingcreativemachines.substack.com/p/the-power-of-lindenmayer-systems)
- [Lucienne Day: Wikipedia](https://en.wikipedia.org/wiki/Lucienne_Day)
- [Lucienne Day: V&A](https://www.vam.ac.uk/collections/lucienne-day)
- [Alexander Girard textiles: O'Keeffe Museum](https://publications.okeeffemuseum.org/artful-living/featured/girard-textiles/)
- [Textile designs around the world: Matador](https://matadornetwork.com/read/9-textile-designs-around-world/)
- [Global textiles: Kid World Citizen](https://kidworldcitizen.org/global-textiles-for-kids/)
- [George Bain, *Celtic Art: The Methods of Construction*](https://www.betterworldbooks.com/product/detail/celtic-art-the-methods-of-construction-9780486229232)

## Implementation notes

All twelve families are in the code, registered in `src/forms.js`, covered by `npm test` and listed in `scripts/shipped-forms.json`. Files: `geometry-tilings.js`, `geometry-math.js`, `pattern-islamic.js`, `pattern-asia.js`, `pattern-textiles.js`, `pattern-ornament.js`, `abstract-kinetic.js`, `abstract-concrete.js`, `abstract-systems.js`, `abstract-decorative.js`, `abstract-growth.js` and `abstract-global.js`, with shared helpers in `pattern-kit.js` and the exact tilings in `tiling-base.js`.

**Names changed from the plan.** Three forms were renamed before shipping, because the first idea turned out not to be drawable faithfully:

| Planned | Shipped | Why |
|---|---|---|
| `penroseKites` | `robinsonTriangles` | The triangle deflation reliably gives Penrose rhombs and Robinson triangles, but pairing the same triangles into kites and darts does not tile. The form shows the triangles themselves, coloured by type. |
| `hatMonotile` | `tumblingBlocks` | The hat polygon and its meta-tile substitution could not be reproduced exactly, and a wrong hat would be misleading. The rhombille cube tiling takes its place. |
| `penroseStairs` | `stairRing` | A flat staircase cannot close into an impossible loop without trickery, so the form is a stair ring that climbs and then descends. |

**Where the implementation simplifies the plan.**

- `reactionDiffusion` and `turingStripes` use a sum of plane waves of one wavelength, which gives Turing-like spots, stripes and labyrinths at a fraction of the cost of a Gray–Scott run. `slimeMould`, `snowflakeAutomaton`, `lichenGrowth`, `sandpile`, `langtonAnt`, `dlaCluster`, `differentialGrowth`, `spaceColonization`, `flockTrails` and `orbitTrails` are real simulations on small grids.
- `waveCollapse` fills the grid row by row against the tiles already placed. It always finishes, so it never needs to backtrack.
- `delaunayMesh` is a jittered grid with random diagonals, not a true triangulation.
- `lloydCells`, `mudCracks` and `fourColorMap` build their cells by half-plane clipping, and the four-colour map is coloured greedily from five colours.
- `hyperbolicDisc` reflects a regular polygon through its edge circles, to a few rings from the centre.
- `kikkoHexes`, `crestRings` and similar forms use invented motifs and never copy real crests or named symbols.
- Helpers `lattice` and `substitute` became the cached tilings in `tiling-base.js` and a few direct recursions in the forms. `pattern-kit.js` has its own `smoothPath(points, closed)`; the private copy in `faces.js` is left as it was.
- The time budget is a check on every new form: the median draw must be 8 ms or less and the 95th percentile 40 ms or less.
- The deck now remembers 6000 recent seeds instead of 2000, so several full rounds still never reuse a seed.
