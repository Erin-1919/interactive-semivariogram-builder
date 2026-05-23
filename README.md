# Interactive Semivariogram Builder

A teaching demo for Ordinary Kriging — a 21-slide web-based deck with two interactive
companion apps for empirical semivariogram construction.

## Teaching demo deck

The repo root (`index.html`) is a 21-slide web-based teaching deck on Ordinary Kriging.
Scroll to advance slides; use `←` / `→` / `Home` / `End` for keyboard navigation; press
`f` to toggle fullscreen. On slide 10, click the table to reveal answers row by row.

The deck launches two interactive companion apps in new tabs:

- **[3×3 walkthrough](three.html)** — hand-calculate the semivariogram from a 3×3 grid
  of lecture-slide values.
- **[10×10 explorer](ten.html)** — build the empirical semivariogram on a 10×10 grid
  with three preset patterns (smooth / random / clustered) and fit a theoretical model
  (Spherical, Exponential, or Gaussian).

## Hosting

Served via GitHub Pages from the repo root. The deck is the homepage:
[https://erin-1919.github.io/interactive-semivariogram-builder/](https://erin-1919.github.io/interactive-semivariogram-builder/)

## Local development

No build step. Open `index.html` (or `three.html` / `ten.html`) directly in a modern
browser.

To run the smoke tests:

```bash
python verify.py
```

Requires Playwright + Chromium installed in the active Python environment.

## Files

| Path | Purpose |
|---|---|
| `index.html` | 21-slide teaching deck. |
| `three.html` | 3×3 hand-calculation walkthrough app. |
| `ten.html` | 10×10 explorer with empirical lags and model fitting. |
| `lib/semivariogram.js` | Shared math, React components, and in-browser self-tests. |
| `lib/theme.css` | Shared CSS variables and base styles. |
| `assets/img/` | Slide images extracted from the lecture PowerPoint. |
| `gen_datasets.py` | Python script that generated the three 10×10 preset grids. |
| `verify.py` | Playwright smoke test (renders all three pages, checks console, drives the UI). |
| `docs/superpowers/specs/` | Approved design spec. |
| `docs/superpowers/plans/` | Implementation plan. |

## License

MIT.
