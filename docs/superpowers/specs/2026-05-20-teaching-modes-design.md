# Teaching Modes — Design

**Date:** 2026-05-20
**Author:** Mingke Li (with Claude)
**Status:** Approved

## Purpose

Turn the existing semivariogram calculator (the 10×10 builder shipped on
2026-05-15) into a guided teaching tool that walks an undergraduate class
through the full Ordinary Kriging story: a hand-calculated 3×3 example, the
same calculation scaled up on the 10×10 grid, a fitted theoretical model with
labelled nugget / sill / range, and one conceptual kriging prediction at an
unknown cell. The instructor leads the lecture from this single page on a
projector.

Predecessor spec: `2026-05-15-interactive-semivariogram-builder-design.md`.

## Scope

Two top-level modes inside one self-contained `index.html`:

| Mode | Grid | Purpose | Distances | Mode-specific UI |
|---|---|---|---|---|
| **3×3 Guided Demo** | Fixed 3×3 rainfall grid: `[[14,16,18],[12,14,17],[10,13,15]]` | Step-by-step hand calculation matching the lecture slides | `h = 1`, `h = 2` only (horizontal + vertical) | 10-step bar; auto-flips the right-panel tab |
| **10×10 Exploration** | Existing `smooth` / `random` / `clustered` presets | Same calculation scaled up; model fitting; conceptual kriging prediction | All Euclidean lags up to `h ≤ 5`; cardinal / all-directions toggle | Lag chips; preset selector; model-overlay radio; `Predict at unknown` toggle; 5-step bar |

Shared by both modes: a tabbed right panel (**γ(h) Formula** · **Calculation** ·
**Semivariogram plot**), click-to-edit cells with a Reset button, the
hover-fade highlight from the current app, and keyboard navigation
(`←` / `→` step; `Home` reset).

**Out of scope.** Real Ordinary Kriging matrix solve (kept conceptual);
anisotropy fitting; variogram cloud; dataset upload; IDW or full kriging
prediction surfaces; mobile or portrait layout.

**Carry-overs from the existing app.**

- `MAX_LAG = 5.0` and the cardinal / all-directions toggle in 10×10 stay.
- `computePairs` and `computeSemivariogram` are pulled into the shared library
  unchanged in behaviour.
- The current spherical-only `fitSphericalModel` is replaced by
  `fitModel(name, lags)` that also covers exponential and Gaussian.
- The blue-on-white scholarly palette and Fraunces / Manrope / JetBrains Mono
  type stack carry over.

## Delivery

A single self-contained `index.html` (React 18 + Babel-standalone via CDN, no
build step). Opening the file from `file://` or serving it from GitHub Pages
must work identically.

## Layout

Top to bottom on every screen:

1. **Title and mode selector.** Two pill buttons — `3×3 Guided Demo` /
   `10×10 Exploration`. Below them, one line of mode-specific framing copy.
2. **Step bar.** 10 steps in 3×3 mode; 5 steps in 10×10. Clicking any step
   jumps to it; no step gates the rest of the UI.
3. **Main row.**
   - **Grid panel (left).** SVG grid sized to the mode; pair lines drawn at
     the current lag; cells are click-to-edit; hover on a known cell fades
     the rest of the grid as today.
   - **Tabbed panel (right).** Three tabs — **γ(h) Formula**,
     **Calculation**, **Semivariogram plot**. Exactly one is visible at a
     time. A fourth **Prediction** tab appears only while the 10×10's
     `Predict at unknown` toggle is on.
4. **What-if footer.** `Tip: click any cell to change its value.`
   `[Reset values]`.

Below ~1280 px the step bar collapses to icon-only with tooltips; the rest
of the layout stays as-is (lecture-only — no mobile reflow).

## Mode model

### 3×3 Guided Demo

- Fixed grid as above; cardinal-only pair enumeration; only two exact lags
  exist (`h = 1`, twelve pairs; `h = 2`, six pairs).
- The 10-step bar drives the soft scaffold:

  | Step | Tab shown | Highlighted in formula / grid |
  |---|---|---|
  | 1 Grid | Formula | whole formula faded; grid in focus |
  | 2 Select lag | Formula | `h` |
  | 3 Highlight pairs | Formula | `Z(xᵢ)`, `Z(xᵢ + h)`; pair lines drawn |
  | 4 Differences | Calculation | `[Z(xᵢ) − Z(xᵢ + h)]`; diff column |
  | 5 Squared diffs | Calculation | `[…]²`; sq-diff column |
  | 6 Sum | Calculation | `Σ`; sum row |
  | 7 ÷ 2N(h) | Calculation | `1 / [2N(h)]` and `N(h)`; final γ row |
  | 8 Plot semivariance | Plot | the new point appears with a γ-label |
  | 9 Next lag | Plot | step bar wraps; `selectedLag` advances; previous point dimmed |
  | 10 Fit model | Plot | model radio appears; fitted curve drawn |

- The instructor may click any step at any time — auto-flipping the right
  tab is the soft scaffold, not a gate.

### 10×10 Exploration

- Existing 10×10 dataset presets stay.
- The same workflow, condensed into a 5-step bar:

  | Step | Tab shown |
  |---|---|
  | 1 Grid | Formula |
  | 2 Highlight pairs | Calculation |
  | 3 Compute γ(h) | Calculation |
  | 4 Plot point | Plot |
  | 5 Fit model | Plot |

- Lag chips, preset selector, cardinal / all-directions toggle, and the
  model-overlay radio sit beneath the grid panel.

## Computation library

All helpers are pure, take plain values, and are memoised with `useMemo` in
the mode components. They live at the top of the `<script>` block.

### `computePairs(grid, opts)`

```text
opts = { cardinalOnly, maxLag? }
```

- Walks known cells (skipping `null`).
- Emits unordered pairs `{ a, b, dist, key, label, sqDiff, dr, dc }` exactly
  as today.
- If `cardinalOnly` is true (3×3 mode), drops every pair where both `dr !== 0`
  and `dc !== 0`.
- If `maxLag` is set, drops pairs with `dist > maxLag` before bucketing.

The 10×10's existing cardinal / all-directions toggle drives `cardinalOnly`
in that mode.

### `computeSemivariogram(pairs)`

Unchanged behaviour: buckets pairs by exact distance `key`, returns
`[{ h, label, n, sumSq, gamma, pairs[] }]` sorted ascending. Both the grid
(for pair highlighting at the current lag) and the right-panel tabs read
the same array.

### Model fitting

Replaces the current spherical-only path.

```text
fitModel(name, lags) → { name, c0, c1, a }
  c0   = max(0, gamma at smallest revealed h)
  sill = max(gamma across revealed lags)
  c1   = sill − c0
  a    = h of the smallest revealed lag where gamma ≥ 0.95 · sill;
         if none reaches it, a = max revealed h

modelGamma({ name, c0, c1, a }, h)
  spherical:   c0 + c1 · (1.5·(h/a) − 0.5·(h/a)³) for h ≤ a, else c0 + c1
  exponential: c0 + c1 · (1 − exp(−3 · h / a))
  gaussian:    c0 + c1 · (1 − exp(−3 · (h/a)²))
```

The same nugget / sill / range numbers feed all three models. The plot
draws labelled guides whenever a model is active: a horizontal line at `c0`
(nugget), a horizontal line at `c0 + c1` (sill), and a vertical line at
`x = a` (range).

The model overlay is a single-choice radio (`None` / `Spherical` /
`Exponential` / `Gaussian`); only one curve is drawn at a time.

### Conceptual prediction weights

Used only when the 10×10's `Predict at unknown` toggle is on.

```text
predictionWeights(target, knownCells, k = 6)
  for each known cell, d = euclidean distance to target
  take the k nearest known cells
  raw weight   w_i = 1 / (d_i² + ε)
  normalised   w_i = w_i / Σ w_i              // weights sum to 1
  prediction   ẑ   = Σ w_i · z_i               // weighted average
  uncertainty  u   = mean(d_i) / MAX_LAG       // 0..1, drawn as a bar

return { neighbors: [{ cell, d, w }], zHat, u }
```

This is **inverse-distance, not Ordinary Kriging**. The UI labels it
explicitly: "Conceptual weights — each nearby station contributes; weights
sum to 1; uncertainty grows with distance." A footnote tells students that
real OK derives weights from the fitted variogram, which is what software
does for them.

## Prediction sub-mode (10×10 only)

- A checkbox in the 10×10 mode header: `☐ Predict at an unknown cell`.
- When on, the first `null` cell in the active preset becomes the *target*.
  Clicking any other `?` cell re-targets it. A hover affordance reads
  `click to predict here`.
- The grid overlays thin dashed `--accent` lines from the target to its six
  nearest known cells, each labelled with its normalised weight
  (`w = 0.23`).
- A box below the grid lists `ẑ = Σ w·z = 14.7 mm`, the weight list, and an
  uncertainty bar.
- The right panel exposes a fourth tab **Prediction** (visible only while
  the toggle is on); the other three tabs stay available.
- The step bar is hidden while Prediction is on — the prediction story sits
  *after* the empirical-build story, not in the middle of it.

If weight labels collide in dense neighbourhoods, fall back to a side legend
keyed by neighbour index (`①`–`⑥`).

## State

State lives entirely inside the two mode components. The top-level `App`
holds only `mode` and the keyboard handler.

### `ThreeByThreeMode`

| State | Initial | Notes |
|---|---|---|
| `values` | the fixed 3×3 grid | Click-to-edit mutates this. |
| `revealedStep` | `1` | Index into the 10-step list. |
| `selectedLag` | `'1'` | `'1'` or `'2'`. |
| `activeTab` | `'formula'` | Auto-set from `revealedStep`; instructor click overrides. |

### `TenByTenMode`

| State | Initial | Notes |
|---|---|---|
| `presetKey` | `'smooth'` | Existing preset choice. |
| `values` | the chosen preset | Click-to-edit mutates this. |
| `allDirections` | `true` | Existing toggle. |
| `selectedIdx` | `0` | Existing lag-chip index. |
| `revealedCount` | `0` | Existing reveal counter. |
| `revealedStep` | `1` | Index into the 5-step list (auto-driven by `revealedCount`/model). |
| `activeTab` | `'formula'` | Auto-set from `revealedStep`; instructor click overrides. |
| `modelName` | `'none'` | `'none' | 'spherical' | 'exponential' | 'gaussian'`. |
| `predictOn` | `false` | Toggles the prediction sub-mode. |
| `predictTarget` | first `null` cell of preset | Re-targetable by clicking another `?` cell. |

Switching modes resets `revealedStep` / `selectedLag` / `selectedIdx` /
`revealedCount` for the mode being entered. Per-mode edits to `values`
persist for the session; `[Reset values]` is the only thing that wipes
them, and it is mode-local.

## Components

All in the single file, in this order from the top of the `<script>`:

```
constants & datasets        DATASETS_3x3, DATASETS_10x10, MAX_LAG_10x10
pure helpers                computePairs, computeSemivariogram,
                            fitModel, modelGamma, predictionWeights
shared UI components        GridView, StepBar, TabbedPanel,
                            FormulaPanel, CalculationTable,
                            SemivariogramPlot, PredictionPanel
mode components             ThreeByThreeMode, TenByTenMode
App                         mode router + selector chrome + keyboard
```

- `GridView` takes `gridSize`, `values`, `pairs`, `hoveredCell`,
  `predictTarget?`, `predictNeighbors?`, and an `onEdit(row, col, value)`
  callback. It does not hold state.
- `StepBar` takes `steps`, `activeStep`, and `onStep(i)`. Collapses to
  icon-only below ~1280 px.
- `TabbedPanel` takes the list of tab keys + labels and the `activeTab`,
  renders the children for the active tab.
- `FormulaPanel` takes a `highlight` value (e.g. `'h'`, `'diff'`, `'sq'`,
  `'sum'`, `'N'`, `'oneOver2N'`) and styles the corresponding term.
- `CalculationTable` takes the pair list for the current lag and a
  `revealColumns` set (drives which columns are populated by step).
- `SemivariogramPlot` takes `lags`, `selectedIdx`, `revealedCount`,
  `model?`, and emits the nugget / sill / range guides when `model` is set.
- `PredictionPanel` takes the `predictionWeights` result and renders the
  weight list, `ẑ`, and the uncertainty bar.

Mode components do not reach into rendering details; presentational
components do not hold state.

## What-if (click-to-edit)

- Click any cell with a value: an inline `<input type="number">` replaces
  the value; commit on `Enter` or blur. `Esc` cancels.
- `?` cells stay `?` unless the instructor edits them — typing a number
  turns `?` into a known cell; clearing the value restores `?`.
- Every downstream computation recomputes via `useMemo`. The semivariogram,
  fitted model, and any active prediction redraw live.
- Edited cells get a 1.5 px `--accent` ring at 70 % opacity so the change
  is visible from the back of the room.
- `[Reset values]` restores the mode's original grid; it does *not* reset
  the selected step, lag, model, or prediction toggle.

The existing cardinal / all-directions toggle in the 10×10 stays where it
is (next to the preset selector). It is *not* moved into the what-if
footer.

## Visual design

Carry-over from the predecessor spec, with these additions:

- Mode-selector pills use `--accent` blue with `--paper` text on the active
  pill and `--ink-soft` on the inactive pill.
- Tabs in the right panel use a 2-px `--accent` underline on the active
  tab; tab labels in Manrope 500.
- Edited cells: 1.5 px `--accent` ring at 70 % opacity.
- Prediction overlay: dashed `--accent` lines at 1 px, JetBrains Mono
  weight labels.
- No new fonts. No animation beyond the existing 120 ms fill transitions.
- Step bar: numbered circles in Fraunces italic, labels in Manrope. Active
  step uses `--accent` fill; future steps use `--rule` outline.

## Testing

The in-browser `ok` / `FAIL:` test block (around line 640 today) grows to
cover the new code paths. The block must still finish in well under one
second and end with the `[semivariogram tests done]` console banner that
`verify.py` checks for.

- **3×3 fixed-grid expectations.** Compute `γ(1)` and `γ(2)` once at
  authoring time from the fixed grid and assert the app produces the same
  values.
- **Cardinal-only pair set.** Assert `computePairs(grid3x3, { cardinalOnly:
  true })` contains no pair where both `dr !== 0` and `dc !== 0`.
- **Model monotonicity.** For each of spherical / exponential / Gaussian
  with `c0 ≥ 0` and `c1 ≥ 0`, assert `modelGamma` is monotonic
  non-decreasing on `h ∈ [0, 2a]`.
- **Prediction weights.** Assert weights sum to `1 ± 1e-9` and that `ẑ` is
  bounded by the min and max of the selected neighbours' values.
- **Tab auto-flip.** Stepping through the 10 steps in 3×3 mode visits all
  three tabs in the documented order.

`verify.py` keeps its current job and adds:

- Clicking `10×10 Exploration` shows the existing chip strip.
- Clicking `3×3 Guided Demo` shows a 10-step bar.
- Editing a 3×3 cell to an extreme value changes the plotted γ point for
  that lag.
- Toggling `Predict at unknown` reveals a fourth `Prediction` tab and a
  weight-list panel.

## Success criteria

- An instructor can run the full lecture flow (3×3 walk-through → 10×10
  scale-up → model fit → prediction → one what-if) in under 8 minutes
  using only mouse and `←` / `→` / `Home`.
- Hand-computing `γ(1)` and `γ(2)` against the fixed 3×3 grid matches the
  app exactly.
- Switching mode, editing a cell, picking a different model, or toggling
  prediction never throws; the `[semivariogram tests done]` banner appears
  on every page load.
- The single `index.html` stays self-contained; `file://` and GitHub Pages
  behave identically.
- Layout is usable without horizontal scrolling on a 1080p / 1440p / 4K
  projector.

## Risks and decisions deferred

- *Step-bar density on narrow projectors.* If 10 labels wrap awkwardly
  under 1280 px, switch to icon-only with tooltips. Decide during
  implementation.
- *Prediction-overlay label collision.* Six in-grid weight labels may
  overlap in dense neighbourhoods; if so, fall back to a side legend keyed
  by neighbour index.
- *File length.* The single-file commitment will push `index.html` from
  ~1200 lines today to an estimated 2200–2800 lines. Acceptable for a
  teaching demo, but a hard cap is not promised.
