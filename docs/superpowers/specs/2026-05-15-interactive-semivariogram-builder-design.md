# Interactive Semivariogram Builder — Design

**Date:** 2026-05-15
**Author:** Mingke Li (with Claude)
**Status:** Approved

## Purpose

A single-page interactive web app for a teaching demo on Ordinary Kriging. The app helps students understand how an empirical semivariogram is built from point pairs by moving from a small manual 3×3 exercise to a computational 5×5 example.

The app must allow an instructor to demonstrate, in under 3 minutes:

1. A semivariogram is built from pairs of observed points.
2. Pair distance `h` can include horizontal, vertical, and diagonal separation.
3. Unknown cells are excluded from the calculation.
4. Semivariance summarizes how different paired values are at each distance.
5. Different spatial patterns produce different empirical semivariograms.

**Out of scope:** IDW or kriging interpolation maps, editable cell values, dataset upload, full prediction surface.

## Delivery

A single self-contained `index.html` file. React 18 and Babel-standalone are loaded via CDN; Google Fonts is used for typography. No build step. The instructor double-clicks the file to open it in any modern browser. Target: ~600 lines including styles.

## Layout

Three vertical panels.

| Panel | Contents |
|---|---|
| **Left — Controls & context** | Dataset preset dropdown; direction-mode toggle (Cardinal only / All directions); legend; "Show fitted model" toggle; short framing text describing the active preset. |
| **Center — Grid & lag controls** | Large interactive 5×5 grid with pair lines drawn on top. Lag-chip strip listing every available Euclidean distance, dimmed until reached. Previous / Next / Reset step buttons. |
| **Right — Plot & summary** | Empirical semivariogram plot (hand-drawn SVG, no chart library). Calculation summary box (h, N(h), Σ(diff²), γ(h)) and paired-values table. Teaching notes. |

Below ~1180 px the layout collapses to a single column for laptop / portrait projection.

## Data Model

Three preset 5×5 grids are hard-coded as 2D arrays of numbers, with `null` marking unsampled (`?`) cells.

| Preset | Concept |
|---|---|
| `smooth` | Strong spatial autocorrelation. Values increase smoothly across the grid. |
| `random` | No spatial structure. Values are scattered; γ(h) is high even at h = 1. |
| `clustered` | Two distinct zones. Irregular, multi-modal semivariogram. |

Each grid contains exactly two `?` cells, positioned to remain visible without dominating the layout.

## Computation

```text
gamma(h) = (1 / 2N(h)) · Σ [ z(s_i) − z(s_j) ]²
```

### `computePairs(grid, allDirections)`

1. Flatten the grid into a list of known cells `{ r, c, v }`, skipping `null`.
2. Enumerate unordered pairs `(i < j)`.
3. For each pair compute `dr = r_j − r_i`, `dc = c_j − c_i`.
4. If `allDirections === false` and both `dr !== 0` and `dc !== 0`, drop the pair (cardinal mode excludes diagonals).
5. Otherwise emit `{ a, b, dist = √(dr² + dc²), key = dist.toFixed(6), label = dist.toFixed(2), sqDiff = (a.v − b.v)² }`.

### `computeSemivariogram(pairs)`

1. Group pairs by `key`.
2. For each group, compute `n`, `sumSq`, `gamma = sumSq / (2n)`.
3. Return the groups sorted ascending by `h`.

Both functions are pure and recomputed via `useMemo` whenever the dataset or direction mode changes.

## State

| State | Initial | Notes |
|---|---|---|
| `presetKey` | `'smooth'` | Drives which preset grid is loaded. |
| `allDirections` | `true` | Toggles cardinal / all directions. Changing it resets the build. |
| `selectedIdx` | `0` | Index into the lag array currently highlighted. |
| `revealedCount` | `0` | How many lag points have been revealed on the plot. `0` means the plot is empty. |
| `showModel` | `false` | Whether to overlay the fitted spherical curve. |

## Interaction Rules

The plot and pair-line highlights are gated by `revealedCount`. When `revealedCount === 0` nothing is highlighted on the grid and the plot has no points, regardless of `selectedIdx`. When `revealedCount > 0`, the currently highlighted lag is `lags[selectedIdx]` and the plot shows points for `lags.slice(0, revealedCount)`.

- **Initial state:** `revealedCount = 0`, `selectedIdx = 0`. Plot empty. No pairs highlighted. Lag chips all visible but dimmed.
- **Next** → if `revealedCount < lags.length`, increment `revealedCount`; set `selectedIdx = revealedCount − 1` so the new lag is highlighted.
- **Previous** → if `revealedCount > 0`, decrement `revealedCount`; set `selectedIdx = max(0, revealedCount − 1)`. The most recently added point disappears from the plot. Pressing Previous when `revealedCount === 1` returns to the empty initial state.
- **Reset** → `revealedCount = 0`, `selectedIdx = 0`.
- **Click a chip** at index `i` → if `i < revealedCount`, set `selectedIdx = i` only; if `i ≥ revealedCount`, advance `revealedCount = i + 1` and set `selectedIdx = i` (reveals every chip up to and including the clicked one).
- **Changing dataset or direction mode** → resets `revealedCount = 0`, `selectedIdx = 0`, since the lag set changes.
- **Arrow keys** `←` / `→` drive Previous / Next for projector-friendly navigation. `Home` resets.

## Fitted Spherical Model

Optional overlay, toggled by a checkbox in the left panel. Default off.

**Auto-fit (no user-editable parameters in v1):**

- `nugget c₀ = max(0, γ at smallest revealed h)`
- `sill c₀ + c₁ = max(γ across revealed lags)`
- `range a = h of the smallest revealed lag where γ ≥ 0.95 · sill`; if no such lag exists, `a = max(h across revealed lags)`.

**Curve:**

```text
γ(h) = c₀ + c₁ · (1.5 · (h/a) − 0.5 · (h/a)³)   for h ≤ a
γ(h) = c₀ + c₁                                   for h > a
```

Drawn as a thin dashed muted-ink line so empirical dots remain the focal point. Re-fits as lags are revealed.

## Visual Design

**Aesthetic direction:** editorial scientific — a beautifully typeset academic monograph that became interactive.

### Color palette

| Token | Value | Use |
|---|---|---|
| `--paper` | `#f3ede1` | Page background |
| `--paper-soft` | `#f8f4ea` | Panel fields, plot frame |
| `--paper-deep` | `#ebe3d2` | Formula box, depth |
| `--ink` | `#1c1812` | Primary text |
| `--ink-soft` | `#3a342a` | Secondary text |
| `--ink-mute` | `#6b6354` | Tertiary text, axes |
| `--rule` | `#c9bfa9` | Borders, dividers |
| `--accent` | `#b04527` | Selection, pair lines, highlighted plot point |
| `--accent-pale` | `#f0d3c5` | Paired cell fill |
| `--unknown` | `#a89e88` | Hatch pattern for `?` cells |

### Typography

- **Fraunces** — display serif, used for the title, panel headers, italic captions, the γ(h) formula, and SVG axis labels.
- **Manrope** — UI body and control text.
- **JetBrains Mono** — every number on the screen (cell values, h, γ, N, paired-values table).

Type scales up automatically above 1600 px for projector use.

### Decorative details

- Panel headers are numbered `§ 1`, `§ 2`, `§ 3` in serif italic terracotta.
- A very faint SVG-turbulence paper-grain overlay sits on the body at ~35 % opacity.
- Pair lines: 1.5 px terracotta strokes at 55 % opacity with 2.5 px endpoint dots.
- Paired cells fill in `--accent-pale` with a `--accent` border.
- Unknown cells use a 45° hatch over `--paper-deep`, with `?` rendered in italic Fraunces.
- The selected plot point sits inside a faint terracotta ring and carries a `γ = …` label above it.
- The empirical plot uses dotted gridlines, JetBrains Mono tick labels, and italic Fraunces axis titles (`lag distance h`, `semivariance γ(h)`).

## Component Breakdown

| Component | Purpose |
|---|---|
| `App` | Top-level state, layout, keyboard handler. |
| `GridView` | 5×5 SVG grid with optional pair line overlay. Pure. |
| `SemivariogramPlot` | Hand-drawn SVG plot with axes, gridlines, points, optional model curve. Pure. |
| `CalculationSummary` | Selected-lag summary box with paired-values table. Truncates to 8 rows with "showing first 8 of N pairs" note. |

Two helper pure functions live alongside: `computePairs`, `computeSemivariogram`.

## Code Quality

- The two pure helpers carry clear comments explaining the semivariance formula and the exclusion rules.
- Components are small and focused so the instructor can read the source during the demo if needed.
- No external GIS, math, or charting libraries. Only React + ReactDOM + Babel via CDN.

## Success Criteria

- Instructor can demo all five teaching points in under 3 minutes.
- Single file is portable to any laptop with a modern browser and internet access.
- Calculations on the smooth preset match a hand calculation for h = 1 and h = √2.
- Switching preset or direction mode visibly resets and rebuilds the semivariogram.
- Layout remains usable when projected at 1080p, 1440p, and 4K.
