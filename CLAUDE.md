# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page teaching deck (`index.html`) for Ordinary Kriging — 16 scroll-snap slides
that convert the lecture PowerPoint into a web format — plus two sibling interactive
apps that the deck launches in new tabs:

- `three.html` — 3×3 hand-calculation walkthrough
- `ten.html` — 10×10 explorer with empirical lags and theoretical model fitting
  (Spherical / Exponential / Gaussian)

Shared math + React components live in `lib/semivariogram.js`; the shared palette and
base styles in `lib/theme.css`. All four files (deck + two apps + lib) are plain HTML
served by GitHub Pages — no build step. Open any of them directly in a browser.

## Run / verify

```powershell
# Open the deck
start index.html

# Open an app directly
start three.html
start ten.html

# Smoke test (requires playwright + chromium installed in the active Python env)
python verify.py
```

`verify.py` smoke-tests all three pages and writes `verify_three.png`, `verify_ten.png`,
`verify_deck.png` (all gitignored). It checks the apps' in-browser self-tests emit the
`[semivariogram tests done]` banner with no `FAIL:` lines, verifies the deck has 16
slides, the three launch buttons are wired correctly, and the slide-10 click-reveal
animation advances 0→6.

In-browser self-tests now live inside `lib/semivariogram.js` and run on first load of
either app. They emit `[semivariogram tests done]` on success.

## Regenerating preset datasets

The three 10×10 preset grids embedded in `DATASETS_10X10` inside `lib/semivariogram.js`
were produced by `gen_datasets.py`. If you change a preset, regenerate and paste the
printed JS-formatted arrays back into `DATASETS_10X10`:

```powershell
python gen_datasets.py
```

The script also prints γ(h) for h=1..9 per preset — use that to sanity-check that the
smooth preset still rises-and-plateaus, random stays flat, and clustered shows its
hole effect before pasting into lib/.

## Architecture notes (things that span multiple files)

- **Single source of truth for the grid math.** `computePairs(grid, opts)` and
  `computeSemivariogram(pairs, maxLag)` in `lib/semivariogram.js` enumerate pairs and
  bucket them by exact Euclidean distance. Both `GridView` (in lib) and the per-mode
  components (in `three.html` / `ten.html`) consume the same `lags` array. If you
  change pairing rules, change them in `lib/semivariogram.js` — don't shadow the
  logic in the view components.
- **`MAX_LAG_10X10 = 5.0` is deliberate**, not arbitrary: it's the half-extent rule of
  thumb for a 10×10 grid and hides the noisy far-lag drop caused by few pair counts.
  Lives at the top of `lib/semivariogram.js`.
- **Unknown cells are `null` in the grid arrays**, not a sentinel number. Every pair-
  enumeration loop must skip `null`s. `gen_datasets.py`'s `place_unknowns` and the JS
  `DATASETS_10X10` both rely on this.
- **Direction mode** ("cardinal only" vs "all directions") only affects which pairs
  `computePairs` emits. It is the same code path otherwise; don't branch in the plot/
  grid views.
- **Theoretical model fitting** for all three models (Spherical, Exponential, Gaussian)
  goes through `fitModel(name, revealedLags)` and `modelGamma(model, h)` in
  `lib/semivariogram.js`. The 3×3 walkthrough in `three.html` auto-fits Spherical at
  step 10 (pedagogical: shows the curve once the student has revealed all lags). The
  10×10 explorer in `ten.html` defaults to None — the student must pick a model.
- **Deck state** lives entirely in module-scoped closure inside the `<script>` block
  at the bottom of `index.html`: `activeIdx`, `qtRevealed`. Keyboard shortcuts
  (`←`/`→`/`Space`/`Home`/`End`/`f`) and scroll-snap drive `activeIdx`; clicking the
  Quick-Test table drives `qtRevealed`.

## House style for this file

- No build tooling, no npm. If you need a library, prefer a CDN `<script>` tag, and only if it can't be done in vanilla React.
- Keep `index.html` self-contained — the README promises "open in any modern browser" with no setup. Don't split into modules.
- CSS variables at the top of the `<style>` block (`--paper`, `--ink`, `--accent`, …) drive the blue-on-white scholarly palette; reuse them instead of hardcoding colors.
- The in-browser `console.log('ok', …)` / `console.error('FAIL:', …)` tests are the contract `verify.py` enforces. When you change math, add or update an assertion in that block.

## Design docs

Approved spec and implementation plan live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Read them before making non-trivial pedagogical changes — they encode why certain UI affordances exist (e.g., why lag chips, why `h ≤ 5`).
