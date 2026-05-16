# Interactive Semivariogram Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single self-contained `index.html` for an Ordinary Kriging teaching demo that lets students see how an empirical semivariogram is constructed from point pairs on a 5×5 grid.

**Architecture:** Single HTML file. React 18 + ReactDOM + Babel-standalone loaded from `unpkg.com`. Google Fonts for typography. All logic, styles, and JSX inside one `<script type="text/babel">` block. Pure math helpers (`computePairs`, `computeSemivariogram`) are unit-tested with inline `console.assert` calls that run once on page load.

**Tech Stack:** React 18 (via CDN), Babel-standalone, raw SVG for grid + plot, plain CSS with custom properties, Fraunces / Manrope / JetBrains Mono via Google Fonts.

**Spec reference:** `docs/superpowers/specs/2026-05-15-interactive-semivariogram-builder-design.md`.

**Note on git:** The target directory is not a git repository. Commit steps are omitted from individual tasks. After completion the user may choose to `git init` and commit the whole build as a single commit.

---

## File Structure

This project produces and modifies a single file plus the spec/plan it derives from:

| Path | Purpose |
|---|---|
| `index.html` | The entire application — HTML, CSS, React app via Babel-standalone. |
| `docs/superpowers/specs/2026-05-15-interactive-semivariogram-builder-design.md` | Existing approved spec. |
| `docs/superpowers/plans/2026-05-15-interactive-semivariogram-builder.md` | This plan. |

All implementation tasks below modify `index.html`. The file is built up section by section: scaffold first, then pure helpers (with inline self-tests), then components, then wiring.

---

## Task 1: Scaffold the HTML file

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create the file with HTML shell, fonts, base CSS variables, and a React mount that renders the page title.**

Write the following to `index.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Interactive Semivariogram Builder</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {
    --paper: #f3ede1;
    --paper-soft: #f8f4ea;
    --paper-deep: #ebe3d2;
    --ink: #1c1812;
    --ink-soft: #3a342a;
    --ink-mute: #6b6354;
    --rule: #c9bfa9;
    --rule-soft: #ddd3bd;
    --accent: #b04527;
    --accent-pale: #f0d3c5;
    --sage: #5d7a5b;
    --unknown: #a89e88;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    background: var(--paper);
    color: var(--ink);
    font-family: 'Manrope', sans-serif;
    font-size: 15px;
    line-height: 1.5;
    min-height: 100vh;
  }
  h1.title {
    font-family: 'Fraunces', serif;
    font-weight: 500;
    font-size: 48px;
    margin: 36px 48px;
    letter-spacing: -0.02em;
  }
  h1.title em { font-style: italic; color: var(--accent); }
</style>
</head>
<body>
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" data-presets="env,react">
const { useState, useMemo, useEffect, useCallback } = React;

function App() {
  return (
    <h1 className="title">
      Interactive <em>Semivariogram</em> Builder
    </h1>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
</body>
</html>
```

- [ ] **Step 2: Verify the scaffold loads.**

Open `index.html` in a browser (double-click, or `start index.html` on Windows). Expected: a parchment-colored page with the title "Interactive Semivariogram Builder" rendered in Fraunces serif, with the word "Semivariogram" in italic terracotta. No console errors.

---

## Task 2: Pure helpers with inline self-tests

**Files:**
- Modify: `index.html` — add `computePairs` and `computeSemivariogram` plus inline test assertions inside the Babel script block, above the `App` component.

- [ ] **Step 1: Write the assertion-based test cases first.**

Insert the following block immediately above the `App` component:

```javascript
// ------------------------------------------------------------------
// PURE HELPERS — semivariogram math
//
// gamma(h) = 1 / (2 * N(h)) * sum_{pairs} (z_i - z_j)^2
// where pairs are all unordered (i, j) with known values whose
// Euclidean distance equals h. Unknown (null) cells are excluded.
// ------------------------------------------------------------------

function computePairs(grid, allDirections) {
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
      // Cardinal mode excludes pairs with both row and column offsets
      if (!allDirections && dr !== 0 && dc !== 0) continue;
      const dist = Math.sqrt(dr * dr + dc * dc);
      pairs.push({
        a, b, dist,
        key: dist.toFixed(6),
        label: dist.toFixed(2),
        sqDiff: (a.v - b.v) ** 2
      });
    }
  }
  return pairs;
}

function computeSemivariogram(pairs) {
  const groups = new Map();
  for (const p of pairs) {
    if (!groups.has(p.key)) {
      groups.set(p.key, { h: p.dist, label: p.label, items: [] });
    }
    groups.get(p.key).items.push(p);
  }
  const lags = Array.from(groups.values()).map(g => {
    const sumSq = g.items.reduce((s, p) => s + p.sqDiff, 0);
    return {
      h: g.h,
      label: g.label,
      n: g.items.length,
      sumSq,
      gamma: sumSq / (2 * g.items.length),
      pairs: g.items
    };
  });
  lags.sort((a, b) => a.h - b.h);
  return lags;
}

// ------------------------------------------------------------------
// Inline self-tests — run once on page load. Reports to console.
// ------------------------------------------------------------------
(function runTests() {
  const eq = (a, b, msg) => {
    if (Math.abs(a - b) > 1e-9) console.error('FAIL:', msg, 'got', a, 'want', b);
    else console.log('ok  ', msg);
  };

  // Test 1: 2x2 grid, all known, all directions
  // grid:
  //   1 2
  //   3 4
  // pairs: (1,2) h=1, (1,3) h=1, (2,4) h=1, (3,4) h=1, (1,4) h=√2, (2,3) h=√2
  // h=1: sumSq = 1+4+4+1 = 10, gamma = 10/8 = 1.25
  // h=√2: sumSq = 9+1 = 10, gamma = 10/4 = 2.5
  {
    const grid = [[1, 2], [3, 4]];
    const lags = computeSemivariogram(computePairs(grid, true));
    eq(lags.length, 2, 'T1: two distinct lags');
    eq(lags[0].n, 4, 'T1: N(h=1) = 4');
    eq(lags[0].gamma, 1.25, 'T1: gamma(h=1) = 1.25');
    eq(lags[1].n, 2, 'T1: N(h=sqrt2) = 2');
    eq(lags[1].gamma, 2.5, 'T1: gamma(h=sqrt2) = 2.5');
  }

  // Test 2: same 2x2 grid, cardinal only — diagonal pairs excluded
  {
    const grid = [[1, 2], [3, 4]];
    const lags = computeSemivariogram(computePairs(grid, false));
    eq(lags.length, 1, 'T2: cardinal-only collapses to one lag');
    eq(lags[0].n, 4, 'T2: N(h=1) = 4 in cardinal mode');
    eq(lags[0].gamma, 1.25, 'T2: gamma(h=1) = 1.25 in cardinal mode');
  }

  // Test 3: unknown cells excluded entirely
  // grid:
  //   1 ?
  //   3 4
  // known pairs (all dirs): (1,3) h=1, (3,4) h=1, (1,4) h=√2
  {
    const grid = [[1, null], [3, 4]];
    const lags = computeSemivariogram(computePairs(grid, true));
    eq(lags[0].n, 2, 'T3: N(h=1) = 2 (two known pairs at distance 1)');
    eq(lags[0].sumSq, 4 + 1, 'T3: sumSq at h=1 = (3-1)^2 + (4-3)^2');
    eq(lags[1].n, 1, 'T3: N(h=sqrt2) = 1');
    eq(lags[1].sumSq, 9, 'T3: sumSq at h=sqrt2 = (4-1)^2');
  }

  console.log('%c[semivariogram tests done]', 'color:#b04527;font-weight:bold');
})();
```

- [ ] **Step 2: Open `index.html` in the browser and check the developer console.**

Expected: a series of `ok` lines followed by `[semivariogram tests done]` in terracotta. No `FAIL` lines. No uncaught errors. The page still shows the title (no UI changes yet).

---

## Task 3: GridView component (data-only render, no pairs yet)

**Files:**
- Modify: `index.html` — add `DATASETS` constant and `GridView` component above `App`. Update `App` to render the smooth preset using `GridView`.

- [ ] **Step 1: Add the three preset datasets above `computePairs`.**

```javascript
const DATASETS = {
  smooth: {
    label: 'Smooth spatial pattern',
    blurb: 'Strong autocorrelation — nearby cells are similar.',
    grid: [
      [22, 24, 25,   27, 29],
      [20, 22, null, 26, 28],
      [18, 20, 22,   25, 27],
      [16, null, 21, 23, 25],
      [14, 17, 19,   21, 24]
    ]
  },
  random: {
    label: 'Random noise',
    blurb: 'No spatial structure — semivariance is high even at h = 1.',
    grid: [
      [12, 28, 15,   31, 19],
      [24, null, 22, 14, 27],
      [30, 11, 25,   18, 22],
      [13, 26, null, 29, 16],
      [20, 17, 32,   14, 23]
    ]
  },
  clustered: {
    label: 'Clustered / patchy pattern',
    blurb: 'Two zones of similar values — irregular semivariogram.',
    grid: [
      [30, 30, 28,   12, 10],
      [28, null, 27, 13, 11],
      [26, 28, 25,   14, 12],
      [12, 14, null, 26, 28],
      [10, 12, 14,   28, 30]
    ]
  }
};
```

- [ ] **Step 2: Add grid-related CSS inside the `<style>` block (after the existing rules).**

```css
.grid-svg-frame {
  background: var(--paper-soft);
  border: 1px solid var(--rule);
  padding: 18px;
  display: inline-block;
}
.grid-svg { display: block; }
.cell-rect {
  fill: var(--paper);
  stroke: var(--rule);
  stroke-width: 0.5;
}
.cell-rect.unknown { fill: url(#unknownPattern); }
.cell-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 500;
  fill: var(--ink);
  text-anchor: middle;
  dominant-baseline: central;
  user-select: none;
}
.cell-value.unknown {
  fill: var(--unknown);
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 22px;
}
```

- [ ] **Step 3: Add `GridView` component above `App`.**

```jsx
function GridView({ grid, highlightedPairs, size = 360 }) {
  const N = grid.length;
  const padding = 20;
  const inner = size - padding * 2;
  const cellSize = inner / N;
  const center = (idx) => padding + idx * cellSize + cellSize / 2;

  const inPair = new Set();
  if (highlightedPairs) {
    highlightedPairs.forEach(p => {
      inPair.add(`${p.a.r}-${p.a.c}`);
      inPair.add(`${p.b.r}-${p.b.c}`);
    });
  }

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
          const highlighted = !isUnknown && inPair.has(`${r}-${c}`);
          return (
            <g key={`${r}-${c}`}>
              <rect
                className={`cell-rect ${isUnknown ? 'unknown' : ''} ${highlighted ? 'in-pair' : ''}`}
                x={padding + c * cellSize}
                y={padding + r * cellSize}
                width={cellSize}
                height={cellSize}
              />
              <text
                className={`cell-value ${isUnknown ? 'unknown' : ''}`}
                x={center(c)}
                y={center(r)}
              >
                {isUnknown ? '?' : v}
              </text>
            </g>
          );
        })
      )}
    </svg>
  );
}
```

- [ ] **Step 4: Update `App` to render the smooth preset grid.**

```jsx
function App() {
  return (
    <div style={{ padding: 48 }}>
      <h1 className="title" style={{ margin: '0 0 24px' }}>
        Interactive <em>Semivariogram</em> Builder
      </h1>
      <div className="grid-svg-frame">
        <GridView grid={DATASETS.smooth.grid} />
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify in the browser.**

Refresh `index.html`. Expected: the title above a 5×5 grid. Known values show in JetBrains Mono. Two cells (row 1 col 2 and row 3 col 1) show `?` in italic Fraunces with a diagonal-hatch background. Cells have thin warm-gray borders. No layout shifts.

---

## Task 4: Pair-line overlay on GridView

**Files:**
- Modify: `index.html` — extend `GridView` to draw pair lines and highlight paired cells; add the related CSS.

- [ ] **Step 1: Add pair-related CSS inside the `<style>` block.**

```css
.cell-rect.in-pair {
  fill: var(--accent-pale);
  stroke: var(--accent);
  stroke-width: 1;
}
.pair-line {
  stroke: var(--accent);
  stroke-width: 1.5;
  opacity: 0.55;
  fill: none;
  stroke-linecap: round;
}
.pair-dot { fill: var(--accent); }
```

- [ ] **Step 2: Add pair-line rendering to `GridView` at the end of the `<svg>` (after the cell rendering).**

Insert this block immediately before the closing `</svg>` tag in `GridView`:

```jsx
{highlightedPairs && highlightedPairs.map((p, i) => {
  const x1 = center(p.a.c), y1 = center(p.a.r);
  const x2 = center(p.b.c), y2 = center(p.b.r);
  return (
    <g key={`pair-${i}`}>
      <line className="pair-line" x1={x1} y1={y1} x2={x2} y2={y2} />
      <circle className="pair-dot" cx={x1} cy={y1} r={2.5} />
      <circle className="pair-dot" cx={x2} cy={y2} r={2.5} />
    </g>
  );
})}
```

- [ ] **Step 3: Temporarily wire a hard-coded selected lag in `App` to confirm pair lines render.**

Replace the body of `App` with:

```jsx
function App() {
  const grid = DATASETS.smooth.grid;
  const pairs = computePairs(grid, true);
  const lags = computeSemivariogram(pairs);
  // Use the first lag (h = 1) for visual verification
  const highlighted = lags[0].pairs;
  return (
    <div style={{ padding: 48 }}>
      <h1 className="title" style={{ margin: '0 0 24px' }}>
        Interactive <em>Semivariogram</em> Builder
      </h1>
      <div className="grid-svg-frame">
        <GridView grid={grid} highlightedPairs={highlighted} />
      </div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", marginTop: 16 }}>
        Showing h = {lags[0].label}, N = {lags[0].n}, γ = {lags[0].gamma.toFixed(2)}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Verify in the browser.**

Refresh. Expected: the smooth grid now has pale terracotta highlighted cells for every known-known pair at distance 1, with thin terracotta lines connecting them and dots at endpoints. The two `?` cells are untouched. Below the grid: `Showing h = 1.00, N = 30, γ = 2.07` (or similar — exact γ depends on the data; N = 30 is the count of horizontal+vertical pairs of known cells at h=1 in the smooth preset).

(Manual sanity check: 23 known cells. Horizontal pairs at h=1: rows have known-known runs giving 5+3+5+3+5 minus breaks at `?` cells… do not block on exact N; the visual is the check. As long as no `?` cell is highlighted and the lines look symmetric, this is correct.)

---

## Task 5: Three-panel layout shell + left panel (controls)

**Files:**
- Modify: `index.html` — add the masthead, three-panel main layout, and the controls in the left panel.

- [ ] **Step 1: Add layout, header, panel, and form-control CSS inside `<style>`.**

```css
/* MASTHEAD */
header.masthead {
  padding: 36px 48px 24px;
  border-bottom: 1px solid var(--rule);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
}
.masthead .eyebrow {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 14px;
  color: var(--accent);
  margin-bottom: 6px;
}
.masthead .meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--ink-mute);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: right;
  line-height: 1.7;
}
.masthead .meta .rule-line {
  display: inline-block; width: 80px; height: 1px;
  background: var(--rule); margin-bottom: 6px;
}

/* MAIN GRID */
main.workbench {
  display: grid;
  grid-template-columns: minmax(300px, 1fr) minmax(420px, 1.4fr) minmax(380px, 1.1fr);
  min-height: calc(100vh - 110px);
}
.panel {
  padding: 32px 36px;
  border-right: 1px solid var(--rule);
  position: relative;
}
.panel:last-child { border-right: none; }
.panel-header {
  display: flex;
  align-items: baseline;
  gap: 14px;
  margin-bottom: 24px;
  padding-bottom: 14px;
  border-bottom: 1px dashed var(--rule-soft);
}
.panel-num {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 14px;
  color: var(--accent);
}
.panel-title {
  font-family: 'Fraunces', serif;
  font-weight: 500;
  font-size: 24px;
  margin: 0;
  letter-spacing: -0.01em;
}
.panel-sub {
  font-family: 'Manrope', sans-serif;
  font-size: 12px;
  color: var(--ink-mute);
  margin-left: auto;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* CONTROLS */
.control-block { margin-bottom: 24px; }
.control-label {
  display: block;
  font-family: 'Manrope', sans-serif;
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-soft);
  margin-bottom: 10px;
}
select.preset {
  appearance: none;
  width: 100%;
  background: var(--paper-soft);
  border: 1px solid var(--rule);
  padding: 12px 36px 12px 14px;
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink);
  cursor: pointer;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'><path d='M1 1l5 5 5-5' stroke='%231c1812' stroke-width='1.5' fill='none' stroke-linecap='round'/></svg>");
  background-repeat: no-repeat;
  background-position: right 14px center;
}
select.preset:focus { outline: none; border-color: var(--accent); }

.toggle-group {
  display: flex;
  border: 1px solid var(--rule);
  background: var(--paper-soft);
}
.toggle-btn {
  flex: 1;
  background: transparent;
  border: none;
  padding: 11px 10px;
  font-family: 'Manrope', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-soft);
  cursor: pointer;
  border-right: 1px solid var(--rule);
}
.toggle-btn:last-child { border-right: none; }
.toggle-btn.active { background: var(--ink); color: var(--paper); }

.legend {
  display: flex;
  gap: 14px;
  margin-bottom: 18px;
  flex-wrap: wrap;
  font-size: 11.5px;
  color: var(--ink-mute);
}
.legend-item { display: flex; align-items: center; gap: 6px; }
.swatch { width: 14px; height: 14px; border: 1px solid var(--rule); display: inline-block; }
.swatch.known { background: var(--paper); }
.swatch.pair { background: var(--accent-pale); border-color: var(--accent); }
.swatch.unknown-sw {
  background-image: repeating-linear-gradient(45deg,
    var(--unknown), var(--unknown) 2px, transparent 2px, transparent 5px);
  background-color: var(--paper-deep);
}

.preset-blurb {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 13px;
  color: var(--ink-mute);
  margin-top: 8px;
  line-height: 1.4;
}

input[type=checkbox].model-toggle {
  appearance: none;
  width: 18px; height: 18px;
  border: 1px solid var(--rule);
  background: var(--paper-soft);
  margin-right: 8px;
  vertical-align: middle;
  cursor: pointer;
  position: relative;
}
input[type=checkbox].model-toggle:checked {
  background: var(--accent);
  border-color: var(--accent);
}
input[type=checkbox].model-toggle:checked::after {
  content: '✓';
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--paper);
  font-size: 13px;
}
.model-toggle-label {
  font-family: 'Manrope', sans-serif;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
}
```

- [ ] **Step 2: Rewrite `App` with the three-panel skeleton and full left panel.**

```jsx
function App() {
  const [presetKey, setPresetKey] = useState('smooth');
  const [allDirections, setAllDirections] = useState(true);
  const [showModel, setShowModel] = useState(false);

  const preset = DATASETS[presetKey];
  const grid = preset.grid;
  const pairs = useMemo(() => computePairs(grid, allDirections), [grid, allDirections]);
  const lags = useMemo(() => computeSemivariogram(pairs), [pairs]);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="eyebrow">Ordinary Kriging · Teaching Demonstration</div>
          <h1 className="title" style={{ margin: 0 }}>
            Interactive <em>Semivariogram</em> Builder
          </h1>
        </div>
        <div className="meta">
          <div><span className="rule-line"></span></div>
          <div>5 × 5 sample grid</div>
          <div>γ(h) from observed pairs</div>
          <div>← / → to step lags</div>
        </div>
      </header>

      <main className="workbench">
        <section className="panel">
          <div className="panel-header">
            <span className="panel-num">§ 1</span>
            <h2 className="panel-title">Controls</h2>
            <span className="panel-sub">{preset.label}</span>
          </div>

          <div className="control-block">
            <label className="control-label">Dataset preset</label>
            <select className="preset" value={presetKey}
              onChange={e => setPresetKey(e.target.value)}>
              {Object.entries(DATASETS).map(([k, d]) =>
                <option key={k} value={k}>{d.label}</option>
              )}
            </select>
            <div className="preset-blurb">{preset.blurb}</div>
          </div>

          <div className="control-block">
            <label className="control-label">Direction mode</label>
            <div className="toggle-group">
              <button
                className={`toggle-btn ${!allDirections ? 'active' : ''}`}
                onClick={() => setAllDirections(false)}>
                Cardinal only
              </button>
              <button
                className={`toggle-btn ${allDirections ? 'active' : ''}`}
                onClick={() => setAllDirections(true)}>
                All directions
              </button>
            </div>
            <div className="preset-blurb">
              {allDirections
                ? 'Includes diagonals — realistic omnidirectional semivariogram.'
                : 'Horizontal and vertical only — mirrors the 3×3 manual exercise.'}
            </div>
          </div>

          <div className="control-block">
            <label className="model-toggle-label">
              <input type="checkbox" className="model-toggle"
                checked={showModel}
                onChange={e => setShowModel(e.target.checked)} />
              Show fitted spherical model
            </label>
          </div>

          <div className="legend">
            <span className="legend-item"><span className="swatch known"></span> observed value</span>
            <span className="legend-item"><span className="swatch pair"></span> paired cell</span>
            <span className="legend-item"><span className="swatch unknown-sw"></span> unsampled (?)</span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <span className="panel-num">§ 2</span>
            <h2 className="panel-title">Point pairs at h</h2>
          </div>
          <div className="grid-svg-frame">
            <GridView grid={grid} highlightedPairs={lags[0]?.pairs} size={420} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <span className="panel-num">§ 3</span>
            <h2 className="panel-title">Empirical semivariogram</h2>
            <span className="panel-sub">{lags.length} lag distances</span>
          </div>
          <p style={{ color: 'var(--ink-mute)' }}>Plot coming next task.</p>
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser.**

Refresh. Expected: a header with title and meta info. Three columns separated by warm-gray borders. Left column shows the dataset dropdown, the cardinal/all toggle, the model checkbox, and the legend. Switching the dropdown changes the preset blurb and reloads the grid in the center column with the first lag pre-highlighted. Switching the toggle changes which pair lines appear (cardinal mode removes the diagonal lines).

---

## Task 6: Lag chip strip + step controls

**Files:**
- Modify: `index.html` — add `revealedCount` / `selectedIdx` state, wire lag chips and Prev / Next / Reset buttons. Update `GridView` props to reflect gating.

- [ ] **Step 1: Add CSS for chips and step buttons.**

```css
.lag-strip {
  display: flex; flex-wrap: wrap; gap: 6px; margin: 18px 0;
}
.lag-chip {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px; font-weight: 500;
  background: var(--paper-soft);
  border: 1px solid var(--rule);
  color: var(--ink-soft);
  padding: 7px 11px;
  cursor: pointer;
  letter-spacing: 0.02em;
}
.lag-chip:hover { border-color: var(--ink-mute); }
.lag-chip.active {
  background: var(--accent); color: var(--paper-soft); border-color: var(--accent);
}
.lag-chip.upcoming { opacity: 0.35; }
.lag-chip .n-badge { margin-left: 6px; font-size: 10px; opacity: 0.7; }

.step-controls { display: flex; gap: 8px; flex-wrap: wrap; }
.step-btn {
  font-family: 'Manrope', sans-serif;
  font-size: 13px; font-weight: 500;
  background: var(--paper-soft);
  border: 1px solid var(--rule);
  color: var(--ink);
  padding: 10px 14px;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
}
.step-btn:hover:not(:disabled) {
  background: var(--ink); color: var(--paper); border-color: var(--ink);
}
.step-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.step-btn.primary { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.step-btn.primary:hover:not(:disabled) { background: var(--accent); border-color: var(--accent); }
```

- [ ] **Step 2: Replace `App` with the interactive version (chips and step controls).**

```jsx
function App() {
  const [presetKey, setPresetKey] = useState('smooth');
  const [allDirections, setAllDirections] = useState(true);
  const [showModel, setShowModel] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [revealedCount, setRevealedCount] = useState(0);

  const preset = DATASETS[presetKey];
  const grid = preset.grid;
  const pairs = useMemo(() => computePairs(grid, allDirections), [grid, allDirections]);
  const lags = useMemo(() => computeSemivariogram(pairs), [pairs]);

  // Reset progression when the lag set changes
  useEffect(() => {
    setRevealedCount(0);
    setSelectedIdx(0);
  }, [presetKey, allDirections]);

  const selectedLag = revealedCount > 0 ? lags[selectedIdx] : null;
  const highlightedPairs = selectedLag ? selectedLag.pairs : null;

  const onNext = useCallback(() => {
    setRevealedCount(rc => {
      if (rc >= lags.length) return rc;
      const next = rc + 1;
      setSelectedIdx(next - 1);
      return next;
    });
  }, [lags.length]);

  const onPrev = useCallback(() => {
    setRevealedCount(rc => {
      if (rc <= 0) return rc;
      const next = rc - 1;
      setSelectedIdx(Math.max(0, next - 1));
      return next;
    });
  }, []);

  const onReset = useCallback(() => {
    setRevealedCount(0);
    setSelectedIdx(0);
  }, []);

  const onChipClick = useCallback((i) => {
    setRevealedCount(rc => Math.max(rc, i + 1));
    setSelectedIdx(i);
  }, []);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="eyebrow">Ordinary Kriging · Teaching Demonstration</div>
          <h1 className="title" style={{ margin: 0 }}>
            Interactive <em>Semivariogram</em> Builder
          </h1>
        </div>
        <div className="meta">
          <div><span className="rule-line"></span></div>
          <div>5 × 5 sample grid</div>
          <div>γ(h) from observed pairs</div>
          <div>← / → to step lags</div>
        </div>
      </header>

      <main className="workbench">
        {/* LEFT PANEL — same as Task 5 */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-num">§ 1</span>
            <h2 className="panel-title">Controls</h2>
            <span className="panel-sub">{preset.label}</span>
          </div>
          <div className="control-block">
            <label className="control-label">Dataset preset</label>
            <select className="preset" value={presetKey}
              onChange={e => setPresetKey(e.target.value)}>
              {Object.entries(DATASETS).map(([k, d]) =>
                <option key={k} value={k}>{d.label}</option>)}
            </select>
            <div className="preset-blurb">{preset.blurb}</div>
          </div>
          <div className="control-block">
            <label className="control-label">Direction mode</label>
            <div className="toggle-group">
              <button className={`toggle-btn ${!allDirections ? 'active' : ''}`}
                onClick={() => setAllDirections(false)}>Cardinal only</button>
              <button className={`toggle-btn ${allDirections ? 'active' : ''}`}
                onClick={() => setAllDirections(true)}>All directions</button>
            </div>
            <div className="preset-blurb">
              {allDirections
                ? 'Includes diagonals — realistic omnidirectional semivariogram.'
                : 'Horizontal and vertical only — mirrors the 3×3 manual exercise.'}
            </div>
          </div>
          <div className="control-block">
            <label className="model-toggle-label">
              <input type="checkbox" className="model-toggle"
                checked={showModel}
                onChange={e => setShowModel(e.target.checked)} />
              Show fitted spherical model
            </label>
          </div>
          <div className="legend">
            <span className="legend-item"><span className="swatch known"></span> observed value</span>
            <span className="legend-item"><span className="swatch pair"></span> paired cell</span>
            <span className="legend-item"><span className="swatch unknown-sw"></span> unsampled (?)</span>
          </div>
        </section>

        {/* CENTER PANEL — grid + chips + step controls */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-num">§ 2</span>
            <h2 className="panel-title">Point pairs at h</h2>
            <span className="panel-sub">
              {selectedLag ? `h = ${selectedLag.label} · N = ${selectedLag.n}` : 'press Next to start'}
            </span>
          </div>

          <div className="grid-svg-frame" style={{ display: 'flex', justifyContent: 'center' }}>
            <GridView grid={grid} highlightedPairs={highlightedPairs} size={420} />
          </div>

          <label className="control-label" style={{ marginTop: 22 }}>
            Lag distance h — click to reveal up to that lag
          </label>
          <div className="lag-strip">
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

          <label className="control-label">Step through</label>
          <div className="step-controls">
            <button className="step-btn" onClick={onPrev} disabled={revealedCount === 0}>← Previous</button>
            <button className="step-btn primary" onClick={onNext} disabled={revealedCount >= lags.length}>Next →</button>
            <button className="step-btn" onClick={onReset} disabled={revealedCount === 0}>Reset</button>
          </div>
        </section>

        {/* RIGHT PANEL — placeholder until Task 7 */}
        <section className="panel">
          <div className="panel-header">
            <span className="panel-num">§ 3</span>
            <h2 className="panel-title">Empirical semivariogram</h2>
            <span className="panel-sub">{lags.length} lag distances</span>
          </div>
          <p style={{ color: 'var(--ink-mute)' }}>
            Plot, calculation summary, and teaching notes will appear here.
          </p>
        </section>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify in the browser.**

Refresh. Expected:
1. Initial load: no pair lines on the grid. Right column shows the plot placeholder. Chips are dimmed.
2. Click **Next →**: the smallest-h lag becomes active; its pairs appear on the grid; the matching chip is terracotta. The panel-sub updates to `h = 1.00 · N = …`.
3. Keep clicking Next: each step reveals the next lag and updates the highlight.
4. Click **← Previous**: the most-recently-revealed lag disappears.
5. Click **Reset**: returns to the empty state.
6. Click a dimmed chip several positions ahead: every chip up to that one becomes active; the clicked chip is selected.
7. Switch dataset or direction mode: returns to the empty state.

---

## Task 7: SemivariogramPlot component (without model overlay)

**Files:**
- Modify: `index.html` — add `SemivariogramPlot` component, related CSS, and embed it in the right panel.

- [ ] **Step 1: Add plot CSS.**

```css
.formula {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 17px;
  text-align: center;
  padding: 14px;
  color: var(--ink);
  background: var(--paper-deep);
  margin-bottom: 16px;
}
.formula .accent { color: var(--accent); font-weight: 500; }

.plot-frame {
  background: var(--paper-soft);
  border: 1px solid var(--rule);
  padding: 14px 8px 8px;
  margin-bottom: 22px;
}
.plot-svg { display: block; width: 100%; height: auto; }
.axis-line { stroke: var(--ink); stroke-width: 0.8; }
.axis-tick { stroke: var(--ink-mute); stroke-width: 0.5; }
.axis-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  fill: var(--ink-mute);
}
.axis-label {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 14px;
  fill: var(--ink);
}
.gridline {
  stroke: var(--rule-soft);
  stroke-width: 0.5;
  stroke-dasharray: 2 3;
}
.plot-point {
  fill: var(--ink);
  stroke: var(--paper-soft);
  stroke-width: 1.2;
}
.plot-point.selected { fill: var(--accent); }
.plot-point-ring {
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.2;
  opacity: 0.45;
}
.plot-connector {
  stroke: var(--ink-mute);
  stroke-width: 0.6;
  fill: none;
  stroke-dasharray: 1 3;
}
```

- [ ] **Step 2: Add `niceStep` helper and `SemivariogramPlot` component above `App`.**

```jsx
function niceStep(range, targetTicks) {
  const raw = range / targetTicks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  let step;
  if (norm < 1.5) step = 1;
  else if (norm < 3) step = 2;
  else if (norm < 7) step = 5;
  else step = 10;
  return step * mag;
}

function SemivariogramPlot({ lags, selectedIdx, revealedCount, width = 480, height = 290 }) {
  const margin = { top: 18, right: 22, bottom: 46, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const visibleLags = lags.slice(0, revealedCount);

  // Use the full lag set for axis domains so axes stay stable
  const maxH = Math.max(...lags.map(l => l.h), 1);
  const maxG = Math.max(...lags.map(l => l.gamma), 1);
  const xScale = (h) => margin.left + (h / (maxH * 1.05)) * innerW;
  const yScale = (g) => margin.top + innerH - (g / (maxG * 1.1)) * innerH;

  const xTicks = [];
  for (let t = 0; t <= maxH * 1.05; t++) xTicks.push(t);
  const yStep = niceStep(maxG * 1.1, 5);
  const yTicks = [];
  for (let t = 0; t <= maxG * 1.1; t += yStep) yTicks.push(t);

  return (
    <svg className="plot-svg" viewBox={`0 0 ${width} ${height}`}>
      {yTicks.map((t, i) => (
        <line key={`gy-${i}`} className="gridline"
          x1={margin.left} x2={margin.left + innerW}
          y1={yScale(t)} y2={yScale(t)} />
      ))}
      <line className="axis-line"
        x1={margin.left} x2={margin.left + innerW}
        y1={margin.top + innerH} y2={margin.top + innerH} />
      <line className="axis-line"
        x1={margin.left} x2={margin.left}
        y1={margin.top} y2={margin.top + innerH} />
      {xTicks.map((t, i) => (
        <g key={`tx-${i}`}>
          <line className="axis-tick"
            x1={xScale(t)} x2={xScale(t)}
            y1={margin.top + innerH} y2={margin.top + innerH + 5} />
          <text className="axis-text"
            x={xScale(t)} y={margin.top + innerH + 16}
            textAnchor="middle">{t}</text>
        </g>
      ))}
      {yTicks.map((t, i) => (
        <g key={`ty-${i}`}>
          <line className="axis-tick"
            x1={margin.left - 5} x2={margin.left}
            y1={yScale(t)} y2={yScale(t)} />
          <text className="axis-text"
            x={margin.left - 8} y={yScale(t)}
            textAnchor="end" dominantBaseline="central">
            {t.toFixed(t < 10 ? 1 : 0)}
          </text>
        </g>
      ))}
      <text className="axis-label"
        x={margin.left + innerW / 2}
        y={height - 8}
        textAnchor="middle">lag distance h</text>
      <text className="axis-label"
        x={-margin.top - innerH / 2}
        y={16}
        transform="rotate(-90)"
        textAnchor="middle">semivariance γ(h)</text>

      {visibleLags.length > 1 && (
        <path className="plot-connector"
          d={visibleLags
            .map((l, i) => `${i === 0 ? 'M' : 'L'} ${xScale(l.h)} ${yScale(l.gamma)}`)
            .join(' ')} />
      )}

      {visibleLags.map((l, i) => {
        const selected = i === selectedIdx;
        return (
          <g key={`pt-${i}`}>
            {selected && (
              <circle className="plot-point-ring"
                cx={xScale(l.h)} cy={yScale(l.gamma)} r={11} />
            )}
            <circle className={`plot-point ${selected ? 'selected' : ''}`}
              cx={xScale(l.h)} cy={yScale(l.gamma)} r={selected ? 6 : 4} />
            {selected && (
              <text className="axis-text"
                x={xScale(l.h)} y={yScale(l.gamma) - 14}
                textAnchor="middle"
                style={{ fill: 'var(--accent)', fontWeight: 600 }}>
                γ = {l.gamma.toFixed(2)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 3: Replace the right-panel placeholder in `App` with the formula box and plot.**

In `App`, find the right panel and replace its contents with:

```jsx
<section className="panel">
  <div className="panel-header">
    <span className="panel-num">§ 3</span>
    <h2 className="panel-title">Empirical semivariogram</h2>
    <span className="panel-sub">{lags.length} lag distances</span>
  </div>

  <div className="formula">
    γ(<span className="accent">h</span>) ={' '}
    1 ⁄ 2N(<span className="accent">h</span>) · Σ [ z(s<sub>i</sub>) − z(s<sub>j</sub>) ]²
  </div>

  <div className="plot-frame">
    <SemivariogramPlot
      lags={lags}
      selectedIdx={selectedIdx}
      revealedCount={revealedCount}
    />
  </div>
</section>
```

- [ ] **Step 4: Verify in the browser.**

Refresh. Expected:
1. Right panel now shows the formula box (italic Fraunces, parchment-deep background).
2. Empty plot frame with axes, gridlines, and labels `lag distance h` and `semivariance γ(h)`. No points yet.
3. Click **Next →**: a black-ink dot appears on the plot. Because it is also selected, it is drawn in terracotta with a faded ring and a `γ = …` label above it.
4. Keep clicking Next: each step adds a point and connects it to the previous one with a dotted gray line. Selection moves to the latest point each time.
5. Click an earlier chip: selection (terracotta) moves back to that chip's plot point without removing later points.
6. Switching dataset or direction mode resets the plot to empty.

---

## Task 8: CalculationSummary component

**Files:**
- Modify: `index.html` — add `CalculationSummary` component, related CSS, and embed it in the right panel below the plot.

- [ ] **Step 1: Add summary CSS.**

```css
.summary-box {
  border: 1px solid var(--rule);
  background: var(--paper-soft);
  padding: 18px 20px;
  margin-bottom: 20px;
  border-left: 3px solid var(--accent);
}
.summary-line {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 6px 0;
  border-bottom: 1px dotted var(--rule);
  font-size: 14px;
}
.summary-line:last-of-type { border-bottom: none; }
.summary-line .label {
  font-family: 'Fraunces', serif;
  font-style: italic;
  color: var(--ink-soft);
}
.summary-line .val {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: var(--ink);
}
.summary-line .val.big {
  font-size: 18px;
  color: var(--accent);
  font-weight: 600;
}
.pair-table {
  margin-top: 14px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  border-top: 1px dashed var(--rule);
  padding-top: 12px;
}
.pair-table-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 4px 0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-mute);
  border-bottom: 1px solid var(--rule-soft);
  margin-bottom: 6px;
}
.pair-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  padding: 3px 0;
  color: var(--ink-soft);
}
.pair-row .sq { color: var(--accent); font-weight: 500; }
.more-note {
  margin-top: 8px;
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 12px;
  color: var(--ink-mute);
}
.empty-summary {
  border: 1px dashed var(--rule);
  padding: 22px;
  color: var(--ink-mute);
  font-family: 'Fraunces', serif;
  font-style: italic;
  text-align: center;
  margin-bottom: 20px;
}
```

- [ ] **Step 2: Add `CalculationSummary` above `App`.**

```jsx
function CalculationSummary({ lag }) {
  if (!lag) {
    return (
      <div className="empty-summary">
        Press <strong>Next →</strong> to reveal the first lag.
      </div>
    );
  }
  const MAX_ROWS = 8;
  const showRows = lag.pairs.slice(0, MAX_ROWS);
  const more = lag.pairs.length - showRows.length;
  return (
    <div className="summary-box">
      <div className="summary-line">
        <span className="label">selected lag distance</span>
        <span className="val">h = {lag.label}</span>
      </div>
      <div className="summary-line">
        <span className="label">number of valid pairs</span>
        <span className="val">N(h) = {lag.n}</span>
      </div>
      <div className="summary-line">
        <span className="label">sum of squared differences</span>
        <span className="val">Σ = {lag.sumSq.toFixed(2)}</span>
      </div>
      <div className="summary-line">
        <span className="label">semivariance</span>
        <span className="val big">γ(h) = {lag.gamma.toFixed(2)}</span>
      </div>
      <div className="pair-table">
        <div className="pair-table-header">
          <span>pair (z_i, z_j)</span>
          <span>diff</span>
          <span>(diff)²</span>
        </div>
        {showRows.map((p, i) => (
          <div className="pair-row" key={i}>
            <span>({p.a.v}, {p.b.v})</span>
            <span>{(p.a.v - p.b.v).toFixed(0)}</span>
            <span className="sq">{p.sqDiff.toFixed(0)}</span>
          </div>
        ))}
        {more > 0 && (
          <div className="more-note">
            showing first {MAX_ROWS} of {lag.pairs.length} pairs
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Embed `CalculationSummary` in the right panel of `App`, immediately after the `.plot-frame` div.**

```jsx
<CalculationSummary lag={selectedLag} />
```

- [ ] **Step 4: Verify in the browser.**

Refresh. Expected:
1. Initially: right panel shows the empty-summary card "Press Next → to reveal the first lag."
2. After Next: the summary box appears with four labeled lines (h, N(h), Σ, γ(h)) and a paired-values table showing up to 8 rows. The γ value is in terracotta. A note "showing first 8 of N pairs" appears when N > 8.
3. Switching lags updates every field. Clicking back through Previous keeps the summary in sync.
4. After Reset: returns to the empty-summary card.

---

## Task 9: Teaching notes block + masthead grain polish

**Files:**
- Modify: `index.html` — add teaching notes to the right panel, add subtle background grain, add panel-spacing polish.

- [ ] **Step 1: Add notes CSS.**

```css
.notes-block { margin-top: 24px; }
.notes-title {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-weight: 500;
  font-size: 16px;
  color: var(--ink);
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.notes-title::before {
  content: '';
  width: 24px;
  height: 1px;
  background: var(--accent);
}
.notes-list { list-style: none; padding: 0; margin: 0; }
.notes-list li {
  padding: 8px 0 8px 16px;
  border-left: 2px solid var(--rule-soft);
  margin-bottom: 8px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-soft);
  position: relative;
}
.notes-list li::before {
  content: '§';
  font-family: 'Fraunces', serif;
  font-style: italic;
  color: var(--accent);
  position: absolute;
  left: -10px;
  top: 7px;
  background: var(--paper);
  padding: 0 2px;
  font-size: 12px;
}
```

- [ ] **Step 2: Add the notes block to the bottom of the right panel in `App`, after `CalculationSummary`.**

```jsx
<div className="notes-block">
  <div className="notes-title">Teaching notes</div>
  <ul className="notes-list">
    <li>Semivariance measures the average dissimilarity between pairs separated by distance h.</li>
    <li>When spatial autocorrelation is strong, nearby locations have smaller squared differences, so γ(h) rises with h.</li>
    <li>Real point datasets are not only horizontal or vertical — Euclidean distance also includes diagonals like h = 1.41 and h = 2.24.</li>
    <li>The "?" cells are unsampled. They are not used to build γ(h), but they remind us why interpolation is the next step.</li>
  </ul>
</div>
```

- [ ] **Step 3: Add paper-grain background and stacking context.**

Inside the `<style>` block, append:

```css
body {
  background-image:
    radial-gradient(ellipse at top left, rgba(176, 69, 39, 0.04), transparent 60%),
    radial-gradient(ellipse at bottom right, rgba(93, 122, 91, 0.04), transparent 60%);
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.35;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.1 0 0 0 0 0.08 0 0 0 0 0.05 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
.app { position: relative; z-index: 2; }
```

- [ ] **Step 4: Verify in the browser.**

Refresh. Expected:
1. Faint warm radial gradients in the corners and a subtle paper grain across the whole page.
2. Right panel now ends with a "Teaching notes" header followed by four bullet lines, each prefixed with a small terracotta `§` glyph on a 2px gray left rule.
3. Nothing else changes visually except for the added grain and notes.

---

## Task 10: Spherical model overlay

**Files:**
- Modify: `index.html` — add a `fitSphericalModel` helper and a model-curve `<path>` inside `SemivariogramPlot`.

- [ ] **Step 1: Add `fitSphericalModel` above `SemivariogramPlot`.**

```javascript
// Auto-fit a spherical variogram model from revealed empirical points.
// Returns null when there are fewer than 2 revealed lags to fit.
//
//   gamma(h) = c0 + c1 * (1.5*(h/a) - 0.5*(h/a)^3)   for h <= a
//   gamma(h) = c0 + c1                                for h >  a
//
// Heuristics:
//   c0 (nugget) = max(0, gamma at smallest revealed h)
//   c0+c1 (sill) = max(gamma across revealed lags)
//   a (range)    = h of the smallest lag whose gamma >= 0.95*sill,
//                  falling back to max(h) if no lag reaches that.
function fitSphericalModel(revealedLags) {
  if (!revealedLags || revealedLags.length < 2) return null;
  const sorted = [...revealedLags].sort((a, b) => a.h - b.h);
  const c0 = Math.max(0, sorted[0].gamma);
  const sill = Math.max(...sorted.map(l => l.gamma));
  const c1 = Math.max(0.0001, sill - c0);
  const threshold = c0 + 0.95 * c1;
  const reached = sorted.find(l => l.gamma >= threshold);
  const a = reached ? reached.h : sorted[sorted.length - 1].h;
  return { c0, c1, a, sill: c0 + c1 };
}

function sphericalGamma({ c0, c1, a }, h) {
  if (h >= a) return c0 + c1;
  const x = h / a;
  return c0 + c1 * (1.5 * x - 0.5 * x ** 3);
}
```

- [ ] **Step 2: Extend `SemivariogramPlot` to accept and render the model.**

Change the component signature:

```jsx
function SemivariogramPlot({ lags, selectedIdx, revealedCount, showModel, width = 480, height = 290 }) {
```

Inside the function, compute the model after the scales are defined:

```javascript
const model = showModel ? fitSphericalModel(visibleLags) : null;
let modelPath = null;
if (model) {
  const samples = 80;
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const h = (i / samples) * maxH * 1.05;
    pts.push(`${i === 0 ? 'M' : 'L'} ${xScale(h)} ${yScale(sphericalGamma(model, h))}`);
  }
  modelPath = pts.join(' ');
}
```

Add the model curve CSS:

```css
.model-curve {
  stroke: var(--ink-mute);
  stroke-width: 1.2;
  fill: none;
  stroke-dasharray: 4 3;
  opacity: 0.7;
}
.model-label {
  font-family: 'Fraunces', serif;
  font-style: italic;
  font-size: 11px;
  fill: var(--ink-mute);
}
```

And render the path inside the SVG, between the connector line and the points:

```jsx
{modelPath && (
  <>
    <path className="model-curve" d={modelPath} />
    <text className="model-label"
      x={xScale(maxH * 0.95)}
      y={yScale(model.sill) - 6}
      textAnchor="end">
      spherical: c₀ = {model.c0.toFixed(1)}, sill = {model.sill.toFixed(1)}, a = {model.a.toFixed(2)}
    </text>
  </>
)}
```

- [ ] **Step 3: Pass `showModel` from `App` into `SemivariogramPlot`.**

In `App`, update the plot usage to:

```jsx
<SemivariogramPlot
  lags={lags}
  selectedIdx={selectedIdx}
  revealedCount={revealedCount}
  showModel={showModel}
/>
```

- [ ] **Step 4: Verify in the browser.**

Refresh. Expected:
1. With the checkbox unchecked: no curve, no label.
2. Check "Show fitted spherical model" once at least two lags are revealed: a dashed muted curve appears, rising and flattening near the sill, and a small italic label at the top-right of the plot lists nugget, sill, and range. The empirical points stay sharp and on top.
3. As more lags are revealed via Next, the curve re-fits.
4. With the random preset, the curve is roughly flat near the sill (no autocorrelation). With the smooth preset, it rises smoothly. With the clustered preset, it has a more abrupt jump.

---

## Task 11: Keyboard shortcuts + responsive breakpoints + final polish

**Files:**
- Modify: `index.html` — add keyboard handler, responsive CSS, projector-friendly type scaling.

- [ ] **Step 1: Add the keyboard handler inside `App`.**

Insert this `useEffect` near the other state hooks in `App`:

```javascript
useEffect(() => {
  const onKey = (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') { e.preventDefault(); onNext(); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); onPrev(); }
    else if (e.key === 'Home') { e.preventDefault(); onReset(); }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [onNext, onPrev, onReset]);
```

- [ ] **Step 2: Add responsive + projector media queries at the end of the `<style>` block.**

```css
@media (max-width: 1180px) {
  main.workbench { grid-template-columns: 1fr; }
  .panel { border-right: none; border-bottom: 1px solid var(--rule); }
  header.masthead { padding: 24px 28px 18px; flex-direction: column; align-items: flex-start; }
  .masthead .meta { text-align: left; }
}
@media (min-width: 1600px) {
  body { font-size: 16px; }
  h1.title { font-size: 56px; }
  .panel { padding: 38px 44px; }
}
```

- [ ] **Step 3: Verify in the browser.**

Refresh and test:
1. With focus on the page (click on a panel background), press `→` → next lag revealed; `←` → previous lag removed; `Home` → reset.
2. Focus a `<select>` or button and press `→` — page should NOT navigate (focus-aware guard works).
3. Resize the window below 1180 px wide — panels stack vertically with horizontal borders. Header stacks vertically.
4. On a 1440p or 4K display, type and panel padding scale up slightly.

---

## Task 12: End-to-end demo verification

This task does no code changes. It walks through the 3-minute classroom demo to confirm the success criteria from the spec are met.

- [ ] **Step 1: Reload the page.** Confirm: parchment background, three panels, title and meta visible, empty plot, "Press Next →" empty-summary card.

- [ ] **Step 2: Smooth preset, all directions.** Press Next once. Confirm `h = 1.00`, a sensible N (≈ 30), pair lines on the grid, summary table populated, one terracotta point on the plot.

- [ ] **Step 3: Step to h = 1.41.** Confirm diagonal pair lines appear; γ increases vs h = 1.

- [ ] **Step 4: Jump to a far chip.** Click h ≈ 4 or 5. Confirm all chips between revealed; selected chip is terracotta; plot now has multiple points and a dashed connector.

- [ ] **Step 5: Toggle "Show fitted spherical model".** Confirm a smooth curve appears, with nugget/sill/range label.

- [ ] **Step 6: Switch to "Cardinal only".** Confirm the lag set collapses to integer distances (1, 2, 3, 4); plot resets; model overlay disappears until enough lags are revealed again.

- [ ] **Step 7: Switch to "Random noise" preset.** Step through. Confirm γ is high even at h = 1.

- [ ] **Step 8: Switch to "Clustered / patchy".** Step through. Confirm the semivariogram is irregular vs the smooth preset.

- [ ] **Step 9: Confirm console.** Open DevTools. Confirm no errors. The inline self-tests should still log `ok` lines and `[semivariogram tests done]`.

- [ ] **Step 10: Verify projector layout.** Maximize the window on a secondary display or zoom to 125 %. Confirm legibility from the back of a classroom — title is large, numbers in mono are crisp, axes labels readable.

---

## Notes for the implementer

- **Single file discipline.** Resist splitting into multiple files. The whole point of the deliverable is one HTML file the instructor can email or USB-transfer.
- **No git commits per task** since the directory is not a git repo. After everything works, the user may choose to `git init && git add -A && git commit -m "initial build"` once.
- **Inline self-tests stay in the file**, even after the build is done. They re-verify the math on every page load and take milliseconds. Failing tests print loudly in the console for the instructor to notice if the file gets edited later.
- **Comments belong only on the math.** The pure helpers carry block comments explaining the semivariance formula and the exclusion rule. Other code should be self-explanatory and uncommented.
- **Numbers everywhere should be JetBrains Mono.** Letters and labels are Fraunces (display) or Manrope (UI). This typographic split is the strongest carrier of the editorial-scientific aesthetic; don't let it slip.
