// lib/semivariogram.js — shared math, datasets, and React components
// for three.html and ten.html.
//
// Loaded as: <script type="text/babel" data-presets="env,react" src="lib/semivariogram.js"><\/script>
// (Babel-standalone transpiles it in the browser because it contains JSX.)
//
// In-browser self-tests at the bottom (runTests IIFE) emit the
// "[semivariogram tests done]" banner that verify.py watches for.

const { useState, useMemo, useEffect, useCallback } = React;

// ------------------------------------------------------------------
// 3×3 fixed rainfall grid — values come straight from the teaching-demo
// slides. Cardinal-only mode produces exactly h = 1 (12 pairs) and
// h = 2 (6 pairs); see test T5 for the expected γ values.
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

// ------------------------------------------------------------------
// DATASETS_10X10 — 10x10 grids generated to produce instructive semivariogram shapes.
// `null` marks an unsampled cell (`?`).
// ------------------------------------------------------------------
const DATASETS_10X10 = {
  smooth: {
    label: 'Smooth spatial pattern',
    blurb: 'Short-range autocorrelation — γ(h) rises then plateaus near the sill.',
    grid: [
      [ 24,  23,  21,  19,  18,  20,  22,  25,  31,  34],
      [ 27,  26,  23,  21,  20,  23,  25,  27,  30,  32],
      [ 29,  29,  28,  25,  24, null,  28,  27,  27,  27],
      [ 28,  29,  29,  27,  26,  27,  27,  26,  25,  24],
      [ 26,  26,  27,  26,  25,  25,  26,  26,  26,  26],
      [ 22,  23,  25,  24,  22,  22,  25, null,  23,  24],
      [ 22,  24,  26,  24,  20,  21,  25,  24,  20,  18],
      [ 27,  28,  29,  27,  22,  21,  25,  25,  21,  18],
      [ 32,  33, null,  30,  23,  20,  23,  26,  26,  24],
      [ 33,  33,  34,  31,  23,  19,  22,  27,  29,  28]
    ]
  },
  random: {
    label: 'Random noise',
    blurb: 'No spatial structure — γ(h) is flat near the variance from the very first lag.',
    grid: [
      [ 33,  26,  27,  32,  25,  29,  31,  17,  13,  18],
      [ 18,  32,  32,  12,  23,  30,  15,  30,  14,  22],
      [ 30,  18,  19,  18,  28,  17,  34,  22,  22,  23],
      [ 25,  24,  23,  34,  30,  30, null,  26,  19,  34],
      [ 22,  16,  31,  15,  31,  26,  14,  13, null,  12],
      [ 15,  23,  34,  22,  30,  33,  30,  26,  22,  23],
      [ 18,  23,  20,  17,  34,  12,  14,  16,  34,  27],
      [ 32, null,  28,  20,  23,  12,  26,  31,  27,  15],
      [ 24,  18,  34,  32,  16,  23,  33,  31,  28,  26],
      [ 12,  29,  22,  14,  17,  24,  28,  23,  26,  32]
    ]
  },
  clustered: {
    label: 'Clustered / patchy pattern',
    blurb: 'Two zones produce a periodic γ(h) — it rises, peaks, then dips ("hole effect").',
    grid: [
      [ 30,  30,  30,  29,  28,  15,  15,  14,  14,  14],
      [ 30,  30,  30,  31,  27,  16,  14,  14,  14,  14],
      [ 30,  30,  30,  30,  27,  16, null,  14,  14,  16],
      [ 29,  29,  30,  31,  29,  16,  14,  14,  14,  13],
      [ 28,  27,  28,  28,  27,  19,  16,  16,  17,  15],
      [ 16,  16,  15,  16,  17,  26,  27,  28,  28,  28],
      [ 14,  15,  14, null,  17,  28,  31,  30,  30,  29],
      [ 12,  13,  14,  14,  15,  28,  30,  30,  30,  30],
      [ 14,  13,  14,  14,  17,  27,  31,  30, null,  30],
      [ 14,  14,  13,  14,  16,  27,  29,  29,  30,  30]
    ]
  },
  gradient: {
    label: 'Global trend',
    blurb: 'Non-stationary field — values rise from NW to SE, so γ(h) climbs without ever reaching a sill.',
    grid: [
      [ 12,  14,  14,  15,  17,  19,  19,  20,  21,  23],
      [ 14,  14,  15,  18,  18,  19,  21,  22,  23,  25],
      [ 14,  16,  18,  18,  20, null,  21,  23,  25,  26],
      [ 16,  18,  18,  20,  21,  21,  24,  24,  26,  28],
      [ 17,  19,  20,  19,  22,  24,  25,  26,  28,  27],
      [ 19,  19,  21,  22,  24,  25,  26, null,  28,  30],
      [ 20,  21,  22,  24,  25,  25,  28,  28,  30,  32],
      [ 21,  23,  24,  25,  26,  28,  28,  29,  31,  33],
      [ 23,  24, null,  27,  28,  29,  30,  32,  33,  34],
      [ 24,  25,  27,  28,  30,  31,  32,  33,  35,  36]
    ]
  },
  outliers: {
    label: 'Outliers',
    blurb: 'Uniform background with two extreme values — γ(h) is inflated at every lag that touches an outlier.',
    grid: [
      [ 25,  24,  26,  25,  24,  26,  25,  24,  26,  25],
      [ 24,  26,  25,  24,  26,  25,  24,  26,  25,  24],
      [ 26,  25,  24,  26,  25, null,  26,  25,  24,  26],
      [ 25,  24,  26,  25,  24,  26,  25,  24,  26,  25],
      [ 24,  26,  25,  24,   3,  24,  26,  25,  24,  26],
      [ 26,  25,  24,  26,  25,  24,  26, null,  24,  26],
      [ 25,  24,  26,  25,  24,  26,  25,  24,  26,  25],
      [ 24,  26,  25,  24,  26,  25,  24,  50,  25,  24],
      [ 26,  25, null,  25,  24,  26,  25,  24,  26,  25],
      [ 25,  24,  26,  26,  25,  24,  26,  25,  24,  26]
    ]
  }
};

// ------------------------------------------------------------------
// PURE HELPERS — semivariogram math
//
//   gamma(h) = 1 / (2 * N(h)) * sum_{pairs at exact distance h} (z_i - z_j)^2
//
// Pairs are grouped by their EXACT Euclidean distance, so h = 1 (direct
// horizontal/vertical neighbours) is distinct from h = sqrt(2) ≈ 1.41
// (diagonal neighbours). This is the correct treatment on a regular grid.
// Unknown (null) cells are excluded entirely.
//
// Far lags (h > MAX_LAG_10X10) are dropped from the visible empirical
// semivariogram because they have few pairs and become dominated by
// sampling noise / edge effects — the textbook rule of thumb is to
// limit empirical γ(h) to about half the maximum extent of the data.
// ------------------------------------------------------------------
const MAX_LAG_10X10 = 5.0; // half-extent of the 10×10 grid

function computePairs(grid, opts = {}) {
  // Back-compat: a bare `true`/`false` was the old `allDirections` boolean.
  // The in-browser tests (T1–T4) still pass booleans to exercise this path.
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
        dr, dc  // signed deltas; reserved for directional overlays
      });
    }
  }
  return pairs;
}

function computeSemivariogram(pairs, maxLag) {
  const groups = new Map();
  for (const p of pairs) {
    if (maxLag !== undefined && p.dist > maxLag + 1e-9) continue;
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
  const eps = 1e-6; // guard: prevents 1/0 if target coincides with a known cell
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

// ------------------------------------------------------------------
// Inline self-tests — assertions run once on page load and report to
// the browser console. A failure prints in red so it cannot be missed.
// ------------------------------------------------------------------
(function runTests() {
  const eq = (a, b, msg) => {
    if (Math.abs(a - b) > 1e-9) console.error('FAIL:', msg, 'got', a, 'want', b);
    else console.log('ok  ', msg);
  };

  // Test 1: 2x2 all directions — h=1 (cardinal) is SEPARATE from h=sqrt(2) (diagonal).
  //   pairs at h=1:    (1,2)sq=1, (1,3)sq=4, (2,4)sq=4, (3,4)sq=1   sumSq=10, N=4, γ=10/8=1.25
  //   pairs at h=√2:   (1,4)sq=9, (2,3)sq=1                          sumSq=10, N=2, γ=10/4=2.5
  {
    const grid = [[1, 2], [3, 4]];
    const lags = computeSemivariogram(computePairs(grid, true));
    eq(lags.length, 2, 'T1: two distinct lags');
    eq(lags[0].n, 4, 'T1: N(h=1) = 4');
    eq(lags[0].gamma, 1.25, 'T1: gamma(h=1) = 1.25');
    eq(lags[1].n, 2, 'T1: N(h=√2) = 2');
    eq(lags[1].gamma, 2.5, 'T1: gamma(h=√2) = 2.5');
  }

  // Test 2: 2x2 cardinal — diagonal pair excluded entirely.
  {
    const grid = [[1, 2], [3, 4]];
    const lags = computeSemivariogram(computePairs(grid, false));
    eq(lags.length, 1, 'T2: cardinal — only h=1');
    eq(lags[0].n, 4, 'T2: N(h=1) = 4');
    eq(lags[0].gamma, 1.25, 'T2: gamma(h=1) = 1.25');
  }

  // Test 3: unknown cells excluded.
  //   grid: [[1, null], [3, 4]]  known: 1, 3, 4
  //   pairs (all dir): (1,3) h=1 sq=4, (3,4) h=1 sq=1, (1,4) h=√2 sq=9
  {
    const grid = [[1, null], [3, 4]];
    const lags = computeSemivariogram(computePairs(grid, true));
    eq(lags[0].n, 2, 'T3: N(h=1) = 2 (unknown excluded)');
    eq(lags[0].sumSq, 4 + 1, 'T3: sumSq(h=1) = 5');
    eq(lags[1].n, 1, 'T3: N(h=√2) = 1');
    eq(lags[1].sumSq, 9, 'T3: sumSq(h=√2) = 9');
  }

  // Test 4: MAX_LAG_10X10 filter drops far pairs from the visible semivariogram.
  //   grid 1×6: distances available are 1,2,3,4,5. With maxLag=3 we keep h≤3.
  {
    const grid = [[1, 2, 3, 4, 5, 6]];
    const lags = computeSemivariogram(computePairs(grid, false), 3);
    eq(lags.length, 3, 'T4: lags capped at h=3');
    eq(lags[0].h, 1, 'T4: first kept h=1');
    eq(lags[lags.length - 1].h, 3, 'T4: last kept h=3');
    // Also verify opts.maxLag pre-filters at the computePairs level.
    const pairsCapped = computePairs(grid, { cardinalOnly: true, maxLag: 3 });
    const pairsAll = computePairs(grid, { cardinalOnly: true });
    eq(pairsAll.length > pairsCapped.length ? 1 : 0, 1, 'T4: opts.maxLag pre-filters in computePairs');
    eq(pairsCapped.every(p => p.dist <= 3 + 1e-9) ? 1 : 0, 1, 'T4: opts.maxLag drops every pair above the cap');
  }

  // Test 5: 3×3 fixed grid, cardinal-only — matches the lecture-slide hand calc.
  //   h = 1: 12 pairs; sumSq = 52; γ(1) = 52/24
  //   h = 2: 6 pairs;  sumSq = 100; γ(2) = 100/12
  {
    const grid = DATASET_3X3.grid;
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
    eq(exp, 2.5, 'T6: exponential reaches c0+c1 above range');
    eq(gau, 2.5, 'T6: gaussian reaches c0+c1 above range');
  }

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
    // Saturation: target far from all knowns — u should clamp to 1.
    const farKnowns = [
      { r: 9, c: 9, v: 50 },
      { r: 8, c: 9, v: 50 },
      { r: 9, c: 8, v: 50 }
    ];
    const outFar = predictionWeights({ r: 0, c: 0 }, farKnowns, 3);
    eq(outFar.u, 1, 'T7: uncertainty saturates to 1 when meanD >= maxLag');
  }

  console.log('%c[semivariogram tests done]', 'color:#1d4ed8;font-weight:bold');
})();

// ------------------------------------------------------------------
// GridView — SVG render of the sample grid with optional pair-line
// overlay and hover-driven focus filtering.
// ------------------------------------------------------------------
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
  onTargetClick = null    // optional (cell) => void
}) {
  const [editing, setEditing] = useState(null); // { r, c, raw }
  const editingRef = React.useRef(null);
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
    if (editingRef.current === null) return; // already committed or cancelled
    editingRef.current = null;
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
    const next = { r, c, raw: v === null || v === undefined ? '' : String(v) };
    editingRef.current = next;
    setEditing(next);
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
                    onBlur={(e) => commitEdit(r, c, e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitEdit(r, c, editing.raw); }
                      else if (e.key === 'Escape') {
                        e.preventDefault();
                        editingRef.current = null;
                        setEditing(null);
                      }
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

// ------------------------------------------------------------------
// SemivariogramPlot — SVG plot with axes, points, optional model.
// ------------------------------------------------------------------
function SemivariogramPlot({ lags, selectedIdx, revealedCount, modelName = 'none', width = 540, height = 340, showPoints = true }) {
  const margin = { top: 22, right: 28, bottom: 56, left: 68 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const visibleLags = lags.slice(0, revealedCount);

  // Use the full lag set for axis domains so axes stay stable across reveals
  const maxH = Math.max(...lags.map(l => l.h), 1);
  const maxG = Math.max(...lags.map(l => l.gamma), 1);
  const xScale = (h) => margin.left + (h / (maxH * 1.05)) * innerW;
  const yScale = (g) => margin.top + innerH - (g / (maxG * 1.1)) * innerH;

  const xTicks = [];
  for (let t = 0; t <= Math.ceil(maxH * 1.05); t++) xTicks.push(t);
  const yStep = niceStep(maxG * 1.1, 5);
  const yTicks = [];
  for (let t = 0; t <= maxG * 1.1 + 1e-6; t += yStep) yTicks.push(t);

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
            y1={margin.top + innerH} y2={margin.top + innerH + 6} />
          <text className="axis-text"
            x={xScale(t)} y={margin.top + innerH + 22}
            textAnchor="middle">{t}</text>
        </g>
      ))}
      {yTicks.map((t, i) => (
        <g key={`ty-${i}`}>
          <line className="axis-tick"
            x1={margin.left - 6} x2={margin.left}
            y1={yScale(t)} y2={yScale(t)} />
          <text className="axis-text"
            x={margin.left - 10} y={yScale(t)}
            textAnchor="end" dominantBaseline="central">
            {t.toFixed(t < 10 ? 1 : 0)}
          </text>
        </g>
      ))}

      <text className="axis-label"
        x={margin.left + innerW / 2}
        y={height - 12}
        textAnchor="middle">lag distance h</text>
      <text className="axis-label"
        x={-margin.top - innerH / 2}
        y={20}
        transform="rotate(-90)"
        textAnchor="middle">semivariance γ(h)</text>

      {showPoints && visibleLags.length > 1 && (
        <path className="plot-connector"
          d={visibleLags
            .map((l, i) => `${i === 0 ? 'M' : 'L'} ${xScale(l.h)} ${yScale(l.gamma)}`)
            .join(' ')} />
      )}

      {modelPath && model && (() => {
        /* IIFE: local consts for guide coordinates */
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
            <text className="model-guide-label"
              x={xLeft + 6}
              y={Math.min(yNugget + 18, yBottom - 6)}>
              nugget c₀ = {model.c0.toFixed(2)}
            </text>
            <line className="model-guide" x1={xLeft} x2={xRight} y1={ySill} y2={ySill} />
            <text className="model-guide-label" x={xRight - 6} y={ySill - 4} textAnchor="end">
              sill c₀+c₁ = {model.sill.toFixed(2)}
            </text>
            <line className="model-guide" x1={xRange} x2={xRange} y1={yTop} y2={yBottom} />
            <text className="model-guide-label"
              x={xRange > xRight - 90 ? xRange - 4 : xRange + 4}
              y={yBottom - 6}
              textAnchor={xRange > xRight - 90 ? 'end' : 'start'}>
              range a = {model.a.toFixed(2)}
            </text>
            <path className="model-curve" d={modelPath} />
            <text className="model-label"
              x={xScale(maxH * 0.98)}
              y={Math.max(ySill - 22, yTop + 4)}
              textAnchor="end">
              {model.name}
            </text>
          </g>
        );
      })()}

      {showPoints && visibleLags.map((l, i) => {
        const selected = i === selectedIdx;
        return (
          <g key={`pt-${i}`}>
            {selected && (
              <circle className="plot-point-ring"
                cx={xScale(l.h)} cy={yScale(l.gamma)} r={13} />
            )}
            <circle className={`plot-point ${selected ? 'selected' : ''}`}
              cx={xScale(l.h)} cy={yScale(l.gamma)} r={selected ? 7 : 5} />
            {selected && (
              <text className="selected-value-label"
                x={xScale(l.h)} y={yScale(l.gamma) - 16}
                textAnchor="middle">
                γ = {l.gamma.toFixed(2)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
