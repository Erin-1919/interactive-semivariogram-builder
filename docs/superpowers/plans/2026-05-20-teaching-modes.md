# Teaching Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the single-page semivariogram app into a guided teaching tool with a 3×3 Guided Demo mode and the existing 10×10 mode, sharing a tabbed right panel (Formula / Calculation / Plot), a soft-scaffold step bar, click-to-edit cells, a three-model fit overlay, and a conceptual prediction sub-mode inside 10×10.

**Architecture:** All code remains in a single self-contained `index.html` (React 18 + Babel-standalone via CDN — no build step). Inside the `<script type="text/babel">` block, code is organised top-to-bottom: constants & datasets → pure helpers → shared UI components → mode components → `App`. The two mode components (`ThreeByThreeMode`, `TenByTenMode`) own their state; the top-level `App` is a mode router plus the selector chrome and keyboard handler.

**Tech Stack:** React 18 + ReactDOM (CDN), Babel-standalone (in-browser JSX). Google Fonts (Fraunces / Manrope / JetBrains Mono). Playwright (Python) for the `verify.py` smoke test.

**Spec:** `docs/superpowers/specs/2026-05-20-teaching-modes-design.md`

---

## File Structure

This work touches three files:

- **`index.html`** — almost all of the work lands here. Refactored into clearly-marked sections so future features have an obvious home. Estimated final length 2200–2800 lines.
- **`verify.py`** — extended with new assertions for the mode selector, the 3×3 step bar, click-to-edit, and the Prediction toggle.
- **`docs/superpowers/specs/2026-05-20-teaching-modes-design.md`** — already written; treat as the source of truth.

The in-browser self-tests live inside `index.html` (search for the `runTests` IIFE around line 638). They run on every page load and emit the `[semivariogram tests done]` banner that `verify.py` already checks for. New helpers grow this block.

---

## Conventions used in this plan

- **"Open in browser"** = open `index.html` directly (`file://` works). Watch the DevTools console for `ok` / `FAIL:` lines and the `[semivariogram tests done]` banner.
- **`verify.py`** runs in headless Chromium and is the closest thing to an automated test. Run it after every UI change.
- **Commits** are one per task. Use the message body shown in each task; replace bracketed `[brief]` with a sentence describing the actual change if you deviated.
- **Line numbers** in `Modify:` paths refer to the file *before* the task starts. They will drift; if the anchor text in the step doesn't match, search for it.

---

## Phase 1 — Pure-helper library

### Task 1: Add 3×3 dataset and `cardinalOnly` option to `computePairs`

The 3×3 mode needs a fixed dataset and cardinal-only pair enumeration. The existing `computePairs(grid, allDirections)` already supports cardinal-only via `allDirections = false`, but the call signature is fragile (boolean positional arg). Replace it with an options object and add the 3×3 dataset alongside the existing `DATASETS` constant.

**Files:**
- Modify: `index.html` (DATASETS block ~line 515; `computePairs` ~line 583; both call sites)

- [ ] **Step 1: Add the expected-value assertions to the in-browser tests**

Add a new test block to the `runTests` IIFE in `index.html`, just before `console.log('%c[semivariogram tests done]', …)`. Hand-computed values for the fixed 3×3 grid `[[14,16,18],[12,14,17],[10,13,15]]` with cardinal-only pairs:

```javascript
  // Test 5: 3×3 fixed grid, cardinal-only — matches the lecture-slide hand calc.
  //   h = 1: 12 pairs; sumSq = 52; γ(1) = 52/24
  //   h = 2: 6 pairs;  sumSq = 100; γ(2) = 100/12
  {
    const grid = [[14, 16, 18], [12, 14, 17], [10, 13, 15]];
    const lags = computeSemivariogram(computePairs(grid, { cardinalOnly: true }));
    eq(lags.length, 2, 'T5: two distinct lags (h=1, h=2)');
    eq(lags[0].h, 1, 'T5: first lag is h=1');
    eq(lags[0].n, 12, 'T5: N(1) = 12');
    eq(lags[0].sumSq, 52, 'T5: sumSq(1) = 52');
    eq(lags[0].gamma, 52 / 24, 'T5: γ(1) = 52/24');
    eq(lags[1].h, 2, 'T5: second lag is h=2');
    eq(lags[1].n, 6, 'T5: N(2) = 6');
    eq(lags[1].sumSq, 100, 'T5: sumSq(2) = 100');
    eq(lags[1].gamma, 100 / 12, 'T5: γ(2) = 100/12');
  }
```

- [ ] **Step 2: Run page, confirm Test 5 FAILs**

Open `index.html` in a browser. DevTools console must show `FAIL:` lines for T5 (`computePairs` will throw or misbehave because the options object isn't supported yet). The `[semivariogram tests done]` banner should still appear after the failures.

- [ ] **Step 3: Update `computePairs` signature to accept an options object**

Replace the `computePairs` function (around line 583) with:

```javascript
function computePairs(grid, opts = {}) {
  // Back-compat: a bare `true`/`false` was the old `allDirections` boolean.
  if (opts === true) opts = { cardinalOnly: false };
  else if (opts === false) opts = { cardinalOnly: true };
  const cardinalOnly = !!opts.cardinalOnly;
  const maxLag = opts.maxLag;

  const known = [];
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const v = grid[r][c];
      if (v !== null && v !== undefined) known.push({ r, c, v });
    }
  }
  const pairs = [];
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      const a = known[i], b = known[j];
      const dr = b.r - a.r, dc = b.c - a.c;
      if (cardinalOnly && dr !== 0 && dc !== 0) continue;
      const dist = Math.sqrt(dr * dr + dc * dc);
      if (maxLag !== undefined && dist > maxLag + 1e-9) continue;
      pairs.push({
        a, b, dist,
        key: dist.toFixed(6),
        label: dist.toFixed(2),
        sqDiff: (a.v - b.v) ** 2,
        dr, dc
      });
    }
  }
  return pairs;
}
```

- [ ] **Step 4: Update existing `computePairs` call sites to use the new signature**

The current call is `computePairs(grid, allDirections)`. The boolean back-compat shim handles this without changes, but update the call for clarity. In `App` (around line 1013):

```javascript
const pairs = useMemo(
  () => computePairs(grid, { cardinalOnly: !allDirections }),
  [grid, allDirections]
);
```

Existing tests T1–T4 pass plain booleans (`true` / `false`); the back-compat shim keeps them working — leave them as-is so we still test the legacy call path.

- [ ] **Step 5: Add the 3×3 dataset constant**

Just above the existing `const DATASETS = {` block (around line 515), add:

```javascript
// ------------------------------------------------------------------
// 3×3 fixed rainfall grid — matches the lecture slides.
// Cardinal-only mode produces exactly h = 1 (12 pairs) and h = 2 (6 pairs).
// ------------------------------------------------------------------
const DATASET_3X3 = {
  label: '3×3 rainfall demo',
  blurb: 'A 3×3 rainfall grid for a hand-calculated semivariogram.',
  grid: [
    [14, 16, 18],
    [12, 14, 17],
    [10, 13, 15]
  ]
};
```

Rename the existing `DATASETS` constant to `DATASETS_10X10` and update its single reference in `App`:

```javascript
const preset = DATASETS_10X10[presetKey];
...
{Object.entries(DATASETS_10X10).map(([k, d]) => …)}
```

Rename `MAX_LAG` to `MAX_LAG_10X10` everywhere it appears (declaration around line 581, usage in `App` around line 1014, the `panel-sub` around line 1190, and the in-browser test T4 — leave T4's local literal `3` alone; only update the JSDoc/comment).

- [ ] **Step 6: Run page, confirm all tests pass**

Open `index.html`. DevTools console must show:
- `ok  ` lines for T1–T5.
- No `FAIL:` lines.
- The blue `[semivariogram tests done]` banner.

Also confirm the existing 10×10 UI still works end-to-end (preset switching, lag chips, hover, model toggle).

- [ ] **Step 7: Commit**

```powershell
git add index.html
git commit -m "Add 3x3 dataset and cardinalOnly option to computePairs

Generalizes computePairs to an options-object signature (cardinalOnly,
maxLag), preserving the old boolean signature for the in-browser tests.
Adds the fixed 3x3 lecture grid and the expected-gamma assertions for
h=1 and h=2. Renames DATASETS/MAX_LAG to their 10x10-specific names so
the 3x3 doesn't collide.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Generalize the model fit to three models (Spherical, Exponential, Gaussian)

Replace `fitSphericalModel` / `sphericalGamma` with `fitModel(name, lags)` and `modelGamma(model, h)` that handle all three model families from the same fitted parameters `{ name, c0, c1, a }`.

**Files:**
- Modify: `index.html` (model functions ~line 793–808; `SemivariogramPlot` consumer ~line 843)

- [ ] **Step 1: Add monotonicity tests for the three models**

Add to the `runTests` IIFE just before the banner:

```javascript
  // Test 6: modelGamma is monotonic non-decreasing on [0, 2a] for c0, c1 ≥ 0.
  {
    const model = (name) => ({ name, c0: 0.5, c1: 2, a: 3 });
    for (const name of ['spherical', 'exponential', 'gaussian']) {
      const m = model(name);
      let prev = -Infinity;
      let ok = true;
      for (let h = 0; h <= 6; h += 0.1) {
        const g = modelGamma(m, h);
        if (g + 1e-9 < prev) { ok = false; break; }
        prev = g;
      }
      eq(ok ? 1 : 0, 1, 'T6: ' + name + ' is monotonic non-decreasing');
    }
    // At h = 0 every model returns the nugget exactly.
    eq(modelGamma(model('spherical'), 0), 0.5, 'T6: spherical(0) = c0');
    eq(modelGamma(model('exponential'), 0), 0.5, 'T6: exponential(0) = c0');
    eq(modelGamma(model('gaussian'), 0), 0.5, 'T6: gaussian(0) = c0');
    // At h ≫ a every model approaches the sill.
    const big = 50;
    const sph = modelGamma(model('spherical'), big);
    const exp = modelGamma(model('exponential'), big);
    const gau = modelGamma(model('gaussian'), big);
    eq(sph, 2.5, 'T6: spherical reaches c0+c1 above range');
    eq(Math.abs(exp - 2.5) < 0.01 ? 1 : 0, 1, 'T6: exponential approaches c0+c1');
    eq(Math.abs(gau - 2.5) < 0.01 ? 1 : 0, 1, 'T6: gaussian approaches c0+c1');
  }
```

- [ ] **Step 2: Run page, confirm T6 FAILs**

`modelGamma` doesn't exist yet — every T6 assertion fails. Banner still appears.

- [ ] **Step 3: Replace the model functions**

Replace the entire block `fitSphericalModel` + `sphericalGamma` (lines ~788 to ~808) with:

```javascript
// ------------------------------------------------------------------
// Theoretical models — auto-fit from the revealed empirical lags.
//   spherical:   c0 + c1 · (1.5·(h/a) − 0.5·(h/a)³)   h ≤ a
//                c0 + c1                              h > a
//   exponential: c0 + c1 · (1 − exp(−3·h/a))
//   gaussian:    c0 + c1 · (1 − exp(−3·(h/a)²))
// The factor 3 in exponential/Gaussian gives a "practical range" at h = a
// (γ reaches ~95 % of the sill), matching the spherical convention.
// ------------------------------------------------------------------
function fitModel(name, revealedLags) {
  if (!revealedLags || revealedLags.length < 2) return null;
  const sorted = [...revealedLags].sort((a, b) => a.h - b.h);
  const c0 = Math.max(0, sorted[0].gamma);
  const sill = Math.max(...sorted.map(l => l.gamma));
  const c1 = Math.max(0.0001, sill - c0);
  const threshold = c0 + 0.95 * c1;
  const reached = sorted.find(l => l.gamma >= threshold);
  const a = reached ? reached.h : sorted[sorted.length - 1].h;
  return { name, c0, c1, a, sill: c0 + c1 };
}

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

- [ ] **Step 4: Update `SemivariogramPlot` to use the new API**

Find `const model = showModel ? fitSphericalModel(visibleLags) : null;` (around line 843) and replace with a single signature change. For now, keep `showModel` as a boolean — the 10×10 mode will switch this to a `modelName` prop in a later task. Replace the entire `SemivariogramPlot` prop list and body opening to accept either:

```javascript
function SemivariogramPlot({ lags, selectedIdx, revealedCount, modelName = 'none', width = 540, height = 340 }) {
  const margin = { top: 22, right: 28, bottom: 56, left: 68 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const visibleLags = lags.slice(0, revealedCount);
  ...
  const model = modelName !== 'none' ? fitModel(modelName, visibleLags) : null;
  let modelPath = null;
  if (model) {
    const samples = 80;
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const h = (i / samples) * maxH * 1.05;
      pts.push(`${i === 0 ? 'M' : 'L'} ${xScale(h)} ${yScale(modelGamma(model, h))}`);
    }
    modelPath = pts.join(' ');
  }
  ...
```

…and update the model label below the curve to read the model name dynamically:

```javascript
      {modelPath && (
        <g>
          <path className="model-curve" d={modelPath} />
          <text className="model-label"
            x={xScale(maxH * 0.98)}
            y={yScale(model.sill) - 8}
            textAnchor="end">
            {model.name}: c₀={model.c0.toFixed(1)}, sill={model.sill.toFixed(1)}, a={model.a.toFixed(1)}
          </text>
        </g>
      )}
```

- [ ] **Step 5: Update `App` to pass `modelName` instead of `showModel`**

In `App` (around line 1006 and line 1203), change:

```javascript
const [showModel, setShowModel] = useState(false);
...
showModel={showModel}
```

…to:

```javascript
const [modelName, setModelName] = useState('none');
...
modelName={modelName}
```

…and update the checkbox so it toggles between `'none'` and `'spherical'` (the radio for picking which model goes into TenByTenMode in a later task; for now we keep the existing checkbox UX):

```javascript
<input type="checkbox" className="model-toggle"
  checked={modelName !== 'none'}
  onChange={e => setModelName(e.target.checked ? 'spherical' : 'none')} />
Show fitted spherical model
```

- [ ] **Step 6: Run page, confirm tests pass and the model overlay still draws**

Open `index.html`. Console must show `ok  ` lines for T1–T6 and the banner. The spherical-model checkbox in the 10×10 UI must still draw the curve when checked.

- [ ] **Step 7: Commit**

```powershell
git add index.html
git commit -m "Generalize model fit to spherical/exponential/Gaussian

Replaces fitSphericalModel/sphericalGamma with fitModel(name, lags) and
modelGamma(model, h). Same nugget/sill/range fit drives all three model
shapes. SemivariogramPlot now takes modelName ('none' | 'spherical' |
'exponential' | 'gaussian'); App still drives it from the existing
checkbox until TenByTenMode adds the radio.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Add `predictionWeights` helper

Conceptual prediction: for a target unknown cell, take the k nearest known cells, weight them by `1 / d²`, normalize so weights sum to 1, return the weighted average and a normalised "uncertainty" between 0 and 1.

**Files:**
- Modify: `index.html` (add helper near the other pure helpers ~line 690)

- [ ] **Step 1: Add the prediction tests**

Add to the `runTests` IIFE before the banner:

```javascript
  // Test 7: predictionWeights — weights sum to 1; zHat bounded by neighbour values.
  {
    const target = { r: 0, c: 0 };
    const knowns = [
      { r: 0, c: 1, v: 10 },
      { r: 1, c: 0, v: 20 },
      { r: 1, c: 1, v: 30 },
      { r: 5, c: 5, v: 100 }
    ];
    const out = predictionWeights(target, knowns, 3);
    eq(out.neighbors.length, 3, 'T7: takes the 3 nearest neighbours');
    const sumW = out.neighbors.reduce((s, n) => s + n.w, 0);
    eq(Math.abs(sumW - 1) < 1e-9 ? 1 : 0, 1, 'T7: weights sum to 1');
    const minV = Math.min(...out.neighbors.map(n => n.cell.v));
    const maxV = Math.max(...out.neighbors.map(n => n.cell.v));
    eq(out.zHat >= minV - 1e-9 && out.zHat <= maxV + 1e-9 ? 1 : 0, 1,
       'T7: zHat is within [min, max] of selected neighbours');
    eq(out.u >= 0 && out.u <= 1 ? 1 : 0, 1, 'T7: uncertainty in [0,1]');
  }
```

- [ ] **Step 2: Run page, confirm T7 FAILs**

`predictionWeights` is undefined, so the test throws and prints a `FAIL:` (the `eq` helper logs failures; the throw shows in console as an uncaught error). The banner still appears.

- [ ] **Step 3: Add the helper**

Insert immediately after `computeSemivariogram` (around line 632), before the `runTests` IIFE:

```javascript
// ------------------------------------------------------------------
// Conceptual prediction weights — inverse-distance, NOT Ordinary Kriging.
// Used by the 10×10 "Predict at unknown" sub-mode to show that nearby
// stations contribute, weights sum to 1, and uncertainty grows with
// distance. Real OK derives weights from the fitted variogram.
// ------------------------------------------------------------------
function predictionWeights(target, knownCells, k = 6, maxLag = MAX_LAG_10X10) {
  const withDist = knownCells.map(cell => {
    const dr = cell.r - target.r;
    const dc = cell.c - target.c;
    return { cell, d: Math.sqrt(dr * dr + dc * dc) };
  });
  withDist.sort((a, b) => a.d - b.d);
  const chosen = withDist.slice(0, k);
  const eps = 1e-6;
  const rawWeights = chosen.map(n => 1 / (n.d * n.d + eps));
  const sumRaw = rawWeights.reduce((s, w) => s + w, 0);
  const neighbors = chosen.map((n, i) => ({
    cell: n.cell,
    d: n.d,
    w: rawWeights[i] / sumRaw
  }));
  const zHat = neighbors.reduce((s, n) => s + n.w * n.cell.v, 0);
  const meanD = neighbors.reduce((s, n) => s + n.d, 0) / neighbors.length;
  const u = Math.min(1, meanD / maxLag);
  return { neighbors, zHat, u };
}
```

- [ ] **Step 4: Run page, confirm all tests pass**

Open `index.html`. Console must show `ok  ` for T1–T7 and the banner. No `FAIL:` lines, no uncaught errors.

- [ ] **Step 5: Commit**

```powershell
git add index.html
git commit -m "Add conceptual prediction-weights helper

predictionWeights(target, knowns, k=6) takes the k nearest known cells,
weights them by 1/d^2, normalizes so weights sum to 1, returns the
weighted-average prediction and a 0-1 uncertainty derived from mean
neighbour distance. Explicitly inverse-distance, not Ordinary Kriging.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Shared UI primitives

These four tasks add the new reusable components. They are added without yet wiring them into the existing `App`; later tasks build the mode components that consume them. Each task is small.

### Task 4: Add the `StepBar` component

A horizontal numbered stepper. Takes the list of step labels, the active index (1-based), and an `onStep(i)` callback. Clicking any step jumps to it.

**Files:**
- Modify: `index.html` (CSS at the end of `<style>`; component just above `App`)

- [ ] **Step 1: Add the CSS**

Insert before the `/* RESPONSIVE */` block (around line 486) inside `<style>`:

```css
  /* STEP BAR */
  .step-bar {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    background: var(--paper-soft);
    border: 1px solid var(--rule);
    border-radius: 4px;
    margin-bottom: 20px;
    overflow-x: auto;
  }
  .step-bar .step-item {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 3px;
    cursor: pointer;
    color: var(--ink-soft);
    font-family: 'Manrope', sans-serif;
    font-size: 13px;
    font-weight: 500;
    text-align: left;
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .step-bar .step-item:hover { background: var(--paper-deep); }
  .step-bar .step-item.active {
    background: var(--accent);
    color: var(--paper-soft);
    border-color: var(--accent);
  }
  .step-bar .step-item.active .step-num {
    background: var(--paper-soft);
    color: var(--accent);
  }
  .step-bar .step-num {
    flex-shrink: 0;
    width: 22px; height: 22px;
    border-radius: 50%;
    background: var(--paper-deep);
    color: var(--ink-soft);
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .step-bar .step-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  @media (max-width: 1280px) {
    .step-bar .step-label { display: none; }
    .step-bar .step-item { flex: 0 0 auto; }
  }
```

- [ ] **Step 2: Add the `StepBar` component**

Insert just above `function App() {` (around line 1003):

```javascript
// ------------------------------------------------------------------
// StepBar — horizontal numbered scaffold. Soft-scaffold: clicking any
// step jumps to it, nothing is gated.
// ------------------------------------------------------------------
function StepBar({ steps, activeStep, onStep }) {
  return (
    <div className="step-bar" role="tablist">
      {steps.map((label, i) => {
        const idx = i + 1;
        const isActive = idx === activeStep;
        return (
          <button
            key={idx}
            type="button"
            className={`step-item ${isActive ? 'active' : ''}`}
            onClick={() => onStep(idx)}
            title={`${idx}. ${label}`}
          >
            <span className="step-num">{idx}</span>
            <span className="step-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Smoke-render it from App temporarily to verify CSS**

Just for this task, drop a temporary preview into `App`'s return — directly inside the opening `<div className="app">`, above `<header>`:

```javascript
      <div style={{ padding: '20px 48px' }}>
        <StepBar
          steps={['Grid', 'Lag', 'Pairs', 'Diff', 'Square', 'Sum', '÷2N', 'Plot', 'Repeat', 'Fit']}
          activeStep={4}
          onStep={(i) => console.log('step', i)}
        />
      </div>
```

Open `index.html`. The step bar must render with step 4 highlighted in `--accent`; clicking any step logs the index. Resize the window narrower than 1280 px — labels collapse to just numbered circles.

- [ ] **Step 4: Remove the smoke preview**

Delete the temporary `<div style={{ padding: '20px 48px' }}>…</div>` block. Open the page again; the existing 10×10 UI must look unchanged. In-browser tests still pass.

- [ ] **Step 5: Commit**

```powershell
git add index.html
git commit -m "Add StepBar component for guided-mode scaffold

Horizontal numbered stepper. Soft-scaffold semantics (clicking any step
jumps to it, no gating). Collapses to icon-only below 1280 px so a
10-step bar still fits on narrow projectors.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Add the `TabbedPanel` component

A tab strip with a single visible content slot. Takes the list of tabs (`{ key, label }`), the active key, an `onTab(key)` callback, and a `children` map keyed by tab key.

**Files:**
- Modify: `index.html` (CSS; component just below `StepBar`)

- [ ] **Step 1: Add the CSS**

Insert into `<style>` just below the `.step-bar` styles you added in Task 4:

```css
  /* TABBED PANEL */
  .tabbed-panel {
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .tabbed-panel .tabs {
    display: flex;
    border-bottom: 1px solid var(--rule);
    background: var(--paper-soft);
  }
  .tabbed-panel .tab {
    flex: 1;
    background: transparent;
    border: none;
    padding: 14px 18px;
    font-family: 'Manrope', sans-serif;
    font-size: 15px;
    font-weight: 500;
    color: var(--ink-mute);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    border-right: 1px solid var(--rule);
  }
  .tabbed-panel .tab:last-child { border-right: none; }
  .tabbed-panel .tab:hover { color: var(--ink); background: var(--paper-deep); }
  .tabbed-panel .tab.active {
    color: var(--accent);
    border-bottom-color: var(--accent);
    background: var(--paper);
  }
  .tabbed-panel .tab-body {
    padding: 22px 26px;
    flex: 1;
    overflow-y: auto;
  }
```

- [ ] **Step 2: Add the `TabbedPanel` component**

Insert just below `StepBar`:

```javascript
// ------------------------------------------------------------------
// TabbedPanel — tab strip plus a single visible content slot.
// `tabs` is [{ key, label }]; `children` is a map { [key]: ReactNode }.
// ------------------------------------------------------------------
function TabbedPanel({ tabs, activeTab, onTab, children }) {
  return (
    <div className="tabbed-panel" role="tablist">
      <div className="tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            className={`tab ${t.key === activeTab ? 'active' : ''}`}
            onClick={() => onTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-body" role="tabpanel">
        {children[activeTab]}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke-render it from App temporarily**

Drop a temporary preview into `App`'s return, directly inside `<div className="app">` above `<header>`:

```javascript
      <div style={{ padding: '20px 48px' }}>
        <TabbedPanel
          tabs={[
            { key: 'a', label: 'γ(h) Formula' },
            { key: 'b', label: 'Calculation' },
            { key: 'c', label: 'Semivariogram plot' }
          ]}
          activeTab={'b'}
          onTab={(k) => console.log('tab', k)}
        >
          {{
            a: <p>Formula goes here.</p>,
            b: <p>Calculation table goes here.</p>,
            c: <p>Plot goes here.</p>
          }}
        </TabbedPanel>
      </div>
```

Open `index.html`. The tab strip must render with **Calculation** active (accent underline). Clicking the other two tabs logs the key — but the body doesn't change yet because `activeTab` is hard-coded. That's fine: we're verifying the structure renders.

- [ ] **Step 4: Remove the smoke preview**

Delete the temporary block. Page returns to existing 10×10 UI.

- [ ] **Step 5: Commit**

```powershell
git add index.html
git commit -m "Add TabbedPanel component for the right-side panel

Tab strip with a single visible content slot. Active tab gets a 2px
accent underline. Caller passes children as a key-keyed map.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Add the `FormulaPanel` component

The γ(h) formula with parts that highlight by a `highlight` prop driven by the step bar. Plain-language captions sit below.

**Files:**
- Modify: `index.html` (CSS; component below `TabbedPanel`)

- [ ] **Step 1: Add the CSS**

Insert below the `.tabbed-panel` styles:

```css
  /* FORMULA PANEL */
  .formula-panel { font-family: 'Fraunces', serif; }
  .formula-panel .big-formula {
    font-size: 30px;
    font-style: italic;
    line-height: 1.6;
    text-align: center;
    color: var(--ink-soft);
    padding: 18px 0;
    background: var(--paper-deep);
    border-radius: 4px;
    margin-bottom: 18px;
  }
  .formula-panel .big-formula .term {
    padding: 2px 4px;
    border-radius: 3px;
    transition: background 0.15s, color 0.15s;
  }
  .formula-panel .big-formula .term.hi {
    background: var(--accent-pale);
    color: var(--accent-deep);
    font-weight: 500;
  }
  .formula-panel .caption {
    font-family: 'Manrope', sans-serif;
    font-style: normal;
    font-size: 15px;
    color: var(--ink-soft);
    line-height: 1.55;
    margin-bottom: 12px;
  }
  .formula-panel .caption strong { color: var(--accent); }
```

- [ ] **Step 2: Add the component**

Insert below `TabbedPanel`:

```javascript
// ------------------------------------------------------------------
// FormulaPanel — γ(h) with terms that highlight based on `highlight`.
//   highlight ∈ 'h' | 'z_i' | 'z_j' | 'diff' | 'sq' | 'sum' | 'N' | 'oneOver2N' | null
// ------------------------------------------------------------------
function FormulaPanel({ highlight }) {
  const klass = (key) => 'term' + (highlight === key ? ' hi' : '');
  const captions = {
    null:        'Press the next step to walk through each piece of this formula.',
    h:           <span><strong>h</strong> is the lag distance — the spacing between the two stations in each pair.</span>,
    z_i:         <span><strong>Z(x<sub>i</sub>)</strong> is one observed rainfall value at station <em>x<sub>i</sub></em>.</span>,
    z_j:         <span><strong>Z(x<sub>i</sub> + h)</strong> is the rainfall value at the station <em>h</em> away.</span>,
    diff:        <span><strong>The difference</strong> of the two paired values tells us how alike they are.</span>,
    sq:          <span><strong>Squaring</strong> the difference removes the sign and emphasises large gaps.</span>,
    sum:         <span><strong>Σ</strong> sums the squared differences across every valid pair at this lag.</span>,
    N:           <span><strong>N(h)</strong> is the number of valid pairs at this lag.</span>,
    oneOver2N:   <span><strong>1 / [2N(h)]</strong> turns the sum into an average and then halves it — that is the semivariance γ(h).</span>
  };
  const caption = captions[highlight] !== undefined ? captions[highlight] : captions[null];
  return (
    <div className="formula-panel">
      <div className="big-formula">
        γ(<span className={klass('h')}>h</span>) ={' '}
        <span className={klass('oneOver2N')}>1 / [2<span className={klass('N')}>N(h)</span>]</span>{' '}
        ·{' '}
        <span className={klass('sum')}>Σ</span>{' '}
        <span className={klass('sq')}>[
          <span className={klass('z_i')}>Z(x<sub>i</sub>)</span>{' '}−{' '}
          <span className={klass('z_j')}>Z(x<sub>i</sub> + h)</span>
        ]<sup>2</sup></span>
      </div>
      <div className="caption">{caption}</div>
      <div className="caption" style={{ color: 'var(--ink-mute)' }}>
        Plain-language: how different are paired observations, on average, at a given distance?
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke-render with various highlights**

Drop a temporary preview into `App`'s return (above `<header>`):

```javascript
      <div style={{ padding: '20px 48px', display: 'grid', gap: 20 }}>
        <FormulaPanel highlight={null} />
        <FormulaPanel highlight={'h'} />
        <FormulaPanel highlight={'diff'} />
        <FormulaPanel highlight={'oneOver2N'} />
      </div>
```

Open `index.html`. Four formula panels render; each highlights a different term in `--accent-pale`. The caption below each panel changes to match the highlight.

- [ ] **Step 4: Remove the smoke preview**

Delete the temporary block.

- [ ] **Step 5: Commit**

```powershell
git add index.html
git commit -m "Add FormulaPanel with highlightable terms

The γ(h) formula breaks into spans that highlight based on a single
`highlight` prop driven by the step bar. Plain-language captions
underneath change to match the highlighted term.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Add the `CalculationTable` component

Replaces the table portion of the existing `CalculationSummary`. Takes a `lag` (the selected lag with `pairs`, `n`, `sumSq`, `gamma`) and a `revealColumns` set (`{ diff, sq, sum, gamma }`) so the step bar can populate columns gradually. Caps display at 8 rows like today.

**Files:**
- Modify: `index.html` (CSS — extend existing; new component below `FormulaPanel`)

- [ ] **Step 1: Add the CSS extensions**

Insert below the `.formula-panel` styles you added in Task 6:

```css
  /* CALCULATION TABLE */
  .calc-table { font-family: 'Manrope', sans-serif; color: var(--ink-soft); }
  .calc-table .head-line {
    display: flex; justify-content: space-between; align-items: baseline;
    padding: 6px 0;
    border-bottom: 1px dashed var(--rule-soft);
    font-family: 'Fraunces', serif;
    font-style: italic;
    color: var(--ink-mute);
    margin-bottom: 12px;
  }
  .calc-table .head-line strong {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 500;
    color: var(--ink);
    font-style: normal;
  }
  .calc-table table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'JetBrains Mono', monospace;
    font-size: 15px;
  }
  .calc-table th, .calc-table td {
    padding: 6px 8px;
    text-align: left;
    border-bottom: 1px dotted var(--rule);
  }
  .calc-table th {
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-mute);
    border-bottom: 1px solid var(--rule);
  }
  .calc-table .hidden-cell { color: var(--rule); }
  .calc-table .sq { color: var(--accent); font-weight: 500; }
  .calc-table .footer {
    margin-top: 12px;
    padding-top: 10px;
    border-top: 1px solid var(--rule);
    font-family: 'JetBrains Mono', monospace;
    display: grid;
    grid-template-columns: auto 1fr;
    row-gap: 6px;
    column-gap: 14px;
  }
  .calc-table .footer .label {
    font-family: 'Fraunces', serif;
    font-style: italic;
    color: var(--ink-mute);
  }
  .calc-table .footer .val { font-weight: 500; color: var(--ink); }
  .calc-table .footer .val.big {
    color: var(--accent);
    font-size: 20px;
  }
  .calc-table .empty {
    border: 1px dashed var(--rule);
    padding: 22px;
    color: var(--ink-mute);
    font-family: 'Fraunces', serif;
    font-style: italic;
    text-align: center;
  }
```

- [ ] **Step 2: Add the component**

Insert below `FormulaPanel`:

```javascript
// ------------------------------------------------------------------
// CalculationTable — pair-by-pair calculation. `revealColumns` is a
// Set-like object with boolean flags { diff, sq, sum, gamma } so steps
// 4–7 fill in columns one at a time.
// ------------------------------------------------------------------
function CalculationTable({ lag, revealColumns = { diff: true, sq: true, sum: true, gamma: true }, maxRows = 8 }) {
  if (!lag) {
    return (
      <div className="calc-table">
        <div className="empty">Choose a lag distance to see the pair calculation.</div>
      </div>
    );
  }
  const rows = lag.pairs.slice(0, maxRows);
  const more = lag.pairs.length - rows.length;
  return (
    <div className="calc-table">
      <div className="head-line">
        <span>lag distance</span><strong>h = {lag.label}</strong>
      </div>
      <table>
        <thead>
          <tr>
            <th>(z<sub>i</sub>, z<sub>j</sub>)</th>
            <th>diff</th>
            <th>(diff)<sup>2</sup></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const diff = p.a.v - p.b.v;
            return (
              <tr key={i}>
                <td>({p.a.v}, {p.b.v})</td>
                <td className={revealColumns.diff ? '' : 'hidden-cell'}>
                  {revealColumns.diff ? diff.toFixed(0) : '…'}
                </td>
                <td className={'sq ' + (revealColumns.sq ? '' : 'hidden-cell')}>
                  {revealColumns.sq ? p.sqDiff.toFixed(0) : '…'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {more > 0 && (
        <div style={{ marginTop: 8, fontStyle: 'italic', color: 'var(--ink-mute)', fontSize: 14 }}>
          showing first {maxRows} of {lag.pairs.length} pairs
        </div>
      )}
      <div className="footer">
        <span className="label">N(h)</span>
        <span className="val">{lag.n}</span>
        <span className="label">Σ (diff)²</span>
        <span className="val">{revealColumns.sum ? lag.sumSq.toFixed(2) : '…'}</span>
        <span className="label">γ(h) = Σ / [2N(h)]</span>
        <span className="val big">{revealColumns.gamma ? lag.gamma.toFixed(2) : '…'}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Smoke-render it**

Drop into `App` (temporary):

```javascript
      <div style={{ padding: '20px 48px', display: 'grid', gap: 20 }}>
        <CalculationTable
          lag={{
            label: '1.00', h: 1, n: 12,
            sumSq: 52, gamma: 52 / 24,
            pairs: [
              { a: { v: 14 }, b: { v: 16 }, sqDiff: 4 },
              { a: { v: 16 }, b: { v: 18 }, sqDiff: 4 },
              { a: { v: 12 }, b: { v: 14 }, sqDiff: 4 }
            ]
          }}
          revealColumns={{ diff: true, sq: false, sum: false, gamma: false }}
        />
        <CalculationTable
          lag={{
            label: '1.00', h: 1, n: 12,
            sumSq: 52, gamma: 52 / 24,
            pairs: [
              { a: { v: 14 }, b: { v: 16 }, sqDiff: 4 },
              { a: { v: 16 }, b: { v: 18 }, sqDiff: 4 }
            ]
          }}
          revealColumns={{ diff: true, sq: true, sum: true, gamma: true }}
        />
      </div>
```

Open `index.html`. Two tables render. The first hides the `(diff)²`, the `Σ`, and the `γ` cells (shows `…`); the second shows everything. The `(diff)²` column is highlighted in `--accent`. The γ row is the large accent number.

- [ ] **Step 4: Remove the smoke preview**

Delete the temporary block.

- [ ] **Step 5: Commit**

```powershell
git add index.html
git commit -m "Add CalculationTable with progressive column reveal

Replaces the table portion of CalculationSummary as a standalone
component. `revealColumns` is the dial the step bar turns to fill in
diff -> sq -> sum -> gamma one at a time.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Update existing presentational components

### Task 8: Add click-to-edit and prediction-overlay support to `GridView`

`GridView` keeps its current behaviour (pair lines, hover-fade) and gains two new optional features:
1. `onEdit(r, c, value)` — when a known cell is clicked it becomes an `<input type="number">`; commit on Enter or blur, Esc cancels. Setting the input to empty restores `null` (the cell becomes a `?`). Editing a `?` cell with a number turns it into a known cell.
2. `predictTarget` + `predictNeighbors` — overlays dashed lines from the target to each neighbour with a weight label, and an outline ring around the target.
3. `editedKeys` — a Set of `"r-c"` strings that get a thin accent ring to show they were edited.

**Files:**
- Modify: `index.html` (CSS — add a few rules; `GridView` ~line 695)

- [ ] **Step 1: Add the CSS**

Insert near the existing `.cell-rect` rules (around line 68):

```css
  .cell-rect.predict-target {
    fill: var(--accent-pale);
    stroke: var(--accent);
    stroke-width: 2;
    stroke-dasharray: 4 3;
  }
  .cell-rect.edited {
    stroke: var(--accent);
    stroke-width: 1.5;
    stroke-opacity: 0.7;
  }
  .predict-line {
    stroke: var(--accent);
    stroke-width: 1.2;
    stroke-dasharray: 4 3;
    opacity: 0.75;
    fill: none;
    pointer-events: none;
  }
  .predict-weight {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    fill: var(--accent-deep);
    font-weight: 600;
    pointer-events: none;
    paint-order: stroke;
    stroke: var(--paper);
    stroke-width: 3;
  }
  .cell-edit-input {
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    text-align: center;
    border: 2px solid var(--accent);
    background: var(--paper);
    color: var(--ink);
    padding: 0;
  }
  .cell-edit-input:focus { outline: none; }
```

- [ ] **Step 2: Update `GridView` to add edit + prediction support**

Replace the entire `GridView` function (the block starting `function GridView({` around line 695, through its closing `}` around line 786) with:

```javascript
function GridView({
  grid,
  highlightedPairs,
  hoveredCell,
  onCellHover,
  size = 580,
  onEdit,                 // optional (r, c, value | null) => void
  predictTarget = null,   // optional { r, c }
  predictNeighbors = null,// optional [{ cell:{r,c,v}, w, d }]
  editedKeys = null,      // optional Set of "r-c" strings
  onTargetClick = null    // optional (cell) => void — pick a new ? cell as target
}) {
  const [editing, setEditing] = React.useState(null); // { r, c, raw }
  const N = grid.length;
  const padding = 22;
  const inner = size - padding * 2;
  const cellSize = inner / N;
  const center = (idx) => padding + idx * cellSize + cellSize / 2;

  let drawnPairs = highlightedPairs || [];
  if (hoveredCell && highlightedPairs) {
    drawnPairs = highlightedPairs.filter(p =>
      (p.a.r === hoveredCell.r && p.a.c === hoveredCell.c) ||
      (p.b.r === hoveredCell.r && p.b.c === hoveredCell.c)
    );
  }
  const inDrawn = new Set();
  drawnPairs.forEach(p => {
    inDrawn.add(`${p.a.r}-${p.a.c}`);
    inDrawn.add(`${p.b.r}-${p.b.c}`);
  });

  const hoverActive = !!hoveredCell;

  const commitEdit = (r, c, raw) => {
    setEditing(null);
    if (!onEdit) return;
    const trimmed = (raw == null ? '' : String(raw)).trim();
    if (trimmed === '') {
      onEdit(r, c, null);
      return;
    }
    const num = Number(trimmed);
    if (Number.isFinite(num)) onEdit(r, c, num);
  };

  const startEdit = (r, c, v) => {
    if (!onEdit) return;
    setEditing({ r, c, raw: v === null || v === undefined ? '' : String(v) });
  };

  const handleCellClick = (r, c, v) => {
    const isUnknown = v === null || v === undefined;
    if (isUnknown && predictTarget && onTargetClick) {
      onTargetClick({ r, c });
      return;
    }
    if (!isUnknown && onEdit) startEdit(r, c, v);
  };

  return (
    <svg className="grid-svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <pattern id="unknownPattern" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--paper-deep)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--unknown)" strokeWidth="1.5" />
        </pattern>
      </defs>

      {grid.map((row, r) =>
        row.map((v, c) => {
          const isUnknown = v === null || v === undefined;
          const k = `${r}-${c}`;
          const isHovered = hoverActive && hoveredCell.r === r && hoveredCell.c === c;
          const isInPair = inDrawn.has(k);
          const isTarget = predictTarget && predictTarget.r === r && predictTarget.c === c;
          const isEdited = editedKeys && editedKeys.has(k);
          const fade = hoverActive && !isHovered && !isInPair;
          const isEditingThis = editing && editing.r === r && editing.c === c;
          const cellClasses = [
            'cell-rect',
            isUnknown ? 'unknown' : '',
            !isUnknown && isInPair && !isHovered ? 'in-pair' : '',
            isHovered ? 'is-hovered' : '',
            isTarget ? 'predict-target' : '',
            isEdited ? 'edited' : ''
          ].filter(Boolean).join(' ');
          const interactive = !isUnknown || (isUnknown && predictTarget && onTargetClick);
          return (
            <g
              key={k}
              className={`cell-group ${fade ? 'faded' : ''} ${interactive ? 'interactive' : ''}`}
              onMouseEnter={!isUnknown ? () => onCellHover && onCellHover({ r, c }) : undefined}
              onMouseLeave={!isUnknown ? () => onCellHover && onCellHover(null) : undefined}
              onClick={interactive ? () => handleCellClick(r, c, v) : undefined}
            >
              <rect
                className={cellClasses}
                x={padding + c * cellSize}
                y={padding + r * cellSize}
                width={cellSize}
                height={cellSize}
              />
              {!isEditingThis && (
                <text
                  className={`cell-value ${isUnknown ? 'unknown' : ''} ${isHovered ? 'on-hovered' : ''}`}
                  x={center(c)}
                  y={center(r)}
                >
                  {isUnknown ? '?' : v}
                </text>
              )}
              {isEditingThis && (
                <foreignObject
                  x={padding + c * cellSize + 4}
                  y={padding + r * cellSize + 4}
                  width={cellSize - 8}
                  height={cellSize - 8}
                >
                  <input
                    className="cell-edit-input"
                    type="number"
                    autoFocus
                    value={editing.raw}
                    onChange={(e) => setEditing({ r, c, raw: e.target.value })}
                    onBlur={() => commitEdit(r, c, editing.raw)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitEdit(r, c, editing.raw); }
                      else if (e.key === 'Escape') { e.preventDefault(); setEditing(null); }
                    }}
                  />
                </foreignObject>
              )}
            </g>
          );
        })
      )}

      {drawnPairs.map((p, i) => {
        const x1 = center(p.a.c), y1 = center(p.a.r);
        const x2 = center(p.b.c), y2 = center(p.b.r);
        return (
          <g key={`pair-${i}`}>
            <line className="pair-line" x1={x1} y1={y1} x2={x2} y2={y2} />
            <circle className="pair-dot" cx={x1} cy={y1} r={3} />
            <circle className="pair-dot" cx={x2} cy={y2} r={3} />
          </g>
        );
      })}

      {predictTarget && predictNeighbors && predictNeighbors.map((n, i) => {
        const x1 = center(predictTarget.c), y1 = center(predictTarget.r);
        const x2 = center(n.cell.c), y2 = center(n.cell.r);
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        return (
          <g key={`pred-${i}`}>
            <line className="predict-line" x1={x1} y1={y1} x2={x2} y2={y2} />
            <text className="predict-weight" x={mx} y={my - 4} textAnchor="middle">
              w={n.w.toFixed(2)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 3: Wire click-to-edit into the existing `App` for smoke testing**

Just to verify the new code paths, add an `onEdit` callback in `App`. Add a local edited-cells override state (around line 1010):

```javascript
const [editedGrid, setEditedGrid] = useState(null);
const grid = editedGrid || preset.grid;
```

Replace the existing `const grid = preset.grid;` (around line 1012). Then add an `onEdit` handler:

```javascript
const onCellEdit = useCallback((r, c, value) => {
  setEditedGrid(prev => {
    const base = prev || preset.grid;
    const next = base.map(row => row.slice());
    next[r][c] = value;
    return next;
  });
}, [preset.grid]);
```

Reset edits when the preset changes:

```javascript
useEffect(() => { setEditedGrid(null); }, [presetKey]);
```

Pass `onEdit={onCellEdit}` to the existing `<GridView>` in `App`.

- [ ] **Step 4: Run page; smoke-test click-to-edit**

Open `index.html`. Click any cell in the 10×10. An input replaces the number. Type a new value, press Enter — the cell updates and the semivariogram redraws. Clear the input and press Enter — the cell becomes `?`. Click a `?` cell and type a number — it becomes a known cell. Press Escape mid-edit — the value is unchanged.

Switching presets restores the original grid (the `editedGrid` reset effect runs).

In-browser tests T1–T7 still pass.

- [ ] **Step 5: Commit**

```powershell
git add index.html
git commit -m "Add click-to-edit, prediction overlay, and edited rings to GridView

Click a known cell to edit it inline (Enter commits, Esc cancels, empty
sets ?). Click a ? cell when a target is active to re-target prediction.
predictNeighbors draws dashed weighted lines with w-labels at midpoints.
editedKeys gives each edited cell a thin accent ring. App now drives a
local editedGrid override so dataset edits survive within a preset.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Add nugget / sill / range guides to `SemivariogramPlot`

When a model is active, draw a horizontal `c0` line (nugget), a horizontal `c0 + c1` line (sill), and a vertical `x = a` line (range), each labelled in italic Fraunces.

**Files:**
- Modify: `index.html` (CSS; `SemivariogramPlot` ~line 825)

- [ ] **Step 1: Add the CSS**

Insert near the existing `.model-curve` rules (around line 388):

```css
  .model-guide {
    stroke: var(--sage);
    stroke-width: 0.8;
    stroke-dasharray: 2 4;
    opacity: 0.55;
    fill: none;
  }
  .model-guide-label {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 13px;
    fill: var(--sage);
    paint-order: stroke;
    stroke: var(--paper);
    stroke-width: 3;
  }
```

- [ ] **Step 2: Draw the guides inside `SemivariogramPlot`**

Locate the model rendering block in `SemivariogramPlot` (around line 909):

```javascript
      {modelPath && (
        <g>
          <path className="model-curve" d={modelPath} />
          <text className="model-label" ...>
            {model.name}: c₀={...}
          </text>
        </g>
      )}
```

Replace it with:

```javascript
      {modelPath && model && (() => {
        const yNugget = yScale(model.c0);
        const ySill = yScale(model.sill);
        const xRange = xScale(model.a);
        const xLeft = margin.left;
        const xRight = margin.left + innerW;
        const yTop = margin.top;
        const yBottom = margin.top + innerH;
        return (
          <g>
            <line className="model-guide" x1={xLeft} x2={xRight} y1={yNugget} y2={yNugget} />
            <text className="model-guide-label" x={xLeft + 6} y={yNugget - 4}>
              nugget c₀ = {model.c0.toFixed(2)}
            </text>
            <line className="model-guide" x1={xLeft} x2={xRight} y1={ySill} y2={ySill} />
            <text className="model-guide-label" x={xRight - 6} y={ySill - 4} textAnchor="end">
              sill c₀+c₁ = {model.sill.toFixed(2)}
            </text>
            <line className="model-guide" x1={xRange} x2={xRange} y1={yTop} y2={yBottom} />
            <text className="model-guide-label" x={xRange + 4} y={yBottom - 6}>
              range a = {model.a.toFixed(2)}
            </text>
            <path className="model-curve" d={modelPath} />
            <text className="model-label"
              x={xScale(maxH * 0.98)}
              y={ySill - 22}
              textAnchor="end">
              {model.name}
            </text>
          </g>
        );
      })()}
```

- [ ] **Step 3: Run page, eyeball each model**

Open `index.html`, enable the "Show fitted spherical model" checkbox. The plot now shows two dashed horizontal lines (`nugget c0 = …` and `sill c0+c1 = …`) and one dashed vertical line (`range a = …`), labelled in italic sage. The model curve is unchanged. Reveal more lags by clicking chips; guides re-fit.

(Exponential and Gaussian aren't yet exposed in the UI — that lands in Task 11. For now the spherical guides are enough to verify the rendering.)

- [ ] **Step 4: Commit**

```powershell
git add index.html
git commit -m "Draw nugget/sill/range guides on the semivariogram plot

Horizontal dashed lines at c0 and c0+c1, vertical dashed line at a,
each labelled in italic sage. Visible whenever any model is overlaid.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Add the `PredictionPanel` component

Renders the prediction summary that goes inside the right-side tabbed panel's fourth tab when prediction is on: the weighted-average prediction `ẑ`, the ranked weight list, the uncertainty bar, and the plain-language framing.

**Files:**
- Modify: `index.html` (CSS; component below `CalculationTable`)

- [ ] **Step 1: Add the CSS**

Insert below `.calc-table` styles you added in Task 7:

```css
  /* PREDICTION PANEL */
  .predict-panel { font-family: 'Manrope', sans-serif; color: var(--ink-soft); }
  .predict-panel .lead {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 16px;
    color: var(--ink-mute);
    margin-bottom: 14px;
    line-height: 1.5;
  }
  .predict-panel .zhat {
    font-family: 'JetBrains Mono', monospace;
    font-size: 28px;
    font-weight: 600;
    color: var(--accent);
    text-align: center;
    padding: 14px;
    background: var(--paper-deep);
    border-radius: 4px;
    margin-bottom: 14px;
  }
  .predict-panel .zhat small {
    display: block;
    font-family: 'Fraunces', serif;
    font-style: italic;
    color: var(--ink-mute);
    font-size: 14px;
    font-weight: 400;
    margin-bottom: 4px;
  }
  .predict-panel table {
    width: 100%;
    border-collapse: collapse;
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    margin-bottom: 14px;
  }
  .predict-panel th, .predict-panel td {
    padding: 6px 8px;
    text-align: right;
    border-bottom: 1px dotted var(--rule);
  }
  .predict-panel th {
    font-family: 'Manrope', sans-serif;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--ink-mute);
    border-bottom: 1px solid var(--rule);
    text-align: right;
  }
  .predict-panel th:first-child, .predict-panel td:first-child { text-align: left; }
  .predict-panel .u-bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }
  .predict-panel .u-bar .label {
    font-family: 'Fraunces', serif;
    font-style: italic;
    color: var(--ink-mute);
  }
  .predict-panel .u-bar .track {
    height: 10px;
    background: var(--paper-deep);
    border-radius: 5px;
    overflow: hidden;
  }
  .predict-panel .u-bar .fill {
    height: 100%;
    background: var(--accent);
    border-radius: 5px;
    transition: width 0.2s;
  }
  .predict-panel .u-bar .val {
    font-family: 'JetBrains Mono', monospace;
    color: var(--ink);
  }
  .predict-panel .footnote {
    font-family: 'Fraunces', serif;
    font-style: italic;
    font-size: 14px;
    color: var(--ink-mute);
    line-height: 1.5;
    border-top: 1px dashed var(--rule);
    padding-top: 12px;
  }
```

- [ ] **Step 2: Add the component**

Insert below `CalculationTable`:

```javascript
// ------------------------------------------------------------------
// PredictionPanel — right-tab content when "Predict at unknown" is on.
// ------------------------------------------------------------------
function PredictionPanel({ prediction }) {
  if (!prediction) {
    return (
      <div className="predict-panel">
        <p className="lead">
          Pick a <strong>?</strong> cell on the grid to see how nearby stations
          combine into a prediction.
        </p>
      </div>
    );
  }
  const { neighbors, zHat, u } = prediction;
  return (
    <div className="predict-panel">
      <p className="lead">
        Each nearby station contributes a <strong>weight</strong>. Weights sum to 1.
        The prediction is their weighted average.
      </p>
      <div className="zhat">
        <small>predicted value ẑ at the ? cell</small>
        ẑ = {zHat.toFixed(2)} mm
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th><th>cell</th><th>z</th><th>d</th><th>w</th>
          </tr>
        </thead>
        <tbody>
          {neighbors.map((n, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>(r{n.cell.r},c{n.cell.c})</td>
              <td>{n.cell.v}</td>
              <td>{n.d.toFixed(2)}</td>
              <td>{n.w.toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="u-bar">
        <span className="label">uncertainty</span>
        <span className="track"><span className="fill" style={{ width: `${(u * 100).toFixed(0)}%` }} /></span>
        <span className="val">{(u * 100).toFixed(0)}%</span>
      </div>
      <p className="footnote">
        Uncertainty grows with the average distance from the prediction point to
        its neighbours. This is a <strong>conceptual</strong> display —
        real Ordinary Kriging derives these weights from the fitted variogram model.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Smoke-render it**

Drop temporary into `App`:

```javascript
      <div style={{ padding: '20px 48px', maxWidth: 600 }}>
        <PredictionPanel
          prediction={{
            neighbors: [
              { cell: { r: 1, c: 1, v: 24 }, d: 1.0, w: 0.42 },
              { cell: { r: 0, c: 2, v: 22 }, d: 1.41, w: 0.22 },
              { cell: { r: 2, c: 0, v: 26 }, d: 1.41, w: 0.22 },
              { cell: { r: 0, c: 3, v: 19 }, d: 2.0, w: 0.07 },
              { cell: { r: 3, c: 0, v: 27 }, d: 2.0, w: 0.07 }
            ],
            zHat: 23.6,
            u: 0.42
          }}
        />
      </div>
```

Open `index.html`. The prediction summary renders: large `ẑ = 23.60 mm`, the weights table, a 42% uncertainty bar, and the footnote. Confirm visually.

- [ ] **Step 4: Remove the smoke preview**

Delete the temporary block.

- [ ] **Step 5: Commit**

```powershell
git add index.html
git commit -m "Add PredictionPanel for the right-tab prediction summary

Shows ẑ, the ranked weight table, a 0-100% uncertainty bar, and the
'conceptual, not Ordinary Kriging' footnote.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Mode components and the new App shell

### Task 11: Build `TenByTenMode`

Move the existing 10×10 functionality out of `App` into a `TenByTenMode` component. Adapt the UI to the new shell: grid on the left, tabbed right panel (Formula / Calculation / Plot), 5-step bar at the top, model-pick radio, click-to-edit + Reset, and the `Predict at unknown` toggle. The actual prediction wiring is finished in Task 12 — this task adds the toggle and exposes the fourth tab placeholder.

**Files:**
- Modify: `index.html` (CSS — new layout shells; new `TenByTenMode` component; `App` body becomes the mode router in Task 13)

- [ ] **Step 1: Add layout shell CSS**

Insert below the existing responsive block (just before `</style>` on line 499):

```css
  /* MODE WORKBENCH — used by both ThreeByThreeMode and TenByTenMode */
  .mode-shell {
    padding: 28px 40px 36px;
    display: grid;
    grid-template-columns: minmax(420px, 1.2fr) minmax(520px, 1.4fr);
    gap: 32px;
    align-items: start;
  }
  @media (max-width: 1280px) {
    .mode-shell { grid-template-columns: 1fr; }
  }
  .mode-shell .grid-pane { display: flex; flex-direction: column; gap: 16px; }
  .mode-shell .right-pane { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

  .mode-header {
    padding: 22px 40px 6px;
    display: flex;
    align-items: baseline;
    gap: 18px;
    flex-wrap: wrap;
  }
  .mode-header .blurb {
    font-family: 'Fraunces', serif;
    font-style: italic;
    color: var(--ink-mute);
    font-size: 16px;
  }
  .mode-header .extras { margin-left: auto; display: flex; gap: 14px; align-items: center; }

  .model-radio { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .model-radio label {
    font-family: 'Manrope', sans-serif;
    font-size: 14px;
    color: var(--ink-soft);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
  }
  .model-radio input[type=radio] { accent-color: var(--accent); }

  .whatif-footer {
    padding: 12px 40px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--rule-soft);
    font-family: 'Fraunces', serif;
    font-style: italic;
    color: var(--ink-mute);
  }
  .whatif-footer button {
    font-family: 'Manrope', sans-serif;
    font-style: normal;
    background: var(--paper-soft);
    border: 1px solid var(--rule);
    color: var(--ink);
    padding: 8px 14px;
    cursor: pointer;
  }
  .whatif-footer button:hover { background: var(--accent-pale); border-color: var(--accent); }
```

- [ ] **Step 2: Add `TenByTenMode`**

Insert just above `function App() {` (around line 1003, after all the other components):

```javascript
// ------------------------------------------------------------------
// TenByTenMode — the existing 10×10 workflow rebuilt on the shared
// shell (StepBar + grid + TabbedPanel + what-if footer).
// ------------------------------------------------------------------
const TEN_STEPS = [
  { label: 'Grid', tab: 'formula', highlight: null },
  { label: 'Pairs', tab: 'formula', highlight: 'z_i' },
  { label: 'Compute γ(h)', tab: 'calc', highlight: 'oneOver2N' },
  { label: 'Plot point', tab: 'plot', highlight: null },
  { label: 'Fit model', tab: 'plot', highlight: null }
];

function TenByTenMode() {
  const [presetKey, setPresetKey] = React.useState('smooth');
  const [editedGrid, setEditedGrid] = React.useState(null);
  const [allDirections, setAllDirections] = React.useState(true);
  const [selectedIdx, setSelectedIdx] = React.useState(0);
  const [revealedCount, setRevealedCount] = React.useState(0);
  const [hoveredCell, setHoveredCell] = React.useState(null);
  const [modelName, setModelName] = React.useState('none');
  const [predictOn, setPredictOn] = React.useState(false);
  const [predictTarget, setPredictTarget] = React.useState(null);
  const [revealedStep, setRevealedStep] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState('formula');
  const [tabPinned, setTabPinned] = React.useState(false); // true if instructor clicked a tab

  const preset = DATASETS_10X10[presetKey];
  const grid = editedGrid || preset.grid;
  const pairs = React.useMemo(
    () => computePairs(grid, { cardinalOnly: !allDirections, maxLag: MAX_LAG_10X10 }),
    [grid, allDirections]
  );
  const lags = React.useMemo(() => computeSemivariogram(pairs, MAX_LAG_10X10), [pairs]);

  // Edited-cells set, for the accent ring
  const editedKeys = React.useMemo(() => {
    if (!editedGrid) return null;
    const keys = new Set();
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] !== preset.grid[r][c]) keys.add(`${r}-${c}`);
      }
    }
    return keys;
  }, [editedGrid, preset.grid, grid]);

  // Reset lag progression when the dataset / direction / edits force a fresh lag set
  React.useEffect(() => {
    setRevealedCount(0);
    setSelectedIdx(0);
    setHoveredCell(null);
  }, [presetKey, allDirections]);

  // Reset edits when preset changes
  React.useEffect(() => {
    setEditedGrid(null);
    setPredictTarget(null);
  }, [presetKey]);

  // Auto-select the first ? cell when prediction toggle flips on
  React.useEffect(() => {
    if (!predictOn) { setPredictTarget(null); return; }
    if (predictTarget) return;
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] === null) { setPredictTarget({ r, c }); return; }
      }
    }
  }, [predictOn, grid, predictTarget]);

  // Auto-flip tab from revealedStep unless the instructor pinned it
  React.useEffect(() => {
    if (tabPinned) return;
    const step = TEN_STEPS[Math.max(0, revealedStep - 1)];
    setActiveTab(step.tab);
  }, [revealedStep, tabPinned]);

  // When the prediction toggle is on the right tab auto-selects 'predict'
  React.useEffect(() => {
    if (predictOn) { setTabPinned(false); setActiveTab('predict'); }
  }, [predictOn]);

  const selectedLag = revealedCount > 0 ? lags[selectedIdx] : null;
  const highlightedPairs = selectedLag ? selectedLag.pairs : null;

  const knownCells = React.useMemo(() => {
    const out = [];
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const v = grid[r][c];
        if (v !== null && v !== undefined) out.push({ r, c, v });
      }
    }
    return out;
  }, [grid]);

  const prediction = React.useMemo(() => {
    if (!predictOn || !predictTarget) return null;
    return predictionWeights(predictTarget, knownCells, 6);
  }, [predictOn, predictTarget, knownCells]);

  const onCellEdit = React.useCallback((r, c, value) => {
    setEditedGrid(prev => {
      const base = prev || preset.grid;
      const next = base.map(row => row.slice());
      next[r][c] = value;
      return next;
    });
  }, [preset.grid]);

  const onResetValues = React.useCallback(() => {
    setEditedGrid(null);
  }, []);

  const onChipClick = React.useCallback((i) => {
    setRevealedCount(rc => Math.max(rc, i + 1));
    setSelectedIdx(i);
    setRevealedStep(s => Math.max(s, 4)); // chip click implies plot step
  }, []);

  const onStep = React.useCallback((i) => {
    setRevealedStep(i);
    setTabPinned(false);
  }, []);

  const onTab = React.useCallback((k) => {
    setActiveTab(k);
    setTabPinned(true);
  }, []);

  const tabs = predictOn
    ? [
        { key: 'formula', label: 'γ(h) Formula' },
        { key: 'calc',    label: 'Calculation' },
        { key: 'plot',    label: 'Semivariogram plot' },
        { key: 'predict', label: 'Prediction' }
      ]
    : [
        { key: 'formula', label: 'γ(h) Formula' },
        { key: 'calc',    label: 'Calculation' },
        { key: 'plot',    label: 'Semivariogram plot' }
      ];

  const stepHighlight = TEN_STEPS[Math.max(0, revealedStep - 1)].highlight;

  return (
    <div>
      <div className="mode-header">
        <span className="blurb">{preset.blurb}</span>
        <div className="extras">
          <select className="preset" value={presetKey}
            onChange={e => setPresetKey(e.target.value)}
            style={{ width: 220 }}>
            {Object.entries(DATASETS_10X10).map(([k, d]) =>
              <option key={k} value={k}>{d.label}</option>)}
          </select>
          <div className="toggle-group" style={{ width: 280 }}>
            <button className={`toggle-btn ${!allDirections ? 'active' : ''}`}
              onClick={() => setAllDirections(false)}>Cardinal</button>
            <button className={`toggle-btn ${allDirections ? 'active' : ''}`}
              onClick={() => setAllDirections(true)}>All directions</button>
          </div>
          <label className="model-toggle-label" style={{ marginLeft: 8 }}>
            <input type="checkbox" className="model-toggle"
              checked={predictOn}
              onChange={e => setPredictOn(e.target.checked)} />
            Predict at an unknown cell
          </label>
        </div>
      </div>

      {!predictOn && (
        <div style={{ padding: '0 40px' }}>
          <StepBar
            steps={TEN_STEPS.map(s => s.label)}
            activeStep={revealedStep}
            onStep={onStep}
          />
        </div>
      )}

      <div className="mode-shell">
        <div className="grid-pane">
          <div className="grid-svg-frame" style={{ display: 'flex', justifyContent: 'center', background: 'var(--paper-soft)', border: '1px solid var(--rule)', padding: 16 }}>
            <GridView
              grid={grid}
              highlightedPairs={highlightedPairs}
              hoveredCell={hoveredCell}
              onCellHover={setHoveredCell}
              size={520}
              onEdit={onCellEdit}
              editedKeys={editedKeys}
              predictTarget={predictOn ? predictTarget : null}
              predictNeighbors={prediction ? prediction.neighbors : null}
              onTargetClick={predictOn ? setPredictTarget : null}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lags.map((l, i) => {
              const isUpcoming = i >= revealedCount;
              return (
                <button key={i}
                  className={`lag-chip ${i === selectedIdx && !isUpcoming ? 'active' : ''} ${isUpcoming ? 'upcoming' : ''}`}
                  onClick={() => onChipClick(i)}>
                  h = {l.label}
                  <span className="n-badge">N={l.n}</span>
                </button>
              );
            })}
          </div>
          <div className="model-radio">
            <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)' }}>
              Fit model:
            </span>
            {['none', 'spherical', 'exponential', 'gaussian'].map(m =>
              <label key={m}>
                <input type="radio" name="model" value={m}
                  checked={modelName === m}
                  onChange={() => {
                    setModelName(m);
                    if (m !== 'none') setRevealedStep(s => Math.max(s, 5));
                  }} />
                {m}
              </label>
            )}
          </div>
        </div>

        <div className="right-pane">
          <TabbedPanel tabs={tabs} activeTab={activeTab} onTab={onTab}>
            {{
              formula: <FormulaPanel highlight={stepHighlight} />,
              calc:    <CalculationTable lag={selectedLag} />,
              plot:    <div className="plot-frame">
                         <SemivariogramPlot
                           lags={lags}
                           selectedIdx={selectedIdx}
                           revealedCount={revealedCount}
                           modelName={modelName}
                         />
                       </div>,
              predict: <PredictionPanel prediction={prediction} />
            }}
          </TabbedPanel>
        </div>
      </div>

      <div className="whatif-footer">
        <span>Tip: click any cell to change its value.</span>
        <button onClick={onResetValues} disabled={!editedGrid}>Reset values</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Temporarily swap `App` to render `TenByTenMode`**

Replace the entire `return (...)` block of `App` (around lines 1066–1210) with:

```javascript
  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="eyebrow">Ordinary Kriging · Teaching Demonstration</div>
          <h1 className="title">
            Interactive <em>Semivariogram</em> Builder
          </h1>
        </div>
      </header>
      <TenByTenMode />
    </div>
  );
```

Remove the now-unused `App` state declarations and effects: `presetKey`, `allDirections`, `modelName`, `selectedIdx`, `revealedCount`, `hoveredCell`, `editedGrid`, the related `useEffect` resets, the lag-set memos, and the `onNext` / `onPrev` / `onReset` / `onChipClick` / `onCellEdit` callbacks. Keep only the keyboard `useEffect` for now — but leave its body as a no-op (we wire it back in Task 13).

After this step `App` should be very short — basically the masthead + `<TenByTenMode />`.

- [ ] **Step 4: Run page; smoke-test the 10×10 mode end-to-end**

Open `index.html`. Verify:
- Preset dropdown switches datasets and resets lag/edits.
- Cardinal / All-directions toggle resets the lag set.
- Step bar shows 5 steps; clicking any step changes the highlighted item and the right tab (Formula / Calculation / Plot mapping).
- Clicking a lag chip advances the revealed count and selects that lag; the right tab auto-flips to Plot when `revealedStep` ≥ 4.
- Clicking a tab manually pins it (further step-bar changes don't override).
- Click-to-edit a cell updates the semivariogram; `Reset values` reverts; edited cells get a thin accent ring.
- Model radio: `none` removes the curve; `spherical` / `exponential` / `gaussian` each draw a different curve plus nugget / sill / range guides.
- `Predict at an unknown cell` checkbox hides the step bar, auto-selects the first `?` cell as the target, draws dashed lines from the target to its six nearest knowns with `w=…` labels, and switches the right tab to **Prediction** showing the weight table and uncertainty bar.
- Clicking another `?` cell re-targets the prediction.
- Keyboard `← / → / Home` does nothing yet (wired in Task 13).
- In-browser tests still pass.

- [ ] **Step 5: Run `verify.py`**

```powershell
python verify.py
```

It will likely warn or fail on assertions that look for the old layout (`.panel-title` text, `.step-btn.primary` button, etc.). That's expected — those selectors are gone. The script still must run to completion and report no `PAGE ERRORS:` and no `CONSOLE FAILS:`. Failures in the script's assertion lines are OK at this stage; they get fixed in Task 14.

- [ ] **Step 6: Delete the old `CalculationSummary` component**

`CalculationSummary` (around line 948) is now dead code — `CalculationTable` replaces it. Delete the whole function plus its banner comment.

Also delete the now-unused CSS rules that only `CalculationSummary` referenced: `.summary-box`, `.summary-line`, `.pair-table`, `.pair-table-header`, `.pair-row`, `.more-note`, `.empty-summary`, `.hover-hint`, `.formula` (lines ~334–344 — the old single-line formula that lived in §3 is replaced by FormulaPanel). Use Grep to confirm none of them is still referenced before deleting.

- [ ] **Step 7: Run page again, confirm nothing broke**

Open `index.html`, confirm the UI looks identical to step 4. In-browser tests still pass. Then run `verify.py` once more.

- [ ] **Step 8: Commit**

```powershell
git add index.html
git commit -m "Extract TenByTenMode; rebuild 10x10 on the shared shell

Moves the existing 10x10 workflow out of App into a TenByTenMode
component. Adds the 5-step bar, the model-pick radio, click-to-edit
with a Reset button, and the 'Predict at an unknown cell' toggle that
exposes a fourth Prediction tab on the right panel. Deletes the old
CalculationSummary and its now-orphan CSS.

verify.py assertions for the old layout will be repaired in a later
task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 12: Build `ThreeByThreeMode`

Smaller mode component that drives the 10-step hand-calculation walkthrough on the fixed 3×3 grid. Reuses every shared component.

**Files:**
- Modify: `index.html` (new `ThreeByThreeMode` just above `TenByTenMode`)

- [ ] **Step 1: Add `ThreeByThreeMode`**

Insert just above `TenByTenMode`:

```javascript
// ------------------------------------------------------------------
// ThreeByThreeMode — fixed 3×3 grid, cardinal-only, 10-step walk-through
// of the empirical semivariogram hand-calculation.
// ------------------------------------------------------------------
const THREE_STEPS = [
  { label: 'Grid',             tab: 'formula', highlight: null,         revealCols: { diff: false, sq: false, sum: false, gamma: false } },
  { label: 'Select lag',       tab: 'formula', highlight: 'h',          revealCols: { diff: false, sq: false, sum: false, gamma: false } },
  { label: 'Highlight pairs',  tab: 'formula', highlight: 'z_i',        revealCols: { diff: false, sq: false, sum: false, gamma: false } },
  { label: 'Differences',      tab: 'calc',    highlight: 'diff',       revealCols: { diff: true,  sq: false, sum: false, gamma: false } },
  { label: 'Square them',      tab: 'calc',    highlight: 'sq',         revealCols: { diff: true,  sq: true,  sum: false, gamma: false } },
  { label: 'Sum',              tab: 'calc',    highlight: 'sum',        revealCols: { diff: true,  sq: true,  sum: true,  gamma: false } },
  { label: '÷ 2N(h)',           tab: 'calc',    highlight: 'oneOver2N',  revealCols: { diff: true,  sq: true,  sum: true,  gamma: true  } },
  { label: 'Plot γ(h)',         tab: 'plot',    highlight: null,         revealCols: { diff: true,  sq: true,  sum: true,  gamma: true  } },
  { label: 'Next lag',         tab: 'plot',    highlight: null,         revealCols: { diff: true,  sq: true,  sum: true,  gamma: true  } },
  { label: 'Fit model',        tab: 'plot',    highlight: null,         revealCols: { diff: true,  sq: true,  sum: true,  gamma: true  } }
];

function ThreeByThreeMode() {
  const [editedGrid, setEditedGrid] = React.useState(null);
  const [hoveredCell, setHoveredCell] = React.useState(null);
  const [revealedStep, setRevealedStep] = React.useState(1);
  const [selectedLagIdx, setSelectedLagIdx] = React.useState(0);
  const [activeTab, setActiveTab] = React.useState('formula');
  const [tabPinned, setTabPinned] = React.useState(false);
  const [modelName, setModelName] = React.useState('none');

  const grid = editedGrid || DATASET_3X3.grid;
  const pairs = React.useMemo(
    () => computePairs(grid, { cardinalOnly: true }),
    [grid]
  );
  const lags = React.useMemo(() => computeSemivariogram(pairs), [pairs]);

  const editedKeys = React.useMemo(() => {
    if (!editedGrid) return null;
    const keys = new Set();
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        if (grid[r][c] !== DATASET_3X3.grid[r][c]) keys.add(`${r}-${c}`);
      }
    }
    return keys;
  }, [editedGrid, grid]);

  // revealedCount is derived from revealedStep:
  // steps 1-7 = nothing plotted; step 8 = first lag plotted; step 9 = both plotted; step 10 = both + model.
  const revealedCount = revealedStep >= 9 ? 2 : revealedStep >= 8 ? 1 : 0;
  // selectedLagIdx is locked to whatever the instructor picked, capped to revealedCount-1 for the plot
  const plotSelectedIdx = Math.min(selectedLagIdx, Math.max(0, revealedCount - 1));

  React.useEffect(() => {
    if (tabPinned) return;
    setActiveTab(THREE_STEPS[Math.max(0, revealedStep - 1)].tab);
  }, [revealedStep, tabPinned]);

  // Step 10 auto-fits a spherical model if the user hasn't picked one
  React.useEffect(() => {
    if (revealedStep >= 10 && modelName === 'none') setModelName('spherical');
  }, [revealedStep, modelName]);

  const selectedLag = lags[selectedLagIdx] || null;
  const highlightedPairs = revealedStep >= 3 && selectedLag ? selectedLag.pairs : null;

  const onCellEdit = React.useCallback((r, c, value) => {
    setEditedGrid(prev => {
      const base = prev || DATASET_3X3.grid;
      const next = base.map(row => row.slice());
      next[r][c] = value;
      return next;
    });
  }, []);

  const onResetValues = React.useCallback(() => {
    setEditedGrid(null);
  }, []);

  const tabs = [
    { key: 'formula', label: 'γ(h) Formula' },
    { key: 'calc',    label: 'Calculation' },
    { key: 'plot',    label: 'Semivariogram plot' }
  ];

  const stepDef = THREE_STEPS[Math.max(0, revealedStep - 1)];

  return (
    <div>
      <div className="mode-header">
        <span className="blurb">{DATASET_3X3.blurb}</span>
        <div className="extras">
          <div className="toggle-group" style={{ width: 220 }}>
            <button className={`toggle-btn ${selectedLagIdx === 0 ? 'active' : ''}`}
              onClick={() => { setSelectedLagIdx(0); setRevealedStep(s => Math.max(s, 2)); }}>
              h = 1
            </button>
            <button className={`toggle-btn ${selectedLagIdx === 1 ? 'active' : ''}`}
              onClick={() => { setSelectedLagIdx(1); setRevealedStep(s => Math.max(s, 2)); }}
              disabled={lags.length < 2}>
              h = 2
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: '0 40px' }}>
        <StepBar
          steps={THREE_STEPS.map(s => s.label)}
          activeStep={revealedStep}
          onStep={(i) => { setRevealedStep(i); setTabPinned(false); }}
        />
      </div>

      <div className="mode-shell">
        <div className="grid-pane">
          <div className="grid-svg-frame" style={{ display: 'flex', justifyContent: 'center', background: 'var(--paper-soft)', border: '1px solid var(--rule)', padding: 16 }}>
            <GridView
              grid={grid}
              highlightedPairs={highlightedPairs}
              hoveredCell={hoveredCell}
              onCellHover={setHoveredCell}
              size={420}
              onEdit={onCellEdit}
              editedKeys={editedKeys}
            />
          </div>
          {revealedStep >= 10 && (
            <div className="model-radio">
              <span style={{ fontFamily: 'Manrope, sans-serif', fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ink-soft)' }}>
                Fit model:
              </span>
              {['spherical', 'exponential', 'gaussian'].map(m =>
                <label key={m}>
                  <input type="radio" name="model3" value={m}
                    checked={modelName === m}
                    onChange={() => setModelName(m)} />
                  {m}
                </label>
              )}
            </div>
          )}
        </div>

        <div className="right-pane">
          <TabbedPanel
            tabs={tabs}
            activeTab={activeTab}
            onTab={(k) => { setActiveTab(k); setTabPinned(true); }}
          >
            {{
              formula: <FormulaPanel highlight={stepDef.highlight} />,
              calc:    <CalculationTable
                         lag={selectedLag}
                         revealColumns={stepDef.revealCols}
                       />,
              plot:    <div className="plot-frame">
                         <SemivariogramPlot
                           lags={lags}
                           selectedIdx={plotSelectedIdx}
                           revealedCount={revealedCount}
                           modelName={revealedStep >= 10 ? modelName : 'none'}
                         />
                       </div>
            }}
          </TabbedPanel>
        </div>
      </div>

      <div className="whatif-footer">
        <span>Tip: click any cell to change its value.</span>
        <button onClick={onResetValues} disabled={!editedGrid}>Reset values</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire `App` to render `ThreeByThreeMode` temporarily**

Replace `<TenByTenMode />` in `App`'s return (added in Task 11) with `<ThreeByThreeMode />` just for this step.

- [ ] **Step 3: Run page; smoke-test the 3×3 mode end-to-end**

Open `index.html`. Verify:
- The 3×3 grid renders centred, with values 14, 16, 18, 12, 14, 17, 10, 13, 15.
- The step bar shows 10 steps; clicking through them auto-flips the right tab according to the `THREE_STEPS` table (steps 1–3 → Formula; steps 4–7 → Calculation; steps 8–10 → Plot).
- Clicking `h = 1` / `h = 2` toggles the selected lag and bumps the step to at least 2.
- Step 3 starts drawing pair lines on the grid for the selected lag.
- Step 4 reveals the diff column in the Calculation tab; step 5 reveals (diff)²; step 6 reveals the Σ row; step 7 reveals the final γ row.
- Step 8 places the first point on the plot.
- Step 9 places the second point.
- Step 10 reveals the model-pick radio and draws a spherical curve.
- Click-to-edit a cell updates the semivariogram. The diff / sq / γ figures update live. Reset restores 14, 16, 18, …
- The in-browser tests still print `ok` for T1–T7 and the banner.

- [ ] **Step 4: Restore `<TenByTenMode />` in `App`**

Switch the body back to `<TenByTenMode />` — Task 13 introduces the real mode router.

- [ ] **Step 5: Commit**

```powershell
git add index.html
git commit -m "Add ThreeByThreeMode for the 10-step hand calculation

Fixed 3x3 grid (lecture-slide values), cardinal-only pair set, 10-step
soft scaffold. Each step has a tab target and a formula-highlight + a
revealColumns mask for the Calculation table. Step 10 reveals the
model-pick radio and auto-selects spherical.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 13: Replace `App` with the mode router and selector chrome

Two pill buttons at the top of the page swap between `ThreeByThreeMode` and `TenByTenMode`. Wire keyboard `← / → / Home` to drive the active mode's step bar — mode components expose imperative handlers via a `useImperativeHandle` hook on a `ref`.

**Files:**
- Modify: `index.html` (CSS for the mode selector; `App`; small ref additions to both mode components)

- [ ] **Step 1: Add the mode-selector CSS**

Insert in `<style>` just below the `.masthead .meta` block (around line 144):

```css
  .mode-selector {
    display: flex;
    gap: 12px;
    padding: 24px 40px 4px;
    border-bottom: 1px solid var(--rule-soft);
  }
  .mode-selector button {
    font-family: 'Manrope', sans-serif;
    font-size: 17px;
    font-weight: 600;
    padding: 12px 24px;
    border: 1px solid var(--rule);
    background: var(--paper-soft);
    color: var(--ink-soft);
    cursor: pointer;
    border-radius: 999px;
    letter-spacing: 0.01em;
  }
  .mode-selector button:hover { border-color: var(--accent); color: var(--accent); }
  .mode-selector button.active {
    background: var(--accent);
    color: var(--paper);
    border-color: var(--accent);
  }
  .mode-selector .key-hint {
    margin-left: auto;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--ink-mute);
    align-self: center;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
```

- [ ] **Step 2: Expose imperative handlers on the mode components**

In **both** `ThreeByThreeMode` and `TenByTenMode`, change the function signature to `React.forwardRef((props, ref) => { … })` and add a `useImperativeHandle` near the top of the body that exposes `next`, `prev`, and `reset`. Place this after all state declarations but before the effects.

For `ThreeByThreeMode`:

```javascript
const ThreeByThreeMode = React.forwardRef((props, ref) => {
  // ... existing state ...

  React.useImperativeHandle(ref, () => ({
    next: () => setRevealedStep(s => Math.min(THREE_STEPS.length, s + 1)),
    prev: () => setRevealedStep(s => Math.max(1, s - 1)),
    reset: () => {
      setRevealedStep(1);
      setSelectedLagIdx(0);
      setActiveTab('formula');
      setTabPinned(false);
      setModelName('none');
    }
  }), []);

  // ... existing memos, effects, render ...
});
```

For `TenByTenMode`:

```javascript
const TenByTenMode = React.forwardRef((props, ref) => {
  // ... existing state ...

  React.useImperativeHandle(ref, () => ({
    next: () => {
      if (predictOn) return;
      // Advance reveal: first by revealedCount (lag), then by revealedStep
      if (revealedCount < lags.length && revealedStep <= 4) {
        setRevealedCount(rc => Math.min(lags.length, rc + 1));
        setSelectedIdx(i => Math.min(lags.length - 1, i + 1));
        if (revealedCount === 0) setRevealedStep(2);
        else setRevealedStep(s => Math.max(s, 4));
      } else {
        setRevealedStep(s => Math.min(TEN_STEPS.length, s + 1));
      }
    },
    prev: () => {
      if (predictOn) return;
      if (revealedCount > 0 && revealedStep >= 4) {
        setRevealedCount(rc => Math.max(0, rc - 1));
        setSelectedIdx(i => Math.max(0, i - 1));
      } else {
        setRevealedStep(s => Math.max(1, s - 1));
      }
    },
    reset: () => {
      setRevealedCount(0);
      setSelectedIdx(0);
      setRevealedStep(1);
      setActiveTab('formula');
      setTabPinned(false);
      setModelName('none');
      setPredictOn(false);
      setPredictTarget(null);
    }
  }), [revealedCount, lags.length, revealedStep, predictOn]);

  // ... existing memos, effects, render ...
});
```

- [ ] **Step 3: Replace `App` body with the mode router**

Replace the entire `App` function (which by now should be very short) with:

```javascript
// ------------------------------------------------------------------
// App — mode router. Two pill buttons up top swap between the modes,
// arrow keys / Home drive the active mode's step bar.
// ------------------------------------------------------------------
function App() {
  const [mode, setMode] = React.useState('3x3'); // '3x3' | '10x10'
  const threeRef = React.useRef(null);
  const tenRef = React.useRef(null);
  const activeRef = mode === '3x3' ? threeRef : tenRef;

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target && (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      const m = activeRef.current;
      if (!m) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); m.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); m.prev(); }
      else if (e.key === 'Home') { e.preventDefault(); m.reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeRef]);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="eyebrow">Ordinary Kriging · Teaching Demonstration</div>
          <h1 className="title">
            Interactive <em>Semivariogram</em> Builder
          </h1>
        </div>
        <div className="meta">
          <div><span className="rule-line"></span></div>
          <div>From a 3×3 hand calc to a fitted 10×10 model</div>
          <div>← / → to step · Home to reset</div>
        </div>
      </header>

      <nav className="mode-selector" role="tablist">
        <button
          type="button"
          role="tab"
          className={mode === '3x3' ? 'active' : ''}
          onClick={() => setMode('3x3')}>
          3×3 Guided Demo
        </button>
        <button
          type="button"
          role="tab"
          className={mode === '10x10' ? 'active' : ''}
          onClick={() => setMode('10x10')}>
          10×10 Exploration
        </button>
        <span className="key-hint">← / → step · Home reset</span>
      </nav>

      {/* Both modes are mounted at all times so per-mode edits and
          progression persist across mode switches (spec requirement).
          The inactive mode is hidden with `display: none`. */}
      <div style={{ display: mode === '3x3' ? 'block' : 'none' }}>
        <ThreeByThreeMode ref={threeRef} />
      </div>
      <div style={{ display: mode === '10x10' ? 'block' : 'none' }}>
        <TenByTenMode ref={tenRef} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run page; smoke-test the full flow**

Open `index.html`. Verify:
- Both pill buttons are visible at the top of the page; clicking either swaps the mode.
- **State persistence across mode switches:** In 3×3, click `h = 2` and press `→` a few times. Switch to 10×10. Switch back to 3×3 — `h = 2` is still selected and the step bar is at the same step. Same in reverse for 10×10 (edits and model selection survive a round-trip).
- Arrow keys drive the active mode's step bar:
  - In 3×3: `→` advances steps 1 → 10; once at step 10, further `→` is a no-op. `←` reverses. `Home` resets to step 1.
  - In 10×10: `→` first reveals lag chips (steps 1 → 4) then moves through the step bar; `←` reverses; `Home` clears everything.
- In-browser tests still print `ok` for T1–T7 and the banner.

- [ ] **Step 5: Run `verify.py`**

```powershell
python verify.py
```

The script's old assertions on `.panel-title` etc. will fail — that's expected and fixed in Task 14. The script must still run to completion without `PAGE ERRORS:` or `CONSOLE FAILS:`.

- [ ] **Step 6: Commit**

```powershell
git add index.html
git commit -m "Replace App with mode router and selector pills

Top of the page now hosts two big pills (3x3 Guided Demo / 10x10
Exploration). The mode router forwards ref-exposed next/prev/reset
handlers to the active mode so the keyboard (left/right/Home) drives
the active step bar without coupling App to either mode's state.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Verification

### Task 14: Extend `verify.py` for the new UI

Replace the old assertions that referenced the panel/step-button layout. The new smoke test must:
1. Load the page; assert no PAGE ERRORS, no console FAILs, and the `[semivariogram tests done]` banner.
2. Default mode is `3×3 Guided Demo`; the 10-step bar is visible.
3. Clicking the `10×10 Exploration` pill switches to the 10×10; the 5-step bar is visible; the existing chip strip appears.
4. In 10×10, advancing via `→` reveals lag points on the plot.
5. The model radio with `none / spherical / exponential / gaussian` is present.
6. Toggling `Predict at an unknown cell` reveals a fourth `Prediction` tab and renders the prediction summary.
7. Editing a 3×3 cell to an extreme value (after switching back to 3×3) changes the visible γ.

**Files:**
- Modify: `verify.py`

- [ ] **Step 1: Replace `verify.py` with the new flow**

Overwrite the file with:

```python
"""Verify both modes load, render, and behave correctly."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import sys
sys.stdout.reconfigure(encoding="utf-8")

HTML = Path(__file__).parent / "index.html"
URL = HTML.absolute().as_uri()

def main():
    console_messages = []
    errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1700, "height": 1100})
        page = context.new_page()
        page.on("console", lambda m: console_messages.append((m.type, m.text)))
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(URL)
        page.wait_for_timeout(2500)
        page.wait_for_load_state("networkidle")

        if errors:
            print("PAGE ERRORS:"); [print(" ", e) for e in errors]

        fails = [m for m in console_messages if "FAIL" in m[1]]
        if fails:
            print("CONSOLE FAILS:"); [print(" ", t, m) for t, m in fails]
        else:
            print("No FAIL lines in console.")

        banner_present = any("[semivariogram tests done]" in m[1] for m in console_messages)
        print("Self-tests banner present:", banner_present)
        assert banner_present, "Expected the in-browser tests banner"

        # 1. Default is 3x3 Guided Demo
        three_btn = page.locator(".mode-selector button", has_text="3×3 Guided Demo")
        ten_btn = page.locator(".mode-selector button", has_text="10×10 Exploration")
        assert "active" in (three_btn.get_attribute("class") or ""), "3x3 should be active by default"

        step_items = page.locator(".step-bar .step-item")
        assert step_items.count() == 10, f"Expected 10 steps in 3x3 mode, got {step_items.count()}"
        print("3x3 step bar has 10 items: OK")

        # 2. Click the h = 1 toggle and advance a few steps
        page.locator(".toggle-btn", has_text="h = 1").click()
        page.keyboard.press("ArrowRight")
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(200)
        pair_lines = page.locator(".pair-line").count()
        assert pair_lines > 0, "Expected pair lines once step >= 3"
        print(f"3x3 pair lines drawn at step 3+: {pair_lines}")

        # 3. Step all the way to 8 and confirm a plot point appeared
        for _ in range(8):
            page.keyboard.press("ArrowRight")
        page.wait_for_timeout(200)
        # Switch to plot tab in case auto-flip already did it
        page.locator(".tab", has_text="Semivariogram plot").click()
        page.wait_for_timeout(200)
        plot_points = page.locator(".plot-point").count()
        assert plot_points >= 1, "Expected at least one plot point by step 8"
        print(f"3x3 plot points after stepping to 8+: {plot_points}")

        # 4. Edit the top-left cell to a wild value; γ should change
        page.locator(".cell-rect").first.click()
        page.wait_for_timeout(200)
        page.keyboard.press("Control+A")
        page.keyboard.type("99")
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)
        # Ring class appears on the edited cell
        edited_count = page.locator(".cell-rect.edited").count()
        assert edited_count == 1, f"Expected 1 edited cell, got {edited_count}"
        print("3x3 edit ring rendered on edited cell")

        # 5. Switch to 10x10 mode
        ten_btn.click()
        page.wait_for_timeout(300)
        ten_steps = page.locator(".step-bar .step-item")
        assert ten_steps.count() == 5, f"Expected 5 steps in 10x10 mode, got {ten_steps.count()}"
        chips = page.locator(".lag-chip")
        assert chips.count() > 0, "Expected lag chips in 10x10 mode"
        print(f"10x10 step bar has 5 items and {chips.count()} lag chips: OK")

        # 6. Model radio is present
        radios = page.locator(".model-radio input[type=radio]")
        assert radios.count() == 4, f"Expected 4 model radios, got {radios.count()}"
        print("10x10 model radio has none/spherical/exponential/gaussian")

        # 7. Toggle Predict at unknown — Prediction tab appears
        page.locator(".model-toggle-label", has_text="Predict at an unknown cell").locator(".model-toggle").check()
        page.wait_for_timeout(300)
        predict_tab = page.locator(".tab", has_text="Prediction")
        assert predict_tab.count() == 1, "Expected Prediction tab to appear"
        predict_panel = page.locator(".predict-panel")
        assert predict_panel.count() == 1, "Expected PredictionPanel to render"
        zhat_visible = page.locator(".predict-panel .zhat").inner_text()
        assert "ẑ" in zhat_visible, f"Expected ẑ in prediction panel, got: {zhat_visible}"
        print(f"10x10 prediction panel rendered: {zhat_visible.replace(chr(10), ' ')}")

        # 8. Reveal-all snapshot — for the gallery
        page.locator(".model-toggle-label", has_text="Predict at an unknown cell").locator(".model-toggle").uncheck()
        page.wait_for_timeout(200)
        for chip in page.locator(".lag-chip").all():
            chip.click()
        page.locator(".model-radio input[value=spherical]").check()
        page.wait_for_timeout(300)
        page.locator(".tab", has_text="Semivariogram plot").click()
        page.wait_for_timeout(200)
        model_curve = page.locator(".model-curve").count()
        assert model_curve == 1, "Expected the spherical curve to be drawn"

        page.screenshot(path=str(Path(__file__).parent / "verify_full.png"), full_page=True)
        print("Saved verify_full.png")

        browser.close()

    if errors or any("FAIL" in m[1] for m in console_messages):
        sys.exit(1)

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run `verify.py` and confirm it passes**

```powershell
python verify.py
```

Expected output ends with `Saved verify_full.png` and exits 0. Confirm no `PAGE ERRORS:` or `CONSOLE FAILS:` lines. Open `verify_full.png` to eyeball the 10×10 in its fully-revealed state.

- [ ] **Step 3: Commit**

```powershell
git add verify.py
git commit -m "Rebuild verify.py around the new two-mode UI

Asserts the mode-selector pills, both step bars (10 in 3x3, 5 in 10x10),
the model radio, pair-line drawing once step >= 3, plot points after
stepping past 8, the click-to-edit ring, and the Prediction tab + panel
when the toggle flips on.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-review checklist

Run through this once after Task 14. If any item is missing, add the task; if any is wrong, fix inline.

- **Two modes coexist** — `3×3 Guided Demo` (Task 12) and `10×10 Exploration` (Task 11), routed by `App` (Task 13).
- **Tabbed right panel** — `TabbedPanel` (Task 5) hosts `FormulaPanel` (Task 6), `CalculationTable` (Task 7), `SemivariogramPlot` (Task 9), and `PredictionPanel` (Task 10).
- **Step bar drives the soft scaffold** — `StepBar` (Task 4) plus per-mode step tables in Tasks 11–12. Tab auto-flip respects the instructor's manual override via the `tabPinned` flag.
- **Three models** — `fitModel` + `modelGamma` (Task 2). The model radio in 10×10 (Task 11) and 3×3-step-10 (Task 12) drives selection.
- **Nugget / sill / range guides** — Task 9.
- **Click-to-edit** — `GridView`'s `onEdit` (Task 8); state in mode components (Tasks 11–12); Reset button in the what-if footer.
- **Conceptual prediction** — `predictionWeights` (Task 3), grid overlay (Task 8), summary panel (Task 10), wired into 10×10 (Task 11).
- **Keyboard navigation** — `App`'s `useEffect` forwards `← / → / Home` to the active mode's imperative handlers (Task 13).
- **Self-tests** — in-browser block extended in Tasks 1–3 (T5, T6, T7).
- **Smoke test** — `verify.py` rebuilt in Task 14.

If you find a spec requirement (in `2026-05-20-teaching-modes-design.md`) without a matching task, add it before starting execution.
