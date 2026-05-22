# Why-Distance App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a new sibling app `why_distance.html`, launched from slide 5 of the teaching deck, that lets students translate and rotate a fixed-length ruler over four synthetic fields (barrier, geological boundary, gradient, anisotropy) to viscerally see that "same distance, different value difference."

**Architecture:** Single-file plain HTML mirroring `three.html`/`ten.html` — React via Babel CDN, SVG rendering, no build step. The field is a 20×20 grid of colored cells driven by a closed-form `value(x, y)` per scenario; the ruler is an SVG line with three drag handles. Slide 5 of `index.html` is converted to the side-by-side launch-button pattern used by slides 12/13.

**Tech Stack:** HTML5, React 18 + Babel Standalone (UMD CDN), SVG, the existing `lib/theme.css` palette, Playwright (`verify.py`) for the smoke test.

---

## File Structure

- **Create:** `why_distance.html` (root) — the new app.
- **Modify:** `index.html` — convert slide 5 to side-by-side layout; add launch button.
- **Modify:** `verify.py` — add `check_why_distance`; extend `check_deck` with a slide-5 link assertion.
- **Untouched:** `lib/semivariogram.js`, `three.html`, `ten.html`, `lib/theme.css` (palette is reused via existing CSS variables).

---

## Task 1: Scaffold `why_distance.html`

Create the file shell with CDN loaders, theme integration, and an empty `WhyDistanceApp` rendering a placeholder. Goal: the page loads in a browser with no console errors and shows the app title.

**Files:**
- Create: `why_distance.html`

- [ ] **Step 1: Create the file with the shell**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Why distance is not enough — Explorer</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="lib/theme.css">
<style>
  .app { max-width: 1200px; margin: 0 auto; padding: 32px; }
  h1.title {
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 40px;
    margin: 0 0 8px 0;
    letter-spacing: -0.02em;
  }
  h1.title em { font-style: italic; color: var(--accent); }
  .subtitle { color: var(--ink-soft); font-size: 18px; margin: 0 0 24px 0; }

  /* Scenario tabs */
  .tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .tab-btn {
    font-family: 'Inter', sans-serif;
    font-size: 17px;
    font-weight: 500;
    background: var(--paper);
    color: var(--ink-soft);
    border: 1px solid var(--rule);
    padding: 10px 18px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .tab-btn:hover { border-color: var(--accent); }
  .tab-btn.active {
    background: var(--accent);
    color: var(--paper);
    border-color: var(--accent);
  }

  /* Two-column layout: field on the left, readout on the right */
  .work-area {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 32px;
    align-items: start;
  }

  .field-frame {
    background: var(--paper-soft);
    border: 1px solid var(--rule);
    padding: 12px;
    display: inline-block;
    border-radius: 4px;
  }
  .field-svg { display: block; touch-action: none; }
  .cell-rect { stroke: var(--rule-soft); stroke-width: 0.5; }
  .ruler-line {
    stroke: var(--ink);
    stroke-width: 3;
    pointer-events: none;
  }
  .handle {
    fill: var(--paper);
    stroke: var(--ink);
    stroke-width: 2;
    cursor: grab;
  }
  .handle.midpoint { fill: var(--accent); stroke: var(--accent-deep); cursor: move; }
  .handle:active { cursor: grabbing; }

  /* Readout */
  .readout {
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: 4px;
    padding: 18px 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
  }
  .readout-row { display: flex; justify-content: space-between; padding: 6px 0; }
  .readout-row.emphasis {
    border-top: 1px solid var(--rule);
    border-bottom: 1px solid var(--rule);
    margin: 6px 0;
    font-weight: 600;
    color: var(--accent-deep);
    font-size: 18px;
  }
  .readout-row.muted { color: var(--ink-mute); }
  .readout-label { color: var(--ink-soft); }

  /* Explanation */
  .explain {
    margin-top: 18px;
    background: var(--paper);
    border: 1px solid var(--rule);
    border-radius: 4px;
    padding: 16px 20px;
  }
  .explain-toggle {
    background: none;
    border: none;
    color: var(--accent);
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .explain-text {
    margin-top: 10px;
    font-family: 'Inter', sans-serif;
    color: var(--ink-soft);
    line-height: 1.55;
  }
</style>
</head>
<body>
<div id="root"></div>

<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" data-presets="env,react">
const { useState, useMemo, useCallback, useRef } = React;

// ----- SCENARIOS placeholder (filled in Task 2) -----
const SCENARIOS = {};

// ----- Ruler geometry placeholder (filled in Task 3) -----

// ----- self-tests placeholder (filled in Task 3) -----

function WhyDistanceApp() {
  return (
    <div className="app">
      <h1 className="title">Why distance is <em>not</em> enough</h1>
      <p className="subtitle">Drag the ruler. Same length — different difference.</p>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<WhyDistanceApp />);
</script>
</body>
</html>
```

- [ ] **Step 2: Open the file in a browser and confirm**

Run (Windows PowerShell):
```powershell
start why_distance.html
```
Expected: page shows the title "Why distance is not enough" and the subtitle. No console errors in the browser DevTools.

- [ ] **Step 3: Commit**

```powershell
git add why_distance.html
git commit -m "why_distance.html: scaffold app shell with React + theme.css"
```

---

## Task 2: Add `SCENARIOS` table with four field functions

Define the four scenarios as pure-data entries. Each carries a `value(x, y)` function (operating on normalized 0..1 coords), a display label, a distance label (cosmetic), an `explanation` sentence, a `showAngle` flag, and a `colorRamp(t)` that maps a 0..1 value to a hex color string. Also define a `ramp(t, c1, c2)` linear-interpolation helper.

**Files:**
- Modify: `why_distance.html` (replace the `SCENARIOS = {}` placeholder block)

- [ ] **Step 1: Replace the SCENARIOS placeholder block**

Locate the line `const SCENARIOS = {};` in the script and replace that line and the line above it (`// ----- SCENARIOS placeholder (filled in Task 2) -----`) with:

```js
// ----- Color ramp helper -----
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}
function ramp(t, c1, c2) {
  const tt = Math.max(0, Math.min(1, t));
  const a = hexToRgb(c1), b = hexToRgb(c2);
  const r = Math.round(a.r + (b.r - a.r) * tt);
  const g = Math.round(a.g + (b.g - a.g) * tt);
  const bl = Math.round(a.b + (b.b - a.b) * tt);
  return `rgb(${r},${g},${bl})`;
}

// ----- SCENARIOS -----
// All value() functions take x, y in [0, 1] and return a numeric value.
// valueMin/valueMax are used to normalize values into [0, 1] for the color ramp.
const SCENARIOS = {
  barrier: {
    id: 'barrier',
    label: 'Barrier',
    distanceLabel: '2 km',
    showAngle: false,
    explanation: "A physical barrier (ridge, river) breaks spatial continuity — neighbours that look close on a map are effectively far apart.",
    value: (x, y) => {
      const base = y > x ? 60 : 20;
      const ripple = 1.5 * Math.sin(6 * Math.PI * x) * Math.cos(6 * Math.PI * y);
      return base + ripple;
    },
    valueMin: 16, valueMax: 64,
    colorRamp: (t) => ramp(t, '#dbeafe', '#1e3a8a'),
  },
  boundary: {
    id: 'boundary',
    label: 'Geological boundary',
    distanceLabel: '500 m',
    showAngle: false,
    explanation: "Across a geological boundary the underlying population changes (e.g. sandstone vs shale) — distance alone no longer predicts similarity.",
    value: (x, y) => {
      const boundary = 0.5 + 0.2 * Math.sin(2 * Math.PI * x);
      const base = y > boundary ? 500 : 120;
      const ripple = 8 * Math.sin(5 * Math.PI * x) * Math.cos(5 * Math.PI * y);
      return base + ripple;
    },
    valueMin: 108, valueMax: 512,
    colorRamp: (t) => ramp(t, '#fef3c7', '#7c2d12'),
  },
  gradient: {
    id: 'gradient',
    label: 'Gradient',
    distanceLabel: '1 km',
    showAngle: true,
    explanation: "When values change steadily across the landscape, two points the same distance apart can differ a lot or a little depending on the direction of the line connecting them.",
    value: (x, y) => 15 + 30 * x + 0.8 * Math.sin(5 * Math.PI * y),
    valueMin: 14, valueMax: 46,
    colorRamp: (t) => ramp(t, '#dcfce7', '#14532d'),
  },
  anisotropy: {
    id: 'anisotropy',
    label: 'Anisotropy',
    distanceLabel: '1 km',
    showAngle: true,
    explanation: "Spatial dependence can be stronger in one direction than another — orientation matters as much as distance.",
    value: (x, y) => 45 + 12 * Math.sin(2 * Math.PI * x) + 15 * Math.sin(8 * Math.PI * y),
    valueMin: 18, valueMax: 72,
    colorRamp: (t) => ramp(t, '#fce7f3', '#831843'),
  },
};
const SCENARIO_ORDER = ['barrier', 'boundary', 'gradient', 'anisotropy'];
```

- [ ] **Step 2: Reload `why_distance.html` and check console**

Expected: page still renders the placeholder title; no syntax or runtime errors. (You'll see scenarios on screen in Task 4.)

- [ ] **Step 3: Commit**

```powershell
git add why_distance.html
git commit -m "why_distance.html: define four scenarios with value(x,y) and color ramps"
```

---

## Task 3: Ruler geometry helpers and in-browser self-tests

Add the geometry helpers (`endpoints`, `clampRuler`, `rotateTowards`) and a `runTests()` IIFE that asserts: each scenario produces a "big diff" placement and a "small diff" placement; ruler length is preserved under translate and rotate; clamping keeps endpoints in `[0, 1]`. Emits `[why-distance tests done]` banner.

**Files:**
- Modify: `why_distance.html` (replace ruler geometry + self-tests placeholders)

- [ ] **Step 1: Replace the ruler geometry placeholder block**

Locate the line `// ----- Ruler geometry placeholder (filled in Task 3) -----` and replace it (and any blank line immediately under) with:

```js
// ----- Ruler geometry -----
// All ruler state lives in normalized [0, 1] field coordinates.
// The ruler is the segment from (cx - dx, cy - dy) to (cx + dx, cy + dy)
// where (dx, dy) = (L/2 * cos(angle), L/2 * sin(angle)).
const RULER_LEN = 0.35;  // fraction of field side; constant across scenarios

function endpoints(ruler) {
  const dx = (RULER_LEN / 2) * Math.cos(ruler.angle);
  const dy = (RULER_LEN / 2) * Math.sin(ruler.angle);
  return {
    a: { x: ruler.cx - dx, y: ruler.cy - dy },
    b: { x: ruler.cx + dx, y: ruler.cy + dy },
  };
}

function clampRuler(ruler) {
  const halfLenX = Math.abs((RULER_LEN / 2) * Math.cos(ruler.angle));
  const halfLenY = Math.abs((RULER_LEN / 2) * Math.sin(ruler.angle));
  const cx = Math.min(Math.max(ruler.cx, halfLenX), 1 - halfLenX);
  const cy = Math.min(Math.max(ruler.cy, halfLenY), 1 - halfLenY);
  return { cx, cy, angle: ruler.angle };
}

function rotateTowards(ruler, target) {
  const angle = Math.atan2(target.y - ruler.cy, target.x - ruler.cx);
  return clampRuler({ ...ruler, angle });
}

function distanceBetween(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function diffAt(scenario, ruler) {
  const { a, b } = endpoints(ruler);
  return Math.abs(scenario.value(a.x, a.y) - scenario.value(b.x, b.y));
}
```

- [ ] **Step 2: Replace the self-tests placeholder block**

Locate `// ----- self-tests placeholder (filled in Task 3) -----` and replace it with:

```js
// ----- Self-tests (run on first load) -----
(function runTests() {
  function near(a, b, tol, msg) {
    if (Math.abs(a - b) > tol) console.error('FAIL:', msg, 'got', a, 'want', b);
    else console.log('ok  ', msg);
  }
  function gt(a, b, msg) {
    if (!(a > b)) console.error('FAIL:', msg, 'got', a, 'want >', b);
    else console.log('ok  ', msg);
  }
  function lt(a, b, msg) {
    if (!(a < b)) console.error('FAIL:', msg, 'got', a, 'want <', b);
    else console.log('ok  ', msg);
  }

  // T1: ruler length is preserved under translate
  const r1 = { cx: 0.5, cy: 0.5, angle: 0.3 };
  const e1 = endpoints(r1);
  near(distanceBetween(e1.a, e1.b), RULER_LEN, 1e-9, 'T1 ruler length under translate');

  // T2: ruler length is preserved under rotate
  const r2 = rotateTowards(r1, { x: 0.7, y: 0.9 });
  const e2 = endpoints(r2);
  near(distanceBetween(e2.a, e2.b), RULER_LEN, 1e-9, 'T2 ruler length under rotate');

  // T3: clamp keeps both endpoints in [0, 1] for an extreme target
  const r3 = clampRuler({ cx: 1.5, cy: -0.2, angle: 0 });
  const e3 = endpoints(r3);
  if (e3.a.x < -1e-9 || e3.b.x > 1 + 1e-9 || e3.a.y < -1e-9 || e3.b.y > 1 + 1e-9) {
    console.error('FAIL: T3 clamp endpoints in [0,1]', e3);
  } else console.log('ok   T3 clamp endpoints in [0,1]');

  // T4–T7: per-scenario big-diff and small-diff placements
  // BARRIER: ridge along y = x. Pair straddling the ridge → big; pair on same side → small.
  const barrier = SCENARIOS.barrier;
  const barBig = { cx: 0.5, cy: 0.5, angle: Math.PI / 2 };       // vertical, crosses y=x
  const barSmall = { cx: 0.2, cy: 0.7, angle: Math.PI / 2 };     // vertical, both above ridge
  gt(diffAt(barrier, barBig), 30, 'T4 barrier big-diff');
  lt(diffAt(barrier, barSmall), 10, 'T4 barrier small-diff');

  // BOUNDARY: curved split near y = 0.5. Pair straddling → big; pair on same side → small.
  const boundary = SCENARIOS.boundary;
  const bndBig = { cx: 0.5, cy: 0.5, angle: Math.PI / 2 };
  const bndSmall = { cx: 0.5, cy: 0.85, angle: 0 };
  gt(diffAt(boundary, bndBig), 200, 'T5 boundary big-diff');
  lt(diffAt(boundary, bndSmall), 80, 'T5 boundary small-diff');

  // GRADIENT: along-x ramp. Horizontal pair → big; vertical pair → small.
  const gradient = SCENARIOS.gradient;
  const grdBig = { cx: 0.5, cy: 0.5, angle: 0 };
  const grdSmall = { cx: 0.5, cy: 0.5, angle: Math.PI / 2 };
  gt(diffAt(gradient, grdBig), 8, 'T6 gradient big-diff (horizontal)');
  lt(diffAt(gradient, grdSmall), 4, 'T6 gradient small-diff (vertical)');

  // ANISOTROPY: fast variation along y, slow along x. Vertical pair → big; horizontal → small.
  const aniso = SCENARIOS.anisotropy;
  const anBig = { cx: 0.5, cy: 0.5, angle: Math.PI / 2 };
  const anSmall = { cx: 0.5, cy: 0.5, angle: 0 };
  gt(diffAt(aniso, anBig), 15, 'T7 anisotropy big-diff (vertical)');
  lt(diffAt(aniso, anSmall), 10, 'T7 anisotropy small-diff (horizontal)');

  console.log('%c[why-distance tests done]', 'color:#1d4ed8;font-weight:bold');
})();
```

- [ ] **Step 3: Reload and inspect the console**

Open `why_distance.html` in the browser, open DevTools, reload. Expected console output:
- Several `ok …` lines.
- No `FAIL:` lines.
- A bold blue `[why-distance tests done]` banner at the end.

If any `FAIL:` appears, the field function for that scenario doesn't reliably produce a big/small diff at the placements above — adjust the placement coords *first* (the placements in the test exist to confirm the lesson is physically observable for the student), and only adjust the field function if no reasonable placement can produce the required spread.

- [ ] **Step 4: Commit**

```powershell
git add why_distance.html
git commit -m "why_distance.html: add ruler geometry helpers and in-browser self-tests"
```

---

## Task 4: Render the field grid (`FieldCanvas` component, no ruler yet)

Add a React component that draws a 20×20 grid of SVG `<rect>` cells, fill-colored by sampling `scenario.value(x, y)` at each cell centre and mapping through `scenario.colorRamp`. Wire it into `WhyDistanceApp` with hard-coded `scenario = SCENARIOS.barrier` (scenario tabs come in Task 7).

**Files:**
- Modify: `why_distance.html`

- [ ] **Step 1: Add the `FieldCanvas` component above `WhyDistanceApp`**

Insert this block immediately above `function WhyDistanceApp() {`:

```jsx
const FIELD_PX = 520;       // pixel size of the field SVG (width and height)
const GRID_N = 20;          // cells per side

function FieldCanvas({ scenario }) {
  const cells = useMemo(() => {
    const out = [];
    const cell = FIELD_PX / GRID_N;
    for (let r = 0; r < GRID_N; r++) {
      for (let c = 0; c < GRID_N; c++) {
        const x = (c + 0.5) / GRID_N;
        const y = (r + 0.5) / GRID_N;
        const v = scenario.value(x, y);
        const t = (v - scenario.valueMin) / (scenario.valueMax - scenario.valueMin);
        out.push({
          key: `${r}-${c}`,
          x: c * cell, y: r * cell, w: cell, h: cell,
          fill: scenario.colorRamp(t),
        });
      }
    }
    return out;
  }, [scenario]);

  return (
    <div className="field-frame">
      <svg className="field-svg" width={FIELD_PX} height={FIELD_PX}
           viewBox={`0 0 ${FIELD_PX} ${FIELD_PX}`}>
        <g>
          {cells.map(c => (
            <rect className="cell-rect"
                  key={c.key} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} />
          ))}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Update `WhyDistanceApp` to render the field**

Replace the body of `WhyDistanceApp` with:

```jsx
function WhyDistanceApp() {
  const scenario = SCENARIOS.barrier;
  return (
    <div className="app">
      <h1 className="title">Why distance is <em>not</em> enough</h1>
      <p className="subtitle">Drag the ruler. Same length — different difference.</p>
      <div className="work-area">
        <FieldCanvas scenario={scenario} />
        <div /> {/* readout placeholder, Task 7 */}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Reload and visually confirm**

Expected: a 520×520 colored grid using the blue ramp, with a visible ridge along the diagonal (one triangular half darker than the other). Cycle through scenarios manually by editing the `SCENARIOS.barrier` reference to `SCENARIOS.boundary`, `SCENARIOS.gradient`, `SCENARIOS.anisotropy` and reloading — each should look distinct. Restore to `SCENARIOS.barrier` before committing.

- [ ] **Step 4: Commit**

```powershell
git add why_distance.html
git commit -m "why_distance.html: render field as 20x20 color grid"
```

---

## Task 5: Add the ruler overlay (static, not yet draggable)

Render the ruler line + three handles inside the same SVG. State (`cx`, `cy`, `angle`) lives in `WhyDistanceApp` so the readout and tabs can read it later. No drag yet.

**Files:**
- Modify: `why_distance.html`

- [ ] **Step 1: Extend `FieldCanvas` to accept and draw the ruler**

Replace the existing `FieldCanvas` return block with:

```jsx
function FieldCanvas({ scenario, ruler }) {
  const cells = useMemo(() => {
    const out = [];
    const cell = FIELD_PX / GRID_N;
    for (let r = 0; r < GRID_N; r++) {
      for (let c = 0; c < GRID_N; c++) {
        const x = (c + 0.5) / GRID_N;
        const y = (r + 0.5) / GRID_N;
        const v = scenario.value(x, y);
        const t = (v - scenario.valueMin) / (scenario.valueMax - scenario.valueMin);
        out.push({
          key: `${r}-${c}`,
          x: c * cell, y: r * cell, w: cell, h: cell,
          fill: scenario.colorRamp(t),
        });
      }
    }
    return out;
  }, [scenario]);

  const { a, b } = endpoints(ruler);
  const ax = a.x * FIELD_PX, ay = a.y * FIELD_PX;
  const bx = b.x * FIELD_PX, by = b.y * FIELD_PX;
  const mx = ruler.cx * FIELD_PX, my = ruler.cy * FIELD_PX;

  return (
    <div className="field-frame">
      <svg className="field-svg" width={FIELD_PX} height={FIELD_PX}
           viewBox={`0 0 ${FIELD_PX} ${FIELD_PX}`}>
        <g>
          {cells.map(c => (
            <rect className="cell-rect"
                  key={c.key} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} />
          ))}
        </g>
        <line className="ruler-line" x1={ax} y1={ay} x2={bx} y2={by} />
        <circle className="handle" data-handle="a" cx={ax} cy={ay} r={9} />
        <circle className="handle" data-handle="b" cx={bx} cy={by} r={9} />
        <circle className="handle midpoint" data-handle="mid" cx={mx} cy={my} r={11} />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Lift ruler state into `WhyDistanceApp`**

Replace the body of `WhyDistanceApp` with:

```jsx
function WhyDistanceApp() {
  const scenario = SCENARIOS.barrier;
  const [ruler, setRuler] = useState({ cx: 0.5, cy: 0.5, angle: 0 });
  return (
    <div className="app">
      <h1 className="title">Why distance is <em>not</em> enough</h1>
      <p className="subtitle">Drag the ruler. Same length — different difference.</p>
      <div className="work-area">
        <FieldCanvas scenario={scenario} ruler={ruler} />
        <div /> {/* readout placeholder, Task 7 */}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Reload and confirm**

Expected: the same colored field with a horizontal black line through the centre, white-filled endpoint dots, and a blue-filled midpoint dot. No drag interaction yet.

- [ ] **Step 4: Commit**

```powershell
git add why_distance.html
git commit -m "why_distance.html: render static ruler overlay with three handles"
```

---

## Task 6: Wire drag interactions (translate + rotate + clamp)

Attach SVG pointer-event handlers to the three handles. Dragging the midpoint translates; dragging either endpoint rotates around the midpoint. Use `setPointerCapture` so drags continue cleanly when the pointer leaves the handle.

**Files:**
- Modify: `why_distance.html`

- [ ] **Step 1: Replace `FieldCanvas` again to accept an `onRulerChange` callback and wire drag**

Replace the entire `FieldCanvas` function with:

```jsx
function FieldCanvas({ scenario, ruler, onRulerChange }) {
  const svgRef = useRef(null);
  const dragRef = useRef(null);  // 'a' | 'b' | 'mid' | null

  const cells = useMemo(() => {
    const out = [];
    const cell = FIELD_PX / GRID_N;
    for (let r = 0; r < GRID_N; r++) {
      for (let c = 0; c < GRID_N; c++) {
        const x = (c + 0.5) / GRID_N;
        const y = (r + 0.5) / GRID_N;
        const v = scenario.value(x, y);
        const t = (v - scenario.valueMin) / (scenario.valueMax - scenario.valueMin);
        out.push({
          key: `${r}-${c}`,
          x: c * cell, y: r * cell, w: cell, h: cell,
          fill: scenario.colorRamp(t),
        });
      }
    }
    return out;
  }, [scenario]);

  const ptFromEvent = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const onPointerDown = (handle) => (e) => {
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    dragRef.current = handle;
  };
  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const p = ptFromEvent(e);
    if (!p) return;
    if (dragRef.current === 'mid') {
      onRulerChange(clampRuler({ ...ruler, cx: p.x, cy: p.y }));
    } else if (dragRef.current === 'a') {
      // dragging endpoint A → rotate so A points toward p (i.e. angle from mid to p, +π)
      const angle = Math.atan2(ruler.cy - p.y, ruler.cx - p.x);
      onRulerChange(clampRuler({ ...ruler, angle }));
    } else if (dragRef.current === 'b') {
      onRulerChange(rotateTowards(ruler, p));
    }
  };
  const onPointerUp = (e) => {
    if (dragRef.current) {
      try { e.target.releasePointerCapture(e.pointerId); } catch (_) {}
    }
    dragRef.current = null;
  };

  const { a, b } = endpoints(ruler);
  const ax = a.x * FIELD_PX, ay = a.y * FIELD_PX;
  const bx = b.x * FIELD_PX, by = b.y * FIELD_PX;
  const mx = ruler.cx * FIELD_PX, my = ruler.cy * FIELD_PX;

  return (
    <div className="field-frame">
      <svg className="field-svg" ref={svgRef}
           width={FIELD_PX} height={FIELD_PX}
           viewBox={`0 0 ${FIELD_PX} ${FIELD_PX}`}
           onPointerMove={onPointerMove}
           onPointerUp={onPointerUp}
           onPointerCancel={onPointerUp}>
        <g>
          {cells.map(c => (
            <rect className="cell-rect"
                  key={c.key} x={c.x} y={c.y} width={c.w} height={c.h} fill={c.fill} />
          ))}
        </g>
        <line className="ruler-line" x1={ax} y1={ay} x2={bx} y2={by} />
        <circle className="handle" data-handle="a"
                cx={ax} cy={ay} r={9}
                onPointerDown={onPointerDown('a')} />
        <circle className="handle" data-handle="b"
                cx={bx} cy={by} r={9}
                onPointerDown={onPointerDown('b')} />
        <circle className="handle midpoint" data-handle="mid"
                cx={mx} cy={my} r={11}
                onPointerDown={onPointerDown('mid')} />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Pass `onRulerChange` from `WhyDistanceApp`**

Replace `WhyDistanceApp` body with:

```jsx
function WhyDistanceApp() {
  const scenario = SCENARIOS.barrier;
  const [ruler, setRuler] = useState({ cx: 0.5, cy: 0.5, angle: 0 });
  return (
    <div className="app">
      <h1 className="title">Why distance is <em>not</em> enough</h1>
      <p className="subtitle">Drag the ruler. Same length — different difference.</p>
      <div className="work-area">
        <FieldCanvas scenario={scenario} ruler={ruler} onRulerChange={setRuler} />
        <div /> {/* readout placeholder, Task 7 */}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Reload and manually exercise the interactions**

Expected behaviour:
- Drag the blue midpoint dot → the whole ruler slides under the pointer; it cannot leave the field (both endpoints stay inside the colored area).
- Drag either white endpoint dot → the ruler rotates around the midpoint; the midpoint stays put. The opposite endpoint moves to maintain length.
- Releasing the pointer anywhere on the page stops the drag cleanly.

If drag feels jumpy when crossing handles, that's expected — `setPointerCapture` keeps focus on the originally-clicked handle until release.

- [ ] **Step 4: Commit**

```powershell
git add why_distance.html
git commit -m "why_distance.html: wire pointer drag for translate and rotate"
```

---

## Task 7: Scenario tabs, readout panel, explanation panel, full glue

Add the four tab buttons (which swap `scenario` state), the readout panel (values at A and B, |difference|, distance label, optional angle), and the collapsible explanation. Wire everything in `WhyDistanceApp`. The scenario tab also resets the ruler to the centre with `angle: 0`.

**Files:**
- Modify: `why_distance.html`

- [ ] **Step 1: Add `ScenarioTabs`, `ReadoutPanel`, `ExplanationPanel` components**

Insert this block immediately above `function WhyDistanceApp() {`:

```jsx
function ScenarioTabs({ activeId, onChange }) {
  return (
    <div className="tabs">
      {SCENARIO_ORDER.map(id => (
        <button key={id}
                className={`tab-btn ${id === activeId ? 'active' : ''}`}
                onClick={() => onChange(id)}>
          {SCENARIOS[id].label}
        </button>
      ))}
    </div>
  );
}

function ReadoutPanel({ scenario, ruler }) {
  const { a, b } = endpoints(ruler);
  const va = scenario.value(a.x, a.y);
  const vb = scenario.value(b.x, b.y);
  const diff = Math.abs(va - vb);
  const fmt = (n) => n.toFixed(1);
  // Angle: convert atan2 result to a positive 0..180 (line orientation is symmetric)
  const deg = ((ruler.angle * 180 / Math.PI) % 180 + 180) % 180;
  return (
    <div className="readout">
      <div className="readout-row">
        <span className="readout-label">Value at A</span>
        <span>{fmt(va)}</span>
      </div>
      <div className="readout-row">
        <span className="readout-label">Value at B</span>
        <span>{fmt(vb)}</span>
      </div>
      <div className="readout-row emphasis">
        <span>|A − B|</span>
        <span>{fmt(diff)}</span>
      </div>
      <div className="readout-row muted">
        <span className="readout-label">Distance</span>
        <span>{scenario.distanceLabel}</span>
      </div>
      {scenario.showAngle && (
        <div className="readout-row muted">
          <span className="readout-label">Orientation</span>
          <span>{deg.toFixed(0)}°</span>
        </div>
      )}
    </div>
  );
}

function ExplanationPanel({ scenario, open, onToggle }) {
  return (
    <div className="explain">
      <button className="explain-toggle" onClick={onToggle}>
        {open ? '▾' : '▸'} {open ? 'Hide explanation' : 'Reveal explanation'}
      </button>
      {open && <div className="explain-text">{scenario.explanation}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Replace `WhyDistanceApp` with the full version**

```jsx
function WhyDistanceApp() {
  const [scenarioId, setScenarioId] = useState('barrier');
  const [ruler, setRuler] = useState({ cx: 0.5, cy: 0.5, angle: 0 });
  const [explanationOpen, setExplanationOpen] = useState(false);
  const scenario = SCENARIOS[scenarioId];

  const onTabChange = (id) => {
    setScenarioId(id);
    setRuler({ cx: 0.5, cy: 0.5, angle: 0 });
    setExplanationOpen(false);
  };

  return (
    <div className="app">
      <h1 className="title">Why distance is <em>not</em> enough</h1>
      <p className="subtitle">Drag the ruler. Same length — different difference.</p>
      <ScenarioTabs activeId={scenarioId} onChange={onTabChange} />
      <div className="work-area">
        <FieldCanvas scenario={scenario} ruler={ruler} onRulerChange={setRuler} />
        <div>
          <ReadoutPanel scenario={scenario} ruler={ruler} />
          <ExplanationPanel scenario={scenario}
                            open={explanationOpen}
                            onToggle={() => setExplanationOpen(o => !o)} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Reload and verify each scenario end-to-end**

For each of the four tabs, confirm:
- Clicking the tab swaps the field colors and resets the ruler to a horizontal segment through the centre.
- Dragging the midpoint changes both A and B values; |A − B| updates in the readout.
- Dragging an endpoint rotates the ruler; |A − B| updates.
- The "Orientation" row appears only for Gradient and Anisotropy.
- The distance label matches: 2 km / 500 m / 1 km / 1 km.
- "Reveal explanation" reveals the matching sentence; switching tabs collapses it again.

Confirm the self-test banner still appears in the console with no `FAIL:` lines.

- [ ] **Step 4: Commit**

```powershell
git add why_distance.html
git commit -m "why_distance.html: add scenario tabs, readout panel, explanation panel"
```

---

## Task 8: Wire slide 5 in `index.html` (side-by-side + launch button)

Convert slide 5 from full-bleed image to the side-by-side launch pattern used by slides 12 and 13. Keep the existing `slide05_why_not.png` as the visual on the left.

**Files:**
- Modify: `index.html` (slide 5 block, currently lines 261–267)

- [ ] **Step 1: Replace the slide-5 block**

Locate the `<!-- Slide 5: Why Distance Alone Is Not Enough -->` comment and its `<section>` (the existing block centers a single image full-bleed). Replace from `<!-- Slide 5: ` through the closing `</section>` on that slide with:

```html
  <!-- Slide 5: Why Distance Alone Is Not Enough -->
  <section class="slide" id="slide-5">
    <div class="slide-content" style="flex-direction: row; gap: 3rem; align-items: center;">
      <div class="reveal" style="flex: 1.2; display: flex; justify-content: center;">
        <img src="assets/img/slide05_why_not.png" alt="Distance vs. similarity counter-example"
             style="width: 100%; max-height: 80vh; object-fit: contain; border-radius: 8px;">
      </div>
      <div style="flex: 1;">
        <h2 class="slide-heading reveal">Why distance alone is not enough</h2>
        <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 1.2rem;">
          Four scenarios, one lesson: two points the <strong style="color: var(--accent);">same distance apart</strong> can have wildly different values once you account for what is between them.
        </p>
        <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.8rem;">
          Try moving and rotating a fixed-length ruler over each scenario and watch the value difference change.
        </p>
        <div class="reveal" style="margin-top: 1.8rem;">
          <a href="why_distance.html" target="_blank" rel="noopener" class="launch-button">
            Launch why-distance explorer →
          </a>
        </div>
      </div>
    </div>
  </section>
```

- [ ] **Step 2: Reload `index.html` and navigate to slide 5**

Run:
```powershell
start index.html
```
Press `PageDown` four times to reach slide 5. Expected: image on the left, heading + blurb + blue launch button on the right. Clicking the button opens `why_distance.html` in a new tab.

- [ ] **Step 3: Commit**

```powershell
git add index.html
git commit -m "index.html: convert slide 5 to side-by-side with why-distance launch"
```

---

## Task 9: Extend `verify.py` to cover the new app + slide-5 button

Add a `check_why_distance` function, register it in `PAGE_CHECKS`, and append a slide-5 link assertion inside `check_deck`.

**Files:**
- Modify: `verify.py`

- [ ] **Step 1: Add the `check_why_distance` function**

Insert immediately above `def check_deck(page, errors, console):`:

```python
def check_why_distance(page, errors, console):
    """why_distance.html — slide-5 launch app."""
    banner = any("[why-distance tests done]" in t for _, t in console)
    if not banner:
        errors.append("why_distance.html: missing [why-distance tests done] banner")
    if any("FAIL" in t for _, t in console):
        errors.append("why_distance.html: FAIL: lines in console")

    # Four scenario tabs
    tabs = page.locator(".tab-btn")
    if tabs.count() != 4:
        errors.append(f"why_distance.html: expected 4 scenario tabs, got {tabs.count()}")
    # Three drag handles
    handles = page.locator("circle.handle")
    if handles.count() != 3:
        errors.append(f"why_distance.html: expected 3 ruler handles, got {handles.count()}")
    # Field grid (20×20 = 400 cells)
    cells = page.locator("rect.cell-rect")
    if cells.count() != 400:
        errors.append(f"why_distance.html: expected 400 field cells, got {cells.count()}")
    page.screenshot(path=str(ROOT / "verify_why_distance.png"), full_page=True)
    print(f"  why_distance.html: {tabs.count()} tabs, {handles.count()} handles, banner={banner}")
```

- [ ] **Step 2: Register the new check in `PAGE_CHECKS`**

Replace the `PAGE_CHECKS = [...]` list (currently 3 entries) with:

```python
PAGE_CHECKS = [
    ("three.html", check_three),
    ("ten.html", check_ten),
    ("why_distance.html", check_why_distance),
    ("index.html", check_deck),
]
```

- [ ] **Step 3: Add the slide-5 link assertion inside `check_deck`**

Inside `check_deck`, locate the existing `# Slide-13 launch link → three.html` block. Immediately above that block, insert:

```python
    # Slide-5 launch link → why_distance.html
    s5_link = page.locator("#slide-5 a.launch-button").first
    if s5_link.count() == 0:
        errors.append("index.html: slide 5 launch button missing")
    else:
        href = s5_link.get_attribute("href")
        target = s5_link.get_attribute("target")
        if href != "why_distance.html":
            errors.append(f"index.html: slide 5 link href = {href!r}, expected 'why_distance.html'")
        if target != "_blank":
            errors.append(f"index.html: slide 5 link target = {target!r}, expected '_blank'")
```

- [ ] **Step 4: Run `verify.py`**

```powershell
python verify.py
```

Expected output (final line): `verify OK`. Four screenshots written: `verify_three.png`, `verify_ten.png`, `verify_why_distance.png`, `verify_deck.png`. Exit code 0.

If any `FAIL:` appears, read the message carefully: a banner failure usually means a self-test in `why_distance.html` is failing (open the app in a browser and inspect the console); a count mismatch means the DOM structure drifted from what the test expects.

- [ ] **Step 5: Commit**

```powershell
git add verify.py
git commit -m "verify.py: smoke-test why_distance.html and slide-5 launch button"
```

---

## Task 10: Final integration check + CLAUDE.md note

Confirm everything still works end-to-end, then add a one-line breadcrumb to `CLAUDE.md` so future-you knows the new app exists.

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Re-read the spec and confirm coverage**

Open `docs/superpowers/specs/2026-05-22-why-distance-app-design.md`. Walk each section ("Purpose", "User flow", "Architecture", "Field model", "Field rendering", "Ruler", "Readout", "Explanation panel", "Slide 5 integration", "Testing"). For each, confirm there is a corresponding task above that implements it. If a section is unimplemented, add a follow-up task and pause — do not call it done.

- [ ] **Step 2: Update `CLAUDE.md`**

Locate the section titled `## What this is` near the top. Replace its first paragraph (the one starting "A single-page teaching deck…") with:

```markdown
A single-page teaching deck (`index.html`) for Ordinary Kriging — 16 scroll-snap slides
that convert the lecture PowerPoint into a web format — plus three sibling interactive
apps that the deck launches in new tabs:

- `why_distance.html` — four-scenario "ruler" explorer (slide 5)
- `three.html` — 3×3 hand-calculation walkthrough (slide 12)
- `ten.html` — 10×10 explorer with empirical lags and theoretical model fitting (slide 13)
```

Also, in the same file, find the `## Run / verify` section. Locate the existing `verify.py` description that mentions `verify_three.png`, `verify_ten.png`, `verify_deck.png`. Replace that screenshot list and slide-button-count description with:

```markdown
`verify.py` smoke-tests all four pages and writes `verify_three.png`, `verify_ten.png`,
`verify_why_distance.png`, `verify_deck.png` (all gitignored). It checks the apps'
in-browser self-tests emit `[semivariogram tests done]` (three.html, ten.html) and
`[why-distance tests done]` (why_distance.html) with no `FAIL:` lines, verifies the
deck has 16 slides, the three launch buttons (slides 5, 12, 13) and the PDF button
(slide 16) are wired correctly, and the slide-9 click-reveal animation advances 0→6.
```

Note: the existing text in `CLAUDE.md` says "slide-10 click-reveal" — that is already out of date relative to the current `verify.py` which checks `#slide-10` (data exploration). Do not change that sentence beyond what the snippet above specifies. (The Quick Test in the live deck is on slide 9; this is the existing wording's drift and is not in scope for this task.)

- [ ] **Step 3: Run `verify.py` one more time**

```powershell
python verify.py
```

Expected: `verify OK`.

- [ ] **Step 4: Commit**

```powershell
git add CLAUDE.md
git commit -m "CLAUDE.md: document why_distance.html alongside three/ten"
```

- [ ] **Step 5: Show the user the result**

Open each of these in a browser and visually confirm:
- `why_distance.html` — all four tabs work, ruler drags cleanly, readout updates.
- `index.html` → slide 5 — launch button visible, opens the app in a new tab.

Report back: branch `feature/web-slide-deck` now contains the why-distance app, slide 5 wired to it, and `verify.py` passing. Ready for the user to merge into `main` when they're happy (per the publishing flow in `CLAUDE.md`).

---

## Self-Review Notes

- **Spec coverage:** every section of the design spec maps to a task — Purpose/non-goals → no negative tasks needed; User flow → Tasks 6, 7, 8; Architecture/file layout → Task 1; Top-level component shape → Task 7; Field model → Task 2; Field rendering → Task 4; Ruler → Tasks 5, 6; Readout → Task 7; Explanation panel → Task 7; Slide 5 integration → Task 8; In-browser self-tests → Task 3; verify.py extensions → Task 9.
- **No placeholders** in code blocks: every step contains complete code or complete commands.
- **Type/naming consistency** across tasks: `SCENARIOS`, `SCENARIO_ORDER`, `ruler.{cx,cy,angle}`, `endpoints`, `clampRuler`, `rotateTowards`, `RULER_LEN`, `FIELD_PX`, `GRID_N`, `FieldCanvas`, `ScenarioTabs`, `ReadoutPanel`, `ExplanationPanel`, `WhyDistanceApp` — used consistently from definition through final wiring.
- **Out-of-scope drift avoided:** the plan does not touch `lib/semivariogram.js`, `three.html`, `ten.html`, `lib/theme.css`, or any unrelated slide.
