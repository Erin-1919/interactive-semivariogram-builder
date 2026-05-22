# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page teaching deck (`index.html`) for Ordinary Kriging — 16 scroll-snap slides
that convert the lecture PowerPoint into a web format — plus three sibling interactive
apps that the deck launches in new tabs:

- `why_distance.html` — four-scenario "ruler" explorer (slide 5)
- `three.html` — 3×3 hand-calculation walkthrough (slide 12)
- `ten.html` — 10×10 explorer with empirical lags and theoretical model fitting (slide 13)

Shared math + React components live in `lib/semivariogram.js`; the shared palette and
base styles in `lib/theme.css`. All four files (deck + two apps + lib) are plain HTML
served by GitHub Pages — no build step. Open any of them directly in a browser.

**Inline-copy quirk.** `three.html` and `ten.html` each carry an inlined copy of
`lib/semivariogram.js` (math + `DATASETS_10X10` + `GridView` + `SemivariogramPlot` +
self-tests) inside their `<script type="text/babel">` block — `lib/semivariogram.js`
itself is the canonical source but is never loaded via `<script src=…>`. When you
change anything in the lib (math, presets, components, or the self-tests), mirror the
edit into BOTH `three.html` and `ten.html`. `verify.py` will catch most regressions
because the inline self-tests must still emit `[semivariogram tests done]` with no
`FAIL:` lines.

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

`verify.py` smoke-tests all four pages and writes `verify_three.png`, `verify_ten.png`,
`verify_why_distance.png`, `verify_deck.png` (all gitignored). It checks the apps'
in-browser self-tests emit `[semivariogram tests done]` (three.html, ten.html) and
`[why-distance tests done]` (why_distance.html) with no `FAIL:` lines, verifies the
deck has 16 slides, the three launch buttons (slides 5, 12, 13) and the PDF button
(slide 16) are wired correctly, and the slide-9 click-reveal animation advances 0→6.

In-browser self-tests now live inside `lib/semivariogram.js` and run on first load of
either app. They emit `[semivariogram tests done]` on success.

## Regenerating preset datasets

The five 10×10 preset grids embedded in `DATASETS_10X10` (smooth / random /
clustered / gradient / outliers) were produced by `gen_datasets.py`. If you change a
preset, regenerate and paste the printed JS-formatted arrays back into
`DATASETS_10X10` in **all three** places — `lib/semivariogram.js`, `three.html`, and
`ten.html`:

```powershell
python gen_datasets.py
```

The script also prints γ(h) for h=1..9 per preset — use it to sanity-check that
smooth rises-and-plateaus, random stays flat, clustered shows its hole effect,
gradient keeps climbing, and outliers is uniformly inflated.

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
  step 10. The 10×10 explorer in `ten.html` auto-selects Spherical the first time the
  user lands on the **Fit model** step (whether via → key or by clicking the step in
  the StepBar); an already-chosen Exponential/Gaussian is preserved.
- **`ten.html` step bar is three steps** — `Grid` → `Plot point` → `Fit model`. The
  numeric step indices are referenced literally in `next`/`prev`/`onChipClick`/
  `onStep`/model-radio inside `TenByTenMode` (e.g., `revealedStep === 2` is "Plot
  point", `=== 3` is "Fit model"). If you add or reorder steps, renumber those
  literals to match.
- **No "Predict at an unknown cell" feature in `ten.html`.** It was removed; only
  cell editing and the empirical/theoretical workflow remain. `predictionWeights` and
  `PredictionPanel` are still defined in `lib/semivariogram.js` and the inlined
  copies because T7 of the self-tests exercises `predictionWeights` — don't delete
  them without also dropping T7.
- **Deck state** lives entirely in module-scoped closure inside the `<script>` block
  at the bottom of `index.html`: `activeIdx`, `qtRevealed`. Keyboard shortcuts
  (`←`/`→`/`Space`/`Home`/`End`/`f`) and scroll-snap drive `activeIdx`; clicking the
  Quick-Test table drives `qtRevealed`.

## House style for this file

- No build tooling, no npm. If you need a library, prefer a CDN `<script>` tag, and only if it can't be done in vanilla React.
- Keep `index.html` self-contained — the README promises "open in any modern browser" with no setup. Don't split into modules.
- CSS variables at the top of the `<style>` block (`--paper`, `--ink`, `--accent`, …) drive the blue-on-white scholarly palette; reuse them instead of hardcoding colors.
- The in-browser `console.log('ok', …)` / `console.error('FAIL:', …)` tests are the contract `verify.py` enforces. When you change math, add or update an assertion in that block.

## Publishing to GitHub Pages

The live site is **https://erin-1919.github.io/interactive-semivariogram-builder/**.
Pages is configured as `source: { branch: main, path: / }` (classic Pages, not
Actions deployment), so **anything pushed to `main` is what goes live**. Day-to-day
work happens on `feature/web-slide-deck`; publishing means merging that into `main`
and pushing.

When the user asks to "update the webpage" or "publish":

```powershell
# from the feature branch with the changes committed
git push origin feature/web-slide-deck     # back up the working branch
git checkout main
git merge --ff-only feature/web-slide-deck # only succeeds if main is an ancestor
git push origin main                       # triggers a Pages build
git checkout feature/web-slide-deck        # return to the working branch
```

A `gh api -X POST repos/Erin-1919/interactive-semivariogram-builder/pages/builds`
forces a rebuild if the automatic one stalls. `gh api repos/.../pages/builds/latest`
returns the current build's status (`queued` / `building` / `built` / `errored`) and
commit; `gh run view <id> --log-failed` shows the actual error when it's `errored`.

**`.nojekyll` at the repo root is load-bearing.** Without it, Pages runs Jekyll on
every push, and Jekyll's Liquid parser chokes on `{{...}}` JSX/JS snippets inside
the design-doc Markdown files under `docs/superpowers/plans/` — the build errors out
and the site keeps serving the previous commit. Don't delete `.nojekyll` and don't
add Jekyll front-matter; this is a plain static-HTML site.

After pushing, expect the live site to update within ~30 seconds. Browsers often
cache the old `index.html`; tell the user to force-refresh (Ctrl+Shift+R) if they
still see the previous version.

## Design docs

Approved spec and implementation plan live in `docs/superpowers/specs/` and `docs/superpowers/plans/`. Read them before making non-trivial pedagogical changes — they encode why certain UI affordances exist (e.g., why lag chips, why `h ≤ 5`).
