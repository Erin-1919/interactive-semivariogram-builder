# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page teaching demo for Ordinary Kriging that builds an empirical semivariogram from a 10×10 grid. The whole app lives in `index.html` — there is no build step, no package manager, and no server. React 18, ReactDOM, and Babel-standalone are pulled from CDNs and JSX is transpiled in the browser via `<script type="text/babel" data-presets="env,react">`. Open `index.html` directly in a browser (a `file://` URL is fine; `verify.py` does exactly that).

## Run / verify

```powershell
# Run the app: just open the file in a browser.
start index.html

# Smoke test (requires playwright + chromium installed in the active Python env).
python verify.py
```

`verify.py` loads `index.html` via `file://`, asserts no `FAIL` lines from in-browser self-tests, drives the lag chips / Next button / hover, and writes `verify_hover.png`, `verify_screenshot.png`, `verify_full.png` (all gitignored). It exits non-zero on console `FAIL` or page errors.

In-browser self-tests live inside `index.html` (search for `console.log('ok'` and the `FAIL:` branch around line 640). They run on every page load and end with the banner `[semivariogram tests done]` — that banner is what `verify.py` checks for.

## Regenerating preset datasets

The three preset grids embedded in `DATASETS` inside `index.html` were produced by `gen_datasets.py`. If you change a preset, regenerate and paste the printed JS-formatted arrays back into `DATASETS`:

```powershell
python gen_datasets.py
```

The script also prints γ(h) for h=1..9 per preset — use that to sanity-check that the smooth preset still rises-and-plateaus, random stays flat, and clustered shows its hole effect before pasting into the HTML.

## Architecture notes (things that span multiple sections of `index.html`)

- **Single source of truth for the grid math.** `computePairs(grid, allDirections)` (≈ line 583) enumerates all valid point pairs once; `computeSemivariogram(pairs, maxLag)` (≈ line 610) buckets them by exact Euclidean distance. Both `GridView` (rendering which cells are "in the pair set for the current lag") and `SemivariogramPlot` consume the same `lags` array. If you change pairing rules, change them here — don't shadow the logic in the view components.
- **`MAX_LAG = 5.0` is deliberate**, not arbitrary: it's the half-extent rule of thumb for a 10×10 grid and hides the noisy far-lag drop caused by few pair counts. README documents this; keep them in sync if you change it.
- **Unknown cells are `null` in the grid arrays**, not a sentinel number. Every pair-enumeration loop must skip `null`s. `gen_datasets.py`'s `place_unknowns` and the JS `DATASETS` both rely on this.
- **Direction mode** ("cardinal only" vs "all directions") only affects which pairs `computePairs` emits. It is the same code path otherwise; don't branch in the plot/grid views.
- **Spherical model fit** (`fitSphericalModel` ≈ line 793, `sphericalGamma` ≈ line 804) is an auto-fit overlay computed from the *revealed* lags only, so it updates as the student steps through chips. It is purely derived — no state.
- **State lives entirely in `App`** (≈ line 1003): `presetKey`, `allDirections`, `showModel`, `selectedIdx`, `revealedCount`, `hoveredCell`. Keyboard shortcuts (`←`, `→`, `Home`) and lag-chip clicks are the only ways to move `selectedIdx` / `revealedCount`. `hoveredCell` is what fades the rest of the grid during pair highlighting.

## House style for this file

- No build tooling, no npm. If you need a library, prefer a CDN `<script>` tag, and only if it can't be done in vanilla React.
- Keep `index.html` self-contained — the README promises "open in any modern browser" with no setup. Don't split into modules.
- CSS variables at the top of the `<style>` block (`--paper`, `--ink`, `--accent`, …) drive the blue-on-white scholarly palette; reuse them instead of hardcoding colors.
- The in-browser `console.log('ok', …)` / `console.error('FAIL:', …)` tests are the contract `verify.py` enforces. When you change math, add or update an assertion in that block.

## Design docs

Approved spec and implementation plan live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Read them before making non-trivial pedagogical changes — they encode why certain UI affordances exist (e.g., why lag chips, why `h ≤ 5`).
