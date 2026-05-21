# Web-based Slide Deck for Ordinary Kriging Teaching Demo

**Status:** Approved
**Date:** 2026-05-21
**Author:** Mingke Li
**Drives:** Conversion of `Ordinary-Kriging-Laurier-EL_2026_05_26.pptx` (25 visible slides) into a scroll-controlled web deck that replaces the existing GitHub Pages homepage, plus refactor of the current interactive app into two sibling apps with shared math.

---

## 1. Motivation and goals

The teaching-demo presentation for the Wilfrid Laurier on-site is currently a 25-slide PowerPoint deck. Slides 15–18 walk through a 3×3 semivariance calculation by hand, and slide 19 links out to the existing interactive app for the 10×10 case. The instructor wants:

1. **A single web-page slide deck** controlled by scrolling, replacing the PowerPoint as the canonical presentation surface.
2. **The four-slide 3×3 walkthrough collapsed into one launch slide** that opens an interactive 3×3 walkthrough app in a new tab.
3. **The 10×10 + theoretical models material collapsed into one launch slide** that opens an interactive 10×10 + model-picker app in a new tab.
4. **Visual continuity with both the PowerPoint** (light/white background, scholarly blue accents) and **the existing interactive app** (whose palette is already `--paper #ffffff`, `--ink #0c2d5c`, `--accent #1d4ed8`).
5. **Reuse the existing app's source images** from `pic/` rather than the recompressed PPTX-embedded copies, where they match.

The existing interactive app (`index.html`) already has a built-in two-mode UI (3×3 walkthrough + 10×10 explorer). Per the instructor's preference, it will be split into two literal files (`three.html`, `ten.html`) with shared math extracted into `lib/semivariogram.js`.

## 2. Non-goals

- No PowerPoint compatibility layer. The deck is the new source of truth; the PPTX is reference material only.
- No build step, no npm, no bundler. The deck and apps remain plain `.html` served by GitHub Pages.
- No visual regression testing (pixel-diffing). Manual screenshot review is sufficient.
- No mobile-first design. Phones and tablets render usably (responsive sizing + grids stack), but the deck is optimized for a presenter's laptop screen and a classroom projector.
- No speaker-notes overlay. The instructor confirmed they will reference notes externally.

## 3. Architecture

### 3.1 Approach

**Vanilla single-file HTML for the deck**, with CSS scroll-snap for slide-by-slide navigation and a tiny vanilla JS controller (~50 lines) for keyboard handlers, slide counter, fullscreen toggle, and the slide-10 click-reveal animation.

No React, no Babel-standalone, no slide libraries. The existing app uses React + Babel (CDN-loaded) because its UI is reactive; the deck is static content with scroll behavior, so React would be machinery without payoff. This also keeps the deck's load time minimal — important since GitHub Pages cold-starts can be slow.

### 3.2 Repo layout

```
app/
├── index.html              ← NEW: the 21-slide deck (replaces current root file)
├── three.html              ← 3×3 walkthrough (extracted from current index.html)
├── ten.html                ← 10×10 explorer + model-picker (extracted from current index.html)
├── lib/
│   ├── semivariogram.js    ← shared math: computePairs, computeSemivariogram,
│   │                          DATASETS, fitSpherical/Exponential/Gaussian,
│   │                          in-browser self-tests (runs once on first load)
│   └── theme.css           ← shared CSS variables (--paper, --ink, --accent, …)
│                             and shared typography rules
├── assets/
│   ├── img/                ← extracted PPTX images, prefer pic/ source
│   │                          where it matches; downsized to ≤1200px
│   └── lab/
│       └── Ordinary-Kriging-Laurier-Lab-EL_2026_05_26.pdf
├── gen_datasets.py         ← unchanged logic; now writes into lib/semivariogram.js
├── verify.py               ← updated: drives three.html, ten.html, index.html
├── README.md, CLAUDE.md    ← updated to describe the new structure
└── docs/                   ← existing
```

### 3.3 GitHub Pages impact

After deployment, the canonical URLs become:

- `https://erin-1919.github.io/interactive-semivariogram-builder/` → new deck
- `https://erin-1919.github.io/interactive-semivariogram-builder/three.html` → 3×3 walkthrough
- `https://erin-1919.github.io/interactive-semivariogram-builder/ten.html` → 10×10 + models

The deck's two launch buttons use relative hrefs with `target="_blank" rel="noopener"`, so they work both on Pages and from local `file://`.

## 4. Slide outline (21 slides)

The PPTX has 25 visible slides plus 2 hidden ones; hidden slides are dropped. Slides 15–18 (3×3 calculation) collapse to one launch slide. Slide 19 (interactive tool link) merges with slide 20 (theoretical models). Slide 8 (Types of Kriging) is moved to between Validation and Lab Assignment, per the instructor's request.

| # | Title | Source (PPTX #) | Notes |
|---|-------|-----------------|-------|
| 1 | An Introduction to Ordinary Kriging | 1 | Title + "Dr. Erin Li / UbiSensing & AI Lab, University of Calgary / mingke.li@ucalgary.ca" |
| 2 | How do we estimate rainfall where we don't observe it? | 2 | Hook slide, rainfall stations image |
| 3 | By the end of today's lecture, you'll learn… | 3 | Three-column: What / Why / How |
| 4 | A Quick Review | 4 | Spatial interpolation definition + IDW baseline |
| 5 | Why Distance Alone Is Not Enough | 5 | Visual + caption |
| 6 | What Is Kriging? | 6 | Krige origin story (1950s, South Africa) |
| 7 | Kriging as BLUP | 7 | Three callouts (Best / Linear / Unbiased) with the one-line explanation under each. **Equations under "Linear" and "Unbiased" are removed.** |
| 8 | Ordinary Kriging Core Assumption | 9 | Z(s) = μ + ε(s); prediction equation; contrasts with Simple/Universal |
| 9 | When Ordinary Kriging Is Appropriate | 10 | A/B/C/D criteria grid |
| 10 | Quick Test: Would Ordinary Kriging Work Here? | 11 | 6-row scenario table. **Animation: ?/Why columns hidden initially, click-reveal row by row.** See §6.3. |
| 11 | Step 1 — Data Exploration | 12 | Questions table + tools side panel |
| 12 | Step 2 — Empirical Semivariogram (intuition) | 13 | Concept slide before the math |
| 13 | Anatomy: Nugget / Range / Sill | 14 | γ(h) curve with three labeled callouts |
| 14 | **Worked example: 3×3 rainfall grid** | 15–18 collapsed | Static SVG of the 3×3 grid + short copy + **"Launch 3×3 walkthrough →"** button (opens `three.html` in new tab) |
| 15 | **Step 3 — Fit Theoretical Semivariogram Model** | 19 + 20 merged | Three model cards (Spherical / Exponential / Gaussian), each with the "Best used when…" bullets from PPTX slide 20 + a small inline SVG γ(h) sparkline. Below: **"Launch 10×10 + model picker →"** button (opens `ten.html` in new tab) |
| 16 | Step 4 — Build the Kriging Matrix and Solve Weights | 21 | A: calculate semi-variance (with notes), B: build the kriging system (with notes), C: apply unbiasedness constraint (title only), D: solve for weights (title only). **No equations.** |
| 17 | Step 5 — Prediction Surface Generation | 22 | **Only the two figures (prediction map + uncertainty map) with their captions. Left panel text and equations are dropped.** |
| 18 | Step 6 — Validation (LOOCV) | 23 | Steps list + metrics table |
| 19 | Different Types of Kriging | **8 — moved** | Five-row table; the Ordinary Kriging row is highlighted |
| 20 | Lab Assignment 6 | 24 | Wrap into ArcGIS Pro + **button linking to `assets/lab/Ordinary-Kriging-Laurier-Lab-EL_2026_05_26.pdf`** |
| 21 | Resources | 25 | 6-reference bibliography |

## 5. Splitting the existing app into `three.html` and `ten.html`

### 5.1 What gets extracted to `lib/semivariogram.js`

Pure functions, no DOM. Loaded via `<script src="lib/semivariogram.js">` (no `type="module"`, so functions become globals — matches the existing app's "everything global in one file" pattern).

**Important:** the current `index.html` already implements all three theoretical models (Spherical, Exponential, Gaussian) via `fitModel(name, revealedLags)` and `modelGamma(model, h)` at `index.html:1320-1355`. The 4-button model picker UI is already wired up at `index.html:2210`. `CLAUDE.md` is stale on this point — it predates the Exp/Gaussian additions. No new theoretical math is required; this section is a *move*, not new code.

```js
const MAX_LAG = 5.0;

const DATASET_3X3 = { /* fixed 3×3 rainfall grid — moved verbatim */ };
const DATASETS = { /* smooth, random, clustered 10×10 presets — moved verbatim */ };

function computePairs(grid, allDirections) { /* unchanged */ }
function computeSemivariogram(pairs, maxLag) { /* unchanged */ }

// All three models handled by a single name-dispatched pair of functions.
// Moved verbatim from current index.html:1320-1355.
function fitModel(name, revealedLags) { /* unchanged */ }
function modelGamma(model, h) { /* dispatches on name: 'spherical' | 'exponential' | 'gaussian' */ }

// Moved from current index.html ~lines 1075-1110. Runs once on first load of
// either app and emits the [semivariogram tests done] banner that verify.py
// watches for. Existing assertions cover all three model gammas.
function runSelfTests() { /* unchanged */ }
runSelfTests();
```

### 5.2 What stays in each HTML file

- **`three.html`** keeps the 3×3 walkthrough React component (currently around line 1768 of `index.html`), its `revealedStep` / `modelName` state, the calc-table, the formula band, and the vertical tab UI. The mode-selector nav is removed. The 10×10 component code is removed.
- **`ten.html`** keeps the 10×10 explorer (currently around line 1957), the dataset selector, and the model picker. The mode-selector nav is removed. The 3×3 component code is removed. The 4-button model picker (None / Spherical / Exponential / Gaussian) is already present at `index.html:2210` and defaults to None — no UI change needed.

Each file's component-specific CSS stays inline; only the CSS variables and shared typography move to `lib/theme.css`.

### 5.3 The deviation from "single self-contained .html"

`CLAUDE.md` currently says "Keep `index.html` self-contained — the README promises 'open in any modern browser' with no setup. Don't split into modules." After this refactor, both `three.html` and `ten.html` load two external files (`lib/semivariogram.js` and `lib/theme.css`).

This is a deliberate trade-off chosen by the instructor in brainstorming: one source of truth for the math beats strict file isolation. The promise "open in any modern browser with no setup" still holds — both `lib/` files are plain static assets served as relative paths, no build step. `CLAUDE.md` will be updated to reflect the new norm.

## 6. Detail design for non-trivial slides and features

### 6.1 Slide 14 — Worked example: 3×3 rainfall grid

- **Left half:** static SVG of the 3×3 grid containing the PPTX values (14/16/18 / 12/14/17 / 10/13/15), styled with the same `--paper-soft` cell background and `--rule` borders as the live 3×3 app for visual continuity.
- **Right half:** short copy block — "Let's walk through the calculation pair-by-pair: enumerate horizontal pairs, vertical pairs, then diagonal pairs at h=√2 and h=2, compute γ(h), and place each point on the semivariogram."
- **Below the columns:** a single large pill button **"Launch 3×3 walkthrough →"** with `href="three.html" target="_blank" rel="noopener"`. Hover state lifts (`translateY(-2px)`) + accent-color shadow.

No iframe — the launch button opens a fresh tab so students can step through the walkthrough at their own pace while the instructor keeps the deck open.

### 6.2 Slide 15 — Step 3 + 10×10 launch

Three model cards in a single row (Spherical / Exponential / Gaussian). Each card contains:
- Model name as the card heading.
- "Best used when:" plus 2–3 bullets from PPTX slide 20.
- An inline SVG γ(h) sparkline (~80×40px) showing the model's characteristic shape — Spherical caps at range, Exponential approaches sill asymptotically, Gaussian has the S-curve with flat origin.

Below the three cards: the **"Launch 10×10 + model picker →"** pill button → `ten.html` in new tab.

### 6.3 Slide 10 — Quick Test click-reveal animation

PPTX behavior: all 6 scenarios are visible; the "Ordinary Kriging?" answer column (Yes/No) and the "Why" reasoning column reveal one row at a time on click.

**Implementation:**
- The table renders all 6 rows immediately with the answer/why cells in a hidden state (`opacity: 0; visibility: hidden;`).
- A click anywhere inside the table container (`<table class="quick-test">` wrapped in an `onclick`-handling `<div>`) reveals the next row's two hidden cells together via a 250ms fade-in (`opacity 0 → 1`).
- A small caption below the table reads `Click table to reveal answers — n / 6` and updates in place.
- After the 6th click, further clicks are no-ops.
- Revealed state is preserved per slide within the session (held in module-level state, not slide-DOM state) — scrolling away and back does not reset.
- Scroll and keyboard navigation are **not** blocked by remaining hidden rows. Students can advance past slide 10 mid-reveal.
- Spacebar and arrow keys do **not** trigger the reveal — they always navigate slides. This avoids the foot-gun where a student presses space expecting slide-advance and instead advances a hidden row.

### 6.4 Theoretical model math in `lib/semivariogram.js`

All three models are already implemented in the current `index.html` (see §5.1). They are *moved* into `lib/semivariogram.js` verbatim, not rewritten. For reference, the existing forms (at `index.html:1340-1355`):

```js
function modelGamma(model, h) {
  if (!model || h < 0) return 0;
  const { name, c0, c1, a } = model;
  if (name === 'spherical') {
    if (h >= a) return c0 + c1;
    const x = h / a;
    return c0 + c1 * (1.5 * x - 0.5 * x ** 3);
  }
  if (name === 'exponential') {
    return c0 + c1 * (1 - Math.exp(-3 * h / a));
  }
  if (name === 'gaussian') {
    return c0 + c1 * (1 - Math.exp(-3 * (h / a) ** 2));
  }
  return 0;
}
```

The factor 3 in the exponential and Gaussian forms gives a "practical range" at `h = a` (γ reaches ~95% of the sill), matching the spherical convention. The `fitModel(name, revealedLags)` function (at `index.html:1328`) infers `c0` from the smallest revealed lag, `c1` from `max(γ) - c0`, and `a` from where γ first crosses 95% of the sill. Sub-millisecond on the 9 lag points of a 10×10 grid; no perceptible UI lag.

**Model picker UI in `ten.html`:** the existing 4-button radio group (None / Spherical / Exponential / Gaussian) at `index.html:2210` is already correct, already defaults to None, and already has no auto-fit trigger. No behavior change required for the 10×10 explorer's model picker.

The 3×3 walkthrough has its own model picker (at `index.html:1886`) plus an auto-fit-to-Spherical trigger at step 10 (at `index.html:1812`). Since this is pedagogically deliberate — once a student has stepped through all 9 lags, the curve appears so they see what fitting means — that trigger stays in `three.html`.

### 6.5 Deck navigation

| Input | Effect |
|-------|--------|
| Mouse scroll / trackpad swipe | CSS `scroll-snap-type: y mandatory` snaps to the next/prev slide |
| `→` / `↓` / `Space` / `PageDown` | Next slide |
| `←` / `↑` / `Shift+Space` / `PageUp` | Previous slide |
| `Home` | First slide |
| `End` | Last slide |
| `f` | Toggle browser fullscreen via `document.documentElement.requestFullscreen()` |

A static `n / 21` slide counter sits bottom-right, low-contrast (`--ink-mute`), and hides under `@media (max-height: 500px)`.

### 6.6 Entrance animations

When a slide scroll-snaps into view, its `.reveal` elements fade-and-slide-up with a staggered 100ms delay between siblings (the standard frontend-slides convention). Powered by `IntersectionObserver` adding `.visible` to the active slide. `@media (prefers-reduced-motion: reduce)` drops the slide-up motion and keeps only the fade.

### 6.7 Viewport fitting

The frontend-slides skill's hard rule: every slide must fit one viewport — no scrolling inside a slide.

- All typography uses `clamp(min, preferred, max)` so the deck reads at 1920×1080, 1366×768, and tablet portrait without intervention.
- Two slides flagged for tight density:
  - **Slide 8** (Core Assumption): trimmed prose around the equations to one line each; two-column layout (equation block left, plain-English explanation right).
  - **Slide 16** (Step 4 A/B/C/D): fits comfortably as a 2×2 grid of cards once equations are removed.
- Grids stack vertically below 600px width; the slide counter hides below 500px height.

## 7. Asset pipeline

### 7.1 Image extraction

For each slide that needs an image:

1. Inspect `pic/` for a source image that visually matches the PPTX slide.
2. If a match exists in `pic/`, copy it to `assets/img/slideNN_<purpose>.png` (e.g., `assets/img/slide02_rainfall_stations.png`).
3. If no match (or for PowerPoint-generated SVGs like `image3.svg`, `image4.svg`, `image5.svg`), fall back to the corresponding file in `/tmp/pptx_unpacked/ppt/media/`.
4. Downsize anything >1200px on the longest dimension with Pillow's `Image.thumbnail((1200, 1200), Image.LANCZOS)` at quality 85.

The slide-to-image mapping is recorded in the implementation plan.

### 7.2 Lab PDF

Copy `C:\Users\mlier\Documents\Academic_position_2026\Wilfrid Laurier University_2026\onsite\teaching_demo\Ordinary-Kriging-Laurier-Lab-EL_2026_05_26.pdf` into `app/assets/lab/Ordinary-Kriging-Laurier-Lab-EL_2026_05_26.pdf`. The slide-20 button links there with `target="_blank" rel="noopener"`.

## 8. Testing

### 8.1 In-browser self-tests

The current `console.log('ok', …)` / `console.error('FAIL:', …)` block at `index.html:1075-1110` moves verbatim to `lib/semivariogram.js`. The existing assertions already iterate over all three models (`for (const name of ['spherical', 'exponential', 'gaussian'])`) and check `modelGamma(0) = c0`, `modelGamma(big) = c0+c1`, and the spherical-specific shape. No new assertions are needed for the model math itself.

One new assertion is added when the math is moved: confirm `fitModel('spherical', ...)`, `fitModel('exponential', ...)`, and `fitModel('gaussian', ...)` all return non-null objects with positive `a`, `c0`, `c1` on a realistic 9-lag input — a regression guard against accidentally breaking the fitter during the move.

The `[semivariogram tests done]` banner stays the marker `verify.py` watches for.

### 8.2 Playwright smoke tests in `verify.py`

| Page | Smoke checks |
|------|---------------|
| `three.html` | Loads, banner appears, no console `FAIL`, drives lag chips + Next button + hover (the existing checks carried over) |
| `ten.html`   | Loads, banner appears, model picker has 4 buttons (None / Spherical / Exp / Gaussian), default is None, clicking each shows a curve, dataset switcher works |
| `index.html` (deck) | Loads, no console errors, slide count = 21, scroll-snap responds to PageDown, arrow keys advance, `f` toggles fullscreen, slide-14 and slide-15 launch buttons have correct `href` + `target="_blank"` + `rel="noopener"`, slide-10 click-reveal advances 1→6 then no-ops on the 7th click |

Screenshots written per-page: `verify_three.png`, `verify_ten.png`, `verify_deck.png` (gitignored).

### 8.3 Out of scope

- Visual regression / pixel-diff testing.
- Cross-browser automated testing (Playwright drives Chromium only).
- Automated accessibility audit (WAVE/axe). Basic semantic HTML and ARIA labels are still required by the implementation; just not automated.

## 9. Open follow-ups (not in this design)

- If presenter notes ever become desired, the simplest later add is a hidden `<aside>` per slide toggled with `n`, rendered as a fixed bottom strip.
- If the deck grows beyond ~25 slides, consider adding a `j` key to open a slide-jump menu (currently overkill at 21).
