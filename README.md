# Interactive Semivariogram Builder

A single-page teaching demo for Ordinary Kriging. Built to extend a manual 3×3 rainfall-grid exercise to a 10×10 computational example, so students can see how an empirical semivariogram is constructed from point pairs.

## Run it

Open `index.html` in any modern browser. No build step. React 18, Babel-standalone, and Google Fonts load from CDN, so an internet connection is needed the first time.

## What you can demonstrate

1. A semivariogram is built from pairs of observed points.
2. Lag distance `h` covers exact Euclidean separations: `h = 1, √2, 2, √5, 2√2, 3, …` — direct neighbours are distinct from diagonals.
3. Unknown cells (shown as `?`) are excluded from the calculation but remain visible to motivate interpolation.
4. The empirical γ(h) rises with `h` and plateaus around the sill when there is spatial autocorrelation.
5. Different spatial patterns (smooth, random, clustered) produce visibly different semivariograms.

The empirical semivariogram is limited to `h ≤ 5` (about half the grid extent — the standard rule of thumb), so the far-lag drop caused by small pair counts is hidden.

## Controls

- **Dataset preset** — smooth (with sill), random (flat γ), clustered (hole effect).
- **Direction mode** — cardinal only (matches the manual exercise) or all directions (omnidirectional).
- **Show fitted spherical model** — overlays an auto-fit spherical variogram with nugget, sill, and range.
- **Lag chips** — every distinct distance up to `h ≤ 5`. Click to reveal up to that lag.
- **Step controls** — Previous, Next, Reset. Also `←`, `→`, `Home`.
- **Hover on a known cell** — fades the rest of the grid and highlights only that cell's pairs at the current lag.

## Files

| Path | Purpose |
|---|---|
| `index.html` | The complete self-contained app. |
| `gen_datasets.py` | Python script that generated the three preset grids. |
| `verify.py` | Playwright smoke test (renders the page, checks console, drives the UI). |
| `docs/superpowers/specs/` | Approved design spec. |
| `docs/superpowers/plans/` | Implementation plan. |

## License

MIT.
