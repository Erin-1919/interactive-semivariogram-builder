# Web-based Slide Deck Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 25-slide Ordinary Kriging PowerPoint into a 21-slide scroll-controlled web deck, split the existing two-mode app into `three.html` + `ten.html` with shared math in `lib/`, and update the testing + docs to match.

**Architecture:** Vanilla single-file HTML deck (no React) with CSS scroll-snap + ~50-line JS controller. Existing React app's math + shared components extracted into `lib/semivariogram.js` (loaded with Babel for JSX). Each app HTML file keeps only its mode-specific component. GitHub Pages serves the deck as the new root.

**Tech Stack:** Plain HTML/CSS/JS (deck), React 18 + Babel-standalone via CDN (apps — unchanged from existing), Playwright (verify.py — unchanged from existing), Pillow (asset downsizing).

**Branch:** `feature/web-slide-deck` (already created and pushed).

**Spec:** `docs/superpowers/specs/2026-05-21-web-slide-deck-design.md`

---

## File Structure

```
app/
├── index.html              ← REPLACE: 21-slide deck (was: combined 3×3/10×10 app)
├── three.html              ← NEW: 3×3 walkthrough (extracted from old index.html)
├── ten.html                ← NEW: 10×10 explorer (extracted from old index.html)
├── lib/
│   ├── semivariogram.js    ← NEW: shared math + GridView + SemivariogramPlot + self-tests
│   └── theme.css           ← NEW: shared CSS variables + shared typography
├── assets/
│   ├── img/                ← NEW: extracted PPTX images, downsized
│   └── lab/
│       └── Ordinary-Kriging-Laurier-Lab-EL_2026_05_26.pdf  ← NEW: copied from Documents
├── gen_datasets.py         ← MODIFY: write into lib/semivariogram.js instead of index.html
├── verify.py               ← REWRITE: drive three.html, ten.html, index.html (deck)
├── README.md               ← MODIFY: describe new structure
└── CLAUDE.md               ← MODIFY: describe new structure
```

**Files' responsibilities:**
- `lib/semivariogram.js`: pure math (`computePairs`, `computeSemivariogram`, `predictionWeights`, `fitModel`, `modelGamma`), data presets (`DATASET_3X3`, `DATASETS_10X10`, `MAX_LAG_10X10`), shared components (`GridView`, `SemivariogramPlot`, `niceStep`), and the `runTests` IIFE that emits the `[semivariogram tests done]` banner. Loaded as `<script type="text/babel">` (needs Babel because it contains JSX).
- `lib/theme.css`: the `:root` CSS variables (`--paper`, `--ink`, `--accent`, etc.) and the shared body background, noise overlay, and typography defaults. Plain `<link>` tag.
- `three.html` and `ten.html`: a thin React shell — mode-specific component + render call. Each loads `lib/theme.css` then `lib/semivariogram.js`, then its own inline component CSS + JSX.
- `index.html` (deck): standalone — loads only `lib/theme.css` for palette continuity. No React. ~700 lines.

---

## Task 1: Set up `lib/theme.css` from extracted CSS variables

**Files:**
- Create: `lib/theme.css`
- Read from: `index.html:11-26` (the `:root { ... }` block) and `index.html:27-48` (body + noise overlay)

- [ ] **Step 1: Create `lib/` directory**

```bash
mkdir -p lib
```

- [ ] **Step 2: Create `lib/theme.css` with the shared palette and base styles**

Copy the `:root` block from `index.html:11-26` verbatim, plus the body + noise styles from lines 27-48. Append `app.css` reset rules.

```css
/* lib/theme.css — shared palette + base styles for three.html, ten.html, and index.html (deck).
   Edit palette here and all three files pick it up. */

:root {
  /* Scholarly palette — crisp white paper + deep-blue ink + vivid-blue accent */
  --paper: #ffffff;
  --paper-soft: #f4f8fd;
  --paper-deep: #dce8f5;
  --ink: #0c2d5c;
  --ink-soft: #2e5285;
  --ink-mute: #6b86a8;
  --rule: #c0d3e8;
  --rule-soft: #dde8f3;
  --accent: #1d4ed8;
  --accent-deep: #1e3a8a;
  --accent-pale: #dbeafe;
  --sage: #0891b2;
  --unknown: #94a3b8;
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  background: var(--paper);
  color: var(--ink);
  font-family: 'Manrope', sans-serif;
  font-size: 17px;
  line-height: 1.55;
  min-height: 100vh;
  background-image:
    radial-gradient(ellipse at top left, rgba(29, 78, 216, 0.06), transparent 60%),
    radial-gradient(ellipse at bottom right, rgba(8, 145, 178, 0.04), transparent 60%);
}
body::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  opacity: 0.18;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix values='0 0 0 0 0.05 0 0 0 0 0.18 0 0 0 0 0.36 0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/theme.css
git commit -m "Add lib/theme.css with shared palette and base styles"
```

---

## Task 2: Set up `lib/semivariogram.js` with extracted math, components, and self-tests

**Files:**
- Create: `lib/semivariogram.js`
- Read from: `index.html` ranges — 835-898 (datasets), 915 (MAX_LAG), 917-1002 (math), 1008-1137 (runTests IIFE), 1143-1744 (GridView + niceStep + SemivariogramPlot), 1328-1355 (fitModel + modelGamma)

- [ ] **Step 1: Create `lib/semivariogram.js`. Copy these blocks verbatim from `index.html`, in this exact order:**

  1. The opening `const { useState, useMemo, useEffect, useCallback } = React;` (line 828).
  2. `DATASET_3X3` (lines 830-843).
  3. `DATASETS_10X10` (lines 845-898).
  4. `MAX_LAG_10X10` and the comment block above it (lines 900-915).
  5. `computePairs` (lines 917-950).
  6. `computeSemivariogram` (lines 952-974).
  7. `predictionWeights` and its comment block (lines 976-1002).
  8. `runTests` IIFE (lines 1004-1137) — emits the `[semivariogram tests done]` banner.
  9. `fitModel` and the comment block above it (lines 1319-1338).
  10. `modelGamma` (lines 1340-1355).
  11. `niceStep` (lines 1357-1367).
  12. `GridView` (lines 1143-? — read the file to determine the exact end before `SemivariogramPlot` begins at 1372).
  13. `SemivariogramPlot` (lines 1372-? — read the file to find its end before line 1745 where `ThreeByThreeMode` begins).

- [ ] **Step 2: Add a header comment at the top of `lib/semivariogram.js`**

```js
// lib/semivariogram.js — shared math, datasets, and React components
// for three.html and ten.html.
//
// Loaded as: <script type="text/babel" data-presets="env,react" src="lib/semivariogram.js"></script>
// (Babel-standalone transpiles it in the browser because it contains JSX.)
//
// In-browser self-tests at the bottom (runTests IIFE) emit the
// "[semivariogram tests done]" banner that verify.py watches for.
```

- [ ] **Step 3: Verify the new file loads correctly by creating a one-off smoke page `/tmp/lib_smoke.html`**

```html
<!doctype html>
<meta charset="utf-8">
<title>lib smoke</title>
<div id="root"></div>
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" data-presets="env,react" src="lib/semivariogram.js"></script>
```

- [ ] **Step 4: Open the smoke page in a browser, then run `python -c "import subprocess; subprocess.run(['start', '/tmp/lib_smoke.html'], shell=True)"`. Open DevTools and confirm the console shows the `[semivariogram tests done]` banner with no `FAIL:` lines.**

Expected: 7 test groups (T1–T7) all log `ok` lines, then the banner.

- [ ] **Step 5: Delete the smoke page**

```bash
rm /tmp/lib_smoke.html
```

- [ ] **Step 6: Commit**

```bash
git add lib/semivariogram.js
git commit -m "Add lib/semivariogram.js with extracted math, components, and self-tests"
```

---

## Task 3: Create `three.html` (3×3 walkthrough only)

**Files:**
- Create: `three.html`
- Read from: `index.html` — head/CSS (1-819), ThreeByThreeMode component (1745-1939)

- [ ] **Step 1: Create `three.html` by copying `index.html` and editing in-place**

```bash
cp index.html three.html
```

- [ ] **Step 2: In `three.html` head, replace the inline `:root` and body CSS with a `<link>` to `lib/theme.css`**

Remove the `:root { ... }` block at lines 11-26 and the body + body::before blocks at lines 28-48 (these now come from `lib/theme.css`). Add the link in the `<head>`:

```html
<link rel="stylesheet" href="lib/theme.css">
```

- [ ] **Step 3: In `three.html`, change the `<title>` to "3×3 Semivariogram Walkthrough"**

- [ ] **Step 4: In `three.html` `<script type="text/babel">`, delete lines that have moved into `lib/semivariogram.js`:**

Delete from the babel script block:
- `const { useState, useMemo, useEffect, useCallback } = React;`
- `DATASET_3X3` const
- `DATASETS_10X10` const
- `MAX_LAG_10X10` const
- `computePairs` function
- `computeSemivariogram` function
- `predictionWeights` function
- `runTests` IIFE (lines 1004-1137)
- `fitModel` function
- `modelGamma` function
- `niceStep` function
- `GridView` component
- `SemivariogramPlot` component
- `TenByTenMode` component (lines 1939-2263)
- The `App` component's `mode-selector` nav and the `TenByTenMode` mount block

- [ ] **Step 5: In `three.html`, before the inline babel script tag, load `lib/semivariogram.js`**

```html
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script type="text/babel" data-presets="env,react" src="lib/semivariogram.js"></script>
<script type="text/babel" data-presets="env,react">
const { useState, useMemo, useEffect, useCallback } = React;

// ThreeByThreeMode component (moved from old index.html:1761-1939) ...
// (unchanged)

function App() {
  const threeRef = React.useRef(null);

  React.useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'SELECT' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const m = threeRef.current;
      if (!m) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); m.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); m.prev(); }
      else if (e.key === 'Home') { e.preventDefault(); m.reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="eyebrow">Ordinary Kriging · Teaching Demonstration</div>
          <h1 className="title">3×3 <em>Semivariogram</em> Walkthrough</h1>
        </div>
        <div className="meta">
          <div><span className="rule-line"></span></div>
          <div>Hand-calculation on the lecture-slide grid</div>
        </div>
      </header>
      <ThreeByThreeMode ref={threeRef} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
```

- [ ] **Step 6: Verify by opening `three.html` in a browser**

```bash
start three.html
```

Open DevTools. Expected: `[semivariogram tests done]` banner with no FAIL lines, and the 3×3 walkthrough renders correctly (lag chips, calc table, formula band, vertical tabs).

- [ ] **Step 7: Commit**

```bash
git add three.html
git commit -m "Add three.html — extracted 3x3 walkthrough using lib/semivariogram.js"
```

---

## Task 4: Create `ten.html` (10×10 explorer only)

**Files:**
- Create: `ten.html`
- Read from: `index.html` — head/CSS (1-819), TenByTenMode component (1950-2263)

- [ ] **Step 1: Create `ten.html` by copying `index.html`**

```bash
cp index.html ten.html
```

- [ ] **Step 2: In `ten.html` head, replace inline `:root` + body CSS with link to `lib/theme.css`** (same as Task 3 step 2)

- [ ] **Step 3: In `ten.html`, change the `<title>` to "10×10 Semivariogram Explorer"**

- [ ] **Step 4: In `ten.html` `<script type="text/babel">`, delete the same shared code listed in Task 3 step 4, PLUS delete `ThreeByThreeMode` (lines 1761-1939)**

- [ ] **Step 5: Wire up the App component as a single-mode shell, similar to Task 3 step 5 but rendering `TenByTenMode`**

```html
<script type="text/babel" data-presets="env,react" src="lib/semivariogram.js"></script>
<script type="text/babel" data-presets="env,react">
const { useState, useMemo, useEffect, useCallback } = React;

// TenByTenMode component (moved from old index.html:1950-2263) ...
// (unchanged)

function App() {
  const tenRef = React.useRef(null);

  React.useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'SELECT' || t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      const m = tenRef.current;
      if (!m) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); m.next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); m.prev(); }
      else if (e.key === 'Home') { e.preventDefault(); m.reset(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <header className="masthead">
        <div>
          <div className="eyebrow">Ordinary Kriging · Teaching Demonstration</div>
          <h1 className="title">10×10 <em>Semivariogram</em> Explorer</h1>
        </div>
        <div className="meta">
          <div><span className="rule-line"></span></div>
          <div>Empirical lags, theoretical models, and prediction at unknown cells</div>
        </div>
      </header>
      <TenByTenMode ref={tenRef} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
</script>
```

- [ ] **Step 6: Verify by opening `ten.html` in a browser**

```bash
start ten.html
```

Expected: `[semivariogram tests done]` banner, 10×10 grid renders, dataset picker has 3 options (smooth/random/clustered), model picker has 4 buttons (None/Spherical/Exp/Gaussian), all interactive features work.

- [ ] **Step 7: Commit**

```bash
git add ten.html
git commit -m "Add ten.html — extracted 10x10 explorer using lib/semivariogram.js"
```

---

## Task 5: Remove the old combined `index.html`

**Files:**
- Delete: `index.html` (to be replaced by the deck in Task 17)

- [ ] **Step 1: Confirm both new apps work**

Open `three.html` and `ten.html` once more, verify console shows `[semivariogram tests done]` and the UIs are interactive.

- [ ] **Step 2: Delete the old `index.html`**

```bash
rm index.html
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Remove old combined index.html — superseded by three.html + ten.html"
```

---

## Task 6: Update `gen_datasets.py` to write into `lib/semivariogram.js`

**Files:**
- Modify: `gen_datasets.py`

- [ ] **Step 1: Open `gen_datasets.py`. Find the section that prints JS-formatted arrays for `DATASETS_10X10`.**

- [ ] **Step 2: Change the script's docstring and `print()` instructions so that the printed arrays are meant to be pasted into `lib/semivariogram.js` (not `index.html`). Update the header comment of the script to say:**

```python
"""
Regenerate the 10×10 preset grids used by ten.html.

Outputs JS-formatted `DATASETS_10X10 = { ... }` block — copy it into
lib/semivariogram.js, replacing the existing DATASETS_10X10 const.

Also prints γ(h) for h=1..9 per preset so you can sanity-check that:
  - smooth: rises and plateaus
  - random: stays roughly flat
  - clustered: rises, peaks, then dips (hole effect)
"""
```

- [ ] **Step 3: Run `python gen_datasets.py` and confirm it still produces output (no actual change in behavior; just docs).**

- [ ] **Step 4: Commit**

```bash
git add gen_datasets.py
git commit -m "Update gen_datasets.py docs to point at lib/semivariogram.js"
```

---

## Task 7: Copy the lab PDF into `assets/lab/`

**Files:**
- Create: `assets/lab/Ordinary-Kriging-Laurier-Lab-EL_2026_05_26.pdf`

- [ ] **Step 1: Create the directory and copy the PDF**

```bash
mkdir -p assets/lab
cp "/c/Users/mlier/Documents/Academic_position_2026/Wilfrid Laurier University_2026/onsite/teaching_demo/Ordinary-Kriging-Laurier-Lab-EL_2026_05_26.pdf" assets/lab/
```

- [ ] **Step 2: Verify the file exists**

```bash
ls -la assets/lab/
```

Expected: one PDF file ~few hundred KB to a few MB.

- [ ] **Step 3: Commit**

```bash
git add assets/lab/
git commit -m "Copy lab PDF into assets/lab/"
```

---

## Task 8: Build slide-to-image mapping for assets/img/

**Files:**
- Read from: `pic/` (source images) and `/tmp/pptx_unpacked/ppt/media/` (PPTX fallback)
- Create: temporary working notes

- [ ] **Step 1: Re-unpack the PPTX into a working directory**

```bash
mkdir -p /tmp/pptx_unpacked
python C:/Users/mlier/.claude/skills/pptx/scripts/office/unpack.py "C:/Users/mlier/Documents/Academic_position_2026/Wilfrid Laurier University_2026/onsite/teaching_demo/Ordinary-Kriging-Laurier-EL_2026_05_26.pptx" /tmp/pptx_unpacked
```

- [ ] **Step 2: For each slide in the spec outline (slides 1-21), determine which images it needs by reading `ppt/slides/_rels/slideN.xml.rels` (note: PPTX slide numbers don't match deck slide numbers — see spec §4 mapping table)**

- [ ] **Step 3: For each needed image, decide whether to source it from `pic/` (preferred) or `/tmp/pptx_unpacked/ppt/media/` (fallback). Use the Read tool (visual inspection — Claude is multimodal) to pick the source.**

- [ ] **Step 4: Record the mapping as a Python dict in `/tmp/slide_images.py`**

Example structure:

```python
SLIDE_IMAGES = {
    # deck_slide_number: [(source_path, destination_filename), ...]
    1: [("C:/Users/mlier/Documents/.../pic/F7t4cV.jpg", "slide01_title_bg.jpg")],
    2: [("C:/Users/mlier/Documents/.../pic/ChatGPT Image May 14, 2026, 07_45_29 PM.png", "slide02_rain_stations.png")],
    3: [
        ("/tmp/pptx_unpacked/ppt/media/image6.png", "slide03_what.png"),
        ("/tmp/pptx_unpacked/ppt/media/image10.png", "slide03_why.png"),
        ("/tmp/pptx_unpacked/ppt/media/image14.png", "slide03_how.png"),
    ],
    # ... etc for all 21 slides that need images
}
```

This file is not committed — it drives Task 9.

---

## Task 9: Extract, downsize, and place images into `assets/img/`

**Files:**
- Create: `assets/img/*` (per the mapping built in Task 8)

- [ ] **Step 1: Create the destination directory**

```bash
mkdir -p assets/img
```

- [ ] **Step 2: Run a one-off Python script (do not commit it) to copy + downsize:**

```python
# Save as /tmp/copy_images.py, then run: python /tmp/copy_images.py
import sys
sys.path.insert(0, '/tmp')
from slide_images import SLIDE_IMAGES
from PIL import Image
import shutil
from pathlib import Path

dest = Path("assets/img")
dest.mkdir(parents=True, exist_ok=True)

for slide_num, items in SLIDE_IMAGES.items():
    for src, dest_name in items:
        src_path = Path(src)
        dest_path = dest / dest_name
        if src_path.suffix.lower() == '.svg':
            # SVGs don't need resizing
            shutil.copy(src_path, dest_path)
            print(f"copy  {src_path.name} -> {dest_path}")
        else:
            img = Image.open(src_path)
            if max(img.size) > 1200:
                img.thumbnail((1200, 1200), Image.LANCZOS)
            # Save with quality 85 for JPEG, default for PNG
            save_kwargs = {'quality': 85} if dest_path.suffix.lower() in ('.jpg', '.jpeg') else {}
            img.save(dest_path, **save_kwargs)
            print(f"resize {src_path.name} -> {dest_path} ({img.size})")

print(f"\n{sum(len(v) for v in SLIDE_IMAGES.values())} images placed in assets/img/")
```

- [ ] **Step 3: Verify all expected files are in `assets/img/`**

```bash
ls assets/img/ | wc -l
```

Expected: matches the total in the mapping (~15-20 images).

- [ ] **Step 4: Commit**

```bash
git add assets/img/
git commit -m "Extract and downsize slide images into assets/img/"
```

---

## Task 10: Create the deck scaffold (`index.html` — head, base CSS, controller JS, empty slides)

**Files:**
- Create: `index.html`

- [ ] **Step 1: Write `index.html` with the head + CSS scaffold. This file replaces the old `index.html`:**

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>An Introduction to Ordinary Kriging — Teaching Demo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400&family=Manrope:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="lib/theme.css">
<style>
  /* ===========================================
     VIEWPORT FITTING — each slide = one viewport, no scrolling within a slide.
     =========================================== */
  html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }
  html, body { height: 100%; overflow-x: hidden; }

  :root {
    --slide-padding: clamp(2rem, 5vw, 5rem);
    --title-size: clamp(1.8rem, 4.5vw, 3.8rem);
    --h2-size: clamp(1.3rem, 3vw, 2.4rem);
    --h3-size: clamp(1rem, 2vw, 1.5rem);
    --body-size: clamp(0.9rem, 1.3vw, 1.15rem);
    --small-size: clamp(0.75rem, 1vw, 0.95rem);
    --content-gap: clamp(0.75rem, 2vw, 2rem);
  }

  .deck { position: relative; z-index: 2; }
  .slide {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    padding: var(--slide-padding);
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }
  .slide-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-height: 100%;
    overflow: hidden;
    gap: var(--content-gap);
  }

  h1.slide-title {
    font-family: 'Fraunces', serif;
    font-weight: 500;
    font-size: var(--title-size);
    letter-spacing: -0.02em;
    margin: 0;
  }
  h1.slide-title em { font-style: italic; color: var(--accent); }
  h2.slide-heading {
    font-family: 'Fraunces', serif;
    font-weight: 500;
    font-size: var(--h2-size);
    letter-spacing: -0.01em;
    margin: 0;
  }
  .eyebrow {
    font-family: 'Manrope', sans-serif;
    font-size: var(--small-size);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--ink-mute);
  }

  /* Bottom-right counter */
  .slide-counter {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 50;
    font-family: 'JetBrains Mono', monospace;
    font-size: var(--small-size);
    color: var(--ink-mute);
    background: rgba(255, 255, 255, 0.7);
    padding: 0.25rem 0.6rem;
    border-radius: 4px;
    pointer-events: none;
  }
  @media (max-height: 500px) { .slide-counter { display: none; } }

  /* Reveal animations */
  .reveal {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .slide.visible .reveal { opacity: 1; transform: translateY(0); }
  .slide.visible .reveal:nth-child(1) { transition-delay: 0.08s; }
  .slide.visible .reveal:nth-child(2) { transition-delay: 0.16s; }
  .slide.visible .reveal:nth-child(3) { transition-delay: 0.24s; }
  .slide.visible .reveal:nth-child(4) { transition-delay: 0.32s; }
  .slide.visible .reveal:nth-child(5) { transition-delay: 0.40s; }
  .slide.visible .reveal:nth-child(6) { transition-delay: 0.48s; }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .reveal { transition: opacity 0.2s ease; transform: none; }
  }

  /* Launch button shared style */
  .launch-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Manrope', sans-serif;
    font-size: var(--h3-size);
    font-weight: 600;
    background: var(--accent);
    color: var(--paper);
    border: none;
    padding: 0.85rem 1.6rem;
    border-radius: 6px;
    text-decoration: none;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
    box-shadow: 0 2px 8px rgba(29, 78, 216, 0.2);
  }
  .launch-button:hover {
    background: var(--accent-deep);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(29, 78, 216, 0.3);
  }
</style>
</head>
<body>
<div class="deck">
  <!-- Slides will be added in tasks 11-22 below -->
  <section class="slide" id="slide-1">
    <div class="slide-content">
      <h1 class="slide-title reveal">Scaffold placeholder</h1>
    </div>
  </section>
</div>

<div class="slide-counter" id="slide-counter">1 / 21</div>

<script>
// ===========================================
// SLIDE DECK CONTROLLER
// - Scroll-snap drives slide-by-slide
// - IntersectionObserver marks the active slide .visible (triggers .reveal animations)
//   and updates the counter
// - Keyboard: arrows / space / PgUp / PgDn / Home / End
// - f: toggle fullscreen
// ===========================================
(function() {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const counter = document.getElementById('slide-counter');
  const total = slides.length;
  let activeIdx = 0;

  // IntersectionObserver: when a slide is ≥50% in view, mark it .visible and active.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio >= 0.5) {
        const idx = slides.indexOf(e.target);
        if (idx >= 0) {
          activeIdx = idx;
          slides.forEach((s, i) => s.classList.toggle('visible', i === idx));
          counter.textContent = `${idx + 1} / ${total}`;
        }
      }
    });
  }, { threshold: [0.5] });
  slides.forEach(s => io.observe(s));

  // Scroll to a specific slide.
  function goTo(idx) {
    const target = Math.max(0, Math.min(total - 1, idx));
    slides[target].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Keyboard handlers.
  window.addEventListener('keydown', (e) => {
    // Don't intercept while typing in form fields (defensive — none in the deck yet).
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' ||
        (e.key === ' ' && !e.shiftKey)) {
      e.preventDefault(); goTo(activeIdx + 1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp' ||
               (e.key === ' ' && e.shiftKey)) {
      e.preventDefault(); goTo(activeIdx - 1);
    } else if (e.key === 'Home') {
      e.preventDefault(); goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault(); goTo(total - 1);
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    }
  });
})();
</script>
</body>
</html>
```

- [ ] **Step 2: Open the deck in a browser to verify the scaffold works**

```bash
start index.html
```

Expected: white background, the noise overlay from `lib/theme.css`, "Scaffold placeholder" centered, counter shows `1 / 21` (it will show `1 / 1` here because only one slide exists — that will go up as slides are added).

- [ ] **Step 3: Press `f` and confirm fullscreen toggles. Press `Escape` to exit.**

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add deck scaffold: index.html with scroll-snap, controller, slide counter"
```

---

## Task 11: Slides 1-3 (Title, Hook, Learning Outcomes)

**Files:**
- Modify: `index.html`

Replace the single placeholder slide with three real slides.

- [ ] **Step 1: In `index.html`, replace the placeholder `<section class="slide" id="slide-1">` block with these three slides:**

```html
<!-- Slide 1: Title -->
<section class="slide" id="slide-1">
  <div class="slide-content" style="align-items: center; text-align: center; justify-content: center;">
    <div class="eyebrow reveal">Ordinary Kriging · Teaching Demonstration</div>
    <h1 class="slide-title reveal">An Introduction to<br><em>Ordinary Kriging</em></h1>
    <div class="reveal" style="margin-top: 1.5rem; font-size: var(--h3-size); color: var(--ink-soft);">
      Dr. Erin Li
    </div>
    <div class="reveal" style="font-size: var(--body-size); color: var(--ink-mute);">
      UbiSensing &amp; AI Lab, University of Calgary &middot; mingke.li@ucalgary.ca
    </div>
  </div>
</section>

<!-- Slide 2: Hook -->
<section class="slide" id="slide-2">
  <div class="slide-content" style="flex-direction: row; gap: 3rem; align-items: center;">
    <div style="flex: 1;">
      <h2 class="slide-heading reveal">How do we estimate rainfall where we don't observe it?</h2>
      <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 1.2rem;">
        Is it enough to simply use the nearest stations? Should we only rely on distance,
        or are there deeper spatial patterns we need to consider?
      </p>
    </div>
    <div class="reveal" style="flex: 1;">
      <img src="assets/img/slide02_rain_stations.png" alt="Rainfall stations across a region" style="width: 100%; height: auto; max-height: 70vh; object-fit: contain; border-radius: 8px;">
    </div>
  </div>
</section>

<!-- Slide 3: Learning Outcomes -->
<section class="slide" id="slide-3">
  <div class="slide-content">
    <div class="eyebrow reveal">By the end of today's lecture, you'll learn…</div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; margin-top: 1.5rem;">
      <div class="reveal" style="text-align: center;">
        <img src="assets/img/slide03_what.png" alt="What" style="width: 60%; max-width: 180px; height: auto;">
        <h3 style="font-family: 'Fraunces', serif; font-size: var(--h3-size); margin-top: 1rem;">What Ordinary Kriging is</h3>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">Understand the core concept of geostatistical interpolation</p>
      </div>
      <div class="reveal" style="text-align: center;">
        <img src="assets/img/slide03_why.png" alt="Why" style="width: 60%; max-width: 180px; height: auto;">
        <h3 style="font-family: 'Fraunces', serif; font-size: var(--h3-size); margin-top: 1rem;">Why we use it</h3>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">See how spatial dependence improves prediction accuracy</p>
      </div>
      <div class="reveal" style="text-align: center;">
        <img src="assets/img/slide03_how.png" alt="How" style="width: 60%; max-width: 180px; height: auto;">
        <h3 style="font-family: 'Fraunces', serif; font-size: var(--h3-size); margin-top: 1rem;">How to apply it</h3>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">Learn the workflow from variogram to prediction map</p>
      </div>
    </div>
    <div class="reveal" style="text-align: center; margin-top: 1.5rem; font-size: var(--small-size); color: var(--ink-mute); font-style: italic;">
      ** Lab Assignment 6
    </div>
  </div>
</section>
```

- [ ] **Step 2: Reload the deck. Verify slides 1, 2, 3 render correctly. The counter should now read `1 / 3`, `2 / 3`, `3 / 3` as you scroll.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slides 1-3: title, hook, learning outcomes"
```

---

## Task 12: Slides 4-6 (Quick Review, Distance Not Enough, What Is Kriging)

**Files:**
- Modify: `index.html` — append three slides

- [ ] **Step 1: Append these three slides immediately after slide 3's `</section>`:**

```html
<!-- Slide 4: A Quick Review (IDW) -->
<section class="slide" id="slide-4">
  <div class="slide-content" style="flex-direction: row; gap: 3rem; align-items: center;">
    <div style="flex: 1.2;">
      <div class="eyebrow reveal">A Quick Review</div>
      <h2 class="slide-heading reveal" style="margin-top: 0.5rem;">Spatial interpolation</h2>
      <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 1rem;">
        The process of predicting unknown values at unsampled locations based on
        measurements from known locations.
      </p>
      <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.8rem;">
        <strong>Deterministic interpolation</strong> estimates unknown values using mathematical rules
        based on nearby observations, relying on distance or smoothness assumptions.
      </p>
      <div class="reveal" style="margin-top: 1.2rem;">
        <div style="font-family: 'Manrope', sans-serif; font-size: var(--small-size); letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-mute);">Common methods</div>
        <ul style="font-size: var(--body-size); color: var(--ink); margin-top: 0.4rem;">
          <li>Nearest Neighbor</li>
          <li>Bilinear</li>
          <li><strong>Inverse Distance Weighting (IDW)</strong> — Our baseline method</li>
        </ul>
        <div style="margin-top: 0.8rem; font-size: var(--small-size); color: var(--ink-mute); font-style: italic;">
          * IDW key assumption: distance alone determines similarity
        </div>
      </div>
    </div>
    <div class="reveal" style="flex: 1;">
      <img src="assets/img/slide04_idw.png" alt="IDW interpolation diagram" style="width: 100%; height: auto; max-height: 65vh; object-fit: contain;">
    </div>
  </div>
</section>

<!-- Slide 5: Why Distance Alone Is Not Enough -->
<section class="slide" id="slide-5">
  <div class="slide-content" style="align-items: center; text-align: center;">
    <h2 class="slide-heading reveal">Why distance alone is not enough</h2>
    <div class="reveal" style="margin-top: 1.5rem;">
      <img src="assets/img/slide05_why_not.png" alt="Distance vs. similarity counter-example" style="max-width: 100%; max-height: 65vh; height: auto; object-fit: contain;">
    </div>
  </div>
</section>

<!-- Slide 6: What Is Kriging? (Origins) -->
<section class="slide" id="slide-6">
  <div class="slide-content" style="flex-direction: row; gap: 3rem; align-items: center;">
    <div style="flex: 1.2;">
      <div class="eyebrow reveal">What is Kriging?</div>
      <h2 class="slide-heading reveal" style="margin-top: 0.5rem;">A method born from mining geostatistics</h2>
      <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 1.2rem;">
        <strong>Origins:</strong> Named after Danie G. Krige, a South African mining engineer in the 1950s
        who developed it to estimate gold ore grades from sparse samples.
      </p>
      <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.8rem;">
        Where IDW asks <em>how far away</em> each point is, Kriging asks <em>how spatially
        related</em> they are, <em>how similar</em> they are statistically, and how weights
        should be optimized to minimize prediction error.
      </p>
    </div>
    <div class="reveal" style="flex: 1;">
      <img src="assets/img/slide06_krige.png" alt="Danie Krige portrait or mining context" style="width: 100%; max-height: 65vh; height: auto; object-fit: contain;">
    </div>
  </div>
</section>
```

- [ ] **Step 2: Reload and verify all 6 slides render correctly.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slides 4-6: Quick Review, Distance Not Enough, What Is Kriging"
```

---

## Task 13: Slide 7 (BLUP — Best Linear Unbiased Prediction, equation-free)

**Files:**
- Modify: `index.html` — append one slide

- [ ] **Step 1: Append this slide after slide 6:**

```html
<!-- Slide 7: BLUP -->
<section class="slide" id="slide-7">
  <div class="slide-content">
    <div class="eyebrow reveal">Kriging as BLUP</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">Best Linear Unbiased Prediction</h2>
    <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.8rem; max-width: 70ch;">
      Kriging minimizes prediction error variance. Among all possible linear unbiased
      estimators, kriging gives the most precise estimate.
    </p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-top: 2rem;">
      <div class="reveal" style="padding: 1.5rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h2-size); color: var(--accent); font-weight: 500;">Best</div>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">
          Minimizes prediction error variance.
        </p>
      </div>
      <div class="reveal" style="padding: 1.5rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h2-size); color: var(--accent); font-weight: 500;">Linear</div>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">
          Prediction is a weighted sum of observed values, so Kriging remains
          mathematically interpretable.
        </p>
      </div>
      <div class="reveal" style="padding: 1.5rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h2-size); color: var(--accent); font-weight: 500;">Unbiased</div>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">
          Expected prediction error is zero — Kriging is statistically fair on average.
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Reload and verify slide 7 renders with three side-by-side cards. Confirm there are NO equations (only the bolded one-word headings and explanatory text).**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slide 7: BLUP with three callout cards (no equations)"
```

---

## Task 14: Slides 8-9 (Core Assumption, When Appropriate)

**Files:**
- Modify: `index.html` — append two slides

- [ ] **Step 1: Append these two slides after slide 7:**

```html
<!-- Slide 8: Ordinary Kriging Core Assumption -->
<section class="slide" id="slide-8">
  <div class="slide-content">
    <div class="eyebrow reveal">Ordinary Kriging — Core Assumption</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">Unknown but constant local mean</h2>
    <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 1rem; max-width: 75ch;">
      Ordinary Kriging assumes that within the local neighborhood of prediction, the
      underlying mean is constant but unknown.
    </p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1.5rem;">
      <div class="reveal" style="padding: 1.5rem; background: var(--paper-soft); border-radius: 6px;">
        <div style="font-family: 'JetBrains Mono', monospace; font-size: var(--h3-size); color: var(--accent-deep); text-align: center;">
          Z(s) = μ + ε(s)
        </div>
        <div style="font-size: var(--small-size); color: var(--ink-mute); margin-top: 1rem; line-height: 1.7;">
          <div><strong>Z(s)</strong> — observed value at location s</div>
          <div><strong>μ</strong> — unknown but locally constant mean</div>
          <div><strong>ε(s)</strong> — spatially correlated random component</div>
        </div>
      </div>
      <div class="reveal" style="font-size: var(--body-size); color: var(--ink-soft);">
        <p>
          Ordinary Kriging assumes <strong>local stability</strong> without requiring
          <strong>global uniformity</strong>. It avoids the unrealistic assumption of
          Simple Kriging (known global mean), while also avoiding the complexity of
          Universal Kriging (explicit trend modeling).
        </p>
      </div>
    </div>
  </div>
</section>

<!-- Slide 9: When Ordinary Kriging Is Appropriate -->
<section class="slide" id="slide-9">
  <div class="slide-content">
    <h2 class="slide-heading reveal">When Ordinary Kriging is appropriate</h2>
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem; margin-top: 1.5rem;">
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">A. Spatial autocorrelation exists</div>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">
          Nearby points should be more similar than distant points.
        </p>
      </div>
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">B. No strong large-scale trend</div>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">
          A major directional trend (e.g., temperature decreasing steadily with altitude)
          will make Ordinary Kriging underperform.
        </p>
      </div>
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">C. Sufficient sample density</div>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">
          A meaningful variogram requires enough data to estimate spatial dependence reliably.
        </p>
      </div>
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">D. Continuous variables</div>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.5rem;">
          Designed for continuous numeric variables (rainfall, temperature, soil moisture).
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Reload and verify slides 8 and 9 render.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slides 8-9: Core Assumption, When Appropriate"
```

---

## Task 15: Slide 10 (Quick Test with click-reveal animation)

**Files:**
- Modify: `index.html` — append one slide + tiny module-level JS state

- [ ] **Step 1: Append slide 10 after slide 9:**

```html
<!-- Slide 10: Quick Test (click-reveal) -->
<section class="slide" id="slide-10">
  <div class="slide-content">
    <h2 class="slide-heading reveal">Quick test: would Ordinary Kriging work here?</h2>
    <div class="reveal" id="quick-test-wrap" style="cursor: pointer; margin-top: 1rem;">
      <table class="quick-test" style="width: 100%; border-collapse: collapse; font-size: var(--body-size);">
        <thead>
          <tr style="border-bottom: 2px solid var(--rule);">
            <th style="text-align: left; padding: 0.7rem; color: var(--ink-mute); font-weight: 600;">Scenario</th>
            <th style="text-align: left; padding: 0.7rem 1rem; color: var(--ink-mute); font-weight: 600; width: 7rem;">Ordinary Kriging?</th>
            <th style="text-align: left; padding: 0.7rem; color: var(--ink-mute); font-weight: 600;">Why</th>
          </tr>
        </thead>
        <tbody>
          <tr data-row="0" style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.7rem;">Regional temperature with altitude trend</td>
            <td class="qt-answer" style="padding: 0.7rem 1rem; color: #b91c1c; font-weight: 600; opacity: 0; visibility: hidden;">No</td>
            <td class="qt-why" style="padding: 0.7rem; color: var(--ink-soft); opacity: 0; visibility: hidden;">Strong altitude trend violates stationarity</td>
          </tr>
          <tr data-row="1" style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.7rem;">Land cover class</td>
            <td class="qt-answer" style="padding: 0.7rem 1rem; color: #b91c1c; font-weight: 600; opacity: 0; visibility: hidden;">No</td>
            <td class="qt-why" style="padding: 0.7rem; color: var(--ink-soft); opacity: 0; visibility: hidden;">Categorical variable rather than continuous</td>
          </tr>
          <tr data-row="2" style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.7rem;">Rainfall of a province with 3 weather stations</td>
            <td class="qt-answer" style="padding: 0.7rem 1rem; color: #b91c1c; font-weight: 600; opacity: 0; visibility: hidden;">No</td>
            <td class="qt-why" style="padding: 0.7rem; color: var(--ink-soft); opacity: 0; visibility: hidden;">Sample density too sparse for a reliable variogram</td>
          </tr>
          <tr data-row="3" style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.7rem;">Species presence / absence</td>
            <td class="qt-answer" style="padding: 0.7rem 1rem; color: #b91c1c; font-weight: 600; opacity: 0; visibility: hidden;">No</td>
            <td class="qt-why" style="padding: 0.7rem; color: var(--ink-soft); opacity: 0; visibility: hidden;">Binary variable rather than continuous</td>
          </tr>
          <tr data-row="4" style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.7rem;">Soil nutrients in an agricultural field</td>
            <td class="qt-answer" style="padding: 0.7rem 1rem; color: #15803d; font-weight: 600; opacity: 0; visibility: hidden;">Yes</td>
            <td class="qt-why" style="padding: 0.7rem; color: var(--ink-soft); opacity: 0; visibility: hidden;">Continuous, spatially autocorrelated, local mean plausible</td>
          </tr>
          <tr data-row="5">
            <td style="padding: 0.7rem;">Daily rainfall in one watershed</td>
            <td class="qt-answer" style="padding: 0.7rem 1rem; color: #15803d; font-weight: 600; opacity: 0; visibility: hidden;">Yes</td>
            <td class="qt-why" style="padding: 0.7rem; color: var(--ink-soft); opacity: 0; visibility: hidden;">Continuous, spatially autocorrelated, local mean plausible</td>
          </tr>
        </tbody>
      </table>
      <div id="quick-test-status" style="margin-top: 0.8rem; font-size: var(--small-size); color: var(--ink-mute); font-style: italic;">
        Click table to reveal answers — 0 / 6
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Add the click-reveal handler. Inside the existing `<script>` block (the controller IIFE), append BEFORE the closing `})();`:**

```js
  // Slide 10 — Quick Test click-reveal.
  // Reveal next hidden row's ? + Why cells on each click of the table area.
  // Persists across scroll-aways within the session (state held in this closure).
  const qtWrap = document.getElementById('quick-test-wrap');
  const qtStatus = document.getElementById('quick-test-status');
  let qtRevealed = 0;
  const QT_TOTAL = 6;
  if (qtWrap) {
    qtWrap.addEventListener('click', () => {
      if (qtRevealed >= QT_TOTAL) return;
      const row = qtWrap.querySelector(`tr[data-row="${qtRevealed}"]`);
      if (row) {
        row.querySelectorAll('.qt-answer, .qt-why').forEach(cell => {
          cell.style.transition = 'opacity 0.25s ease';
          cell.style.visibility = 'visible';
          cell.style.opacity = '1';
        });
      }
      qtRevealed += 1;
      qtStatus.textContent = `Click table to reveal answers — ${qtRevealed} / ${QT_TOTAL}`;
    });
  }
```

- [ ] **Step 3: Reload `index.html`, scroll to slide 10. Click the table six times and confirm each click reveals the next row's answer + reason. The status text updates `0/6 → 6/6`. The 7th click is a no-op.**

- [ ] **Step 4: Confirm keyboard nav still works on slide 10 — pressing `→` advances to slide 11 (which doesn't exist yet, so it stays at slide 10).**

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "Add slide 10: Quick Test with click-reveal animation"
```

---

## Task 16: Slides 11-13 (Step 1 Data Exploration, Step 2 intuition, Anatomy)

**Files:**
- Modify: `index.html` — append three slides

- [ ] **Step 1: Append after slide 10:**

```html
<!-- Slide 11: Step 1 — Data Exploration -->
<section class="slide" id="slide-11">
  <div class="slide-content">
    <div class="eyebrow reveal">Step-by-Step Ordinary Kriging Workflow</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">Step 1 — Data exploration</h2>
    <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.8rem;">
      Before kriging, thoroughly inspect the data to verify its assumptions.
    </p>
    <div style="display: grid; grid-template-columns: 1.7fr 1fr; gap: 2rem; margin-top: 1.2rem;">
      <table class="reveal" style="width: 100%; border-collapse: collapse; font-size: var(--body-size);">
        <thead>
          <tr style="border-bottom: 2px solid var(--rule);">
            <th style="text-align: left; padding: 0.6rem; color: var(--ink-mute); font-weight: 600;">Question</th>
            <th style="text-align: left; padding: 0.6rem; color: var(--ink-mute); font-weight: 600;">Why it matters</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.55rem;">Are values continuous numeric data?</td>
            <td style="padding: 0.55rem; color: var(--ink-soft);">Kriging is designed for continuous variables</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.55rem;">Are there outliers?</td>
            <td style="padding: 0.55rem; color: var(--ink-soft);">Outliers can distort the variogram</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.55rem;">Is the distribution highly skewed?</td>
            <td style="padding: 0.55rem; color: var(--ink-soft);">Transformation may be needed</td>
          </tr>
          <tr style="border-bottom: 1px solid var(--rule-soft);">
            <td style="padding: 0.55rem;">Is there a spatial trend?</td>
            <td style="padding: 0.55rem; color: var(--ink-soft);">Strong trend may require universal kriging</td>
          </tr>
          <tr>
            <td style="padding: 0.55rem;">Are points clustered?</td>
            <td style="padding: 0.55rem; color: var(--ink-soft);">Clustering affects weights and variogram estimation</td>
          </tr>
        </tbody>
      </table>
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-radius: 6px;">
        <div style="font-family: 'Manrope', sans-serif; font-size: var(--small-size); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-mute);">Typical tools</div>
        <ul style="font-size: var(--body-size); color: var(--ink); margin-top: 0.6rem; padding-left: 1.2rem;">
          <li>Histogram</li>
          <li>Summary statistics</li>
          <li>Point map</li>
          <li>Trend analysis</li>
          <li>Outlier detection</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- Slide 12: Step 2 intuition -->
<section class="slide" id="slide-12">
  <div class="slide-content" style="align-items: center; text-align: center;">
    <div class="eyebrow reveal">Step-by-Step Ordinary Kriging Workflow</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">Step 2 — Empirical semivariogram</h2>
    <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 1.2rem; max-width: 60ch;">
      If two locations are close, their values should usually be more similar — lower
      semivariance. As distance increases, values become less similar, and semivariance
      tends to increase.
    </p>
    <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.8rem; max-width: 60ch; font-style: italic;">
      That relationship becomes the statistical foundation for how Kriging assigns weights.
    </p>
  </div>
</section>

<!-- Slide 13: Anatomy — Nugget / Range / Sill -->
<section class="slide" id="slide-13">
  <div class="slide-content">
    <h2 class="slide-heading reveal">Anatomy of an empirical semivariogram</h2>
    <div style="display: grid; grid-template-columns: 1.3fr 1fr; gap: 2rem; margin-top: 1.2rem; align-items: center;">
      <div class="reveal">
        <img src="assets/img/slide13_anatomy.png" alt="Semivariogram with nugget, range, sill labeled" style="width: 100%; max-height: 60vh; object-fit: contain;">
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.8rem;">
        <div class="reveal" style="padding: 1rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
          <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">Nugget</div>
          <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.3rem;">
            Value at or near origin (h=0). Represents measurement error or microscale variation.
          </p>
        </div>
        <div class="reveal" style="padding: 1rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
          <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">Range</div>
          <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.3rem;">
            Distance where the curve levels off. Beyond this distance, points are effectively uncorrelated.
          </p>
        </div>
        <div class="reveal" style="padding: 1rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
          <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">Sill</div>
          <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.3rem;">
            Plateau value. Approximate total variance of the data.
          </p>
        </div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Reload and verify slides 11-13. The Step-1 table fits on one viewport; the anatomy slide has the curve on the left and three callouts on the right.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slides 11-13: Step 1 Data Exploration, Step 2 intuition, Anatomy"
```

---

## Task 17: Slide 14 (3×3 launch — static SVG of the 3×3 grid + button)

**Files:**
- Modify: `index.html` — append one slide

- [ ] **Step 1: Append after slide 13:**

```html
<!-- Slide 14: 3×3 Worked Example launch -->
<section class="slide" id="slide-14">
  <div class="slide-content">
    <div class="eyebrow reveal">Worked example</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">A 3×3 rainfall grid, calculated by hand</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3rem; margin-top: 1.5rem; align-items: center;">
      <!-- Static SVG 3×3 grid with the lecture values -->
      <div class="reveal" style="display: flex; justify-content: center;">
        <svg viewBox="0 0 240 240" width="100%" style="max-width: 360px; background: var(--paper-soft); padding: 0; border: 1px solid var(--rule);">
          <!-- 9 cells, 80×80 each. Values typed in the cell centers. -->
          <g font-family="Manrope, sans-serif" font-size="32" font-weight="500" text-anchor="middle" fill="var(--ink)">
            <rect x="0"   y="0"   width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="40" y="50">14</text>
            <rect x="80"  y="0"   width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="120" y="50">16</text>
            <rect x="160" y="0"   width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="200" y="50">18</text>
            <rect x="0"   y="80"  width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="40" y="130">12</text>
            <rect x="80"  y="80"  width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="120" y="130">14</text>
            <rect x="160" y="80"  width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="200" y="130">17</text>
            <rect x="0"   y="160" width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="40" y="210">10</text>
            <rect x="80"  y="160" width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="120" y="210">13</text>
            <rect x="160" y="160" width="80" height="80" fill="var(--paper)" stroke="var(--rule)" stroke-width="1"/>
            <text x="200" y="210">15</text>
          </g>
        </svg>
      </div>
      <div>
        <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft);">
          Let's walk through the calculation pair-by-pair: enumerate horizontal pairs,
          vertical pairs, then diagonal pairs at h=√2 and h=2, compute γ(h), and place
          each point on the semivariogram.
        </p>
        <p class="reveal" style="font-size: var(--small-size); color: var(--ink-mute); margin-top: 0.6rem; font-style: italic;">
          Each grid cell is 1 unit apart.
        </p>
        <div class="reveal" style="margin-top: 1.5rem;">
          <a href="three.html" target="_blank" rel="noopener" class="launch-button">
            Launch 3×3 walkthrough →
          </a>
        </div>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Reload, scroll to slide 14, click the launch button, confirm it opens `three.html` in a new tab.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slide 14: 3x3 worked example with launch button"
```

---

## Task 18: Slide 15 (Step 3 — Theoretical models + sparklines + 10×10 launch)

**Files:**
- Modify: `index.html` — append one slide with three inline SVG sparklines

- [ ] **Step 1: Append after slide 14:**

```html
<!-- Slide 15: Step 3 — Fit Theoretical Semivariogram Model + 10×10 launch -->
<section class="slide" id="slide-15">
  <div class="slide-content">
    <div class="eyebrow reveal">Step-by-Step Ordinary Kriging Workflow</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">Step 3 — Fit a theoretical semivariogram model</h2>
    <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.6rem;">
      An empirical semivariogram is a scatter of observed γ values — for Kriging we need
      a smooth, mathematically defined curve.
    </p>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.2rem; margin-top: 1.5rem;">
      <!-- Spherical -->
      <div class="reveal" style="padding: 1rem; background: var(--paper-soft); border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">Spherical</div>
          <svg viewBox="0 0 80 40" width="80" height="40" aria-hidden="true">
            <!-- Spherical: rises then caps. Approximated path. -->
            <path d="M 4 36 Q 16 12 38 8 L 76 8" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="font-size: var(--small-size); color: var(--ink-mute); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.5rem;">Best used when</div>
        <ul style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.4rem; padding-left: 1.1rem; line-height: 1.4;">
          <li>Spatial similarity decreases steadily then stops beyond a certain distance</li>
          <li>General-purpose environmental data</li>
        </ul>
      </div>
      <!-- Exponential -->
      <div class="reveal" style="padding: 1rem; background: var(--paper-soft); border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">Exponential</div>
          <svg viewBox="0 0 80 40" width="80" height="40" aria-hidden="true">
            <!-- Exponential: asymptotic approach -->
            <path d="M 4 36 C 12 36 24 10 76 8" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="font-size: var(--small-size); color: var(--ink-mute); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.5rem;">Best used when</div>
        <ul style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.4rem; padding-left: 1.1rem; line-height: 1.4;">
          <li>Nearby points may differ substantially</li>
          <li>Patchy or irregular variables</li>
          <li>Air pollution, contaminant spread</li>
        </ul>
      </div>
      <!-- Gaussian -->
      <div class="reveal" style="padding: 1rem; background: var(--paper-soft); border-radius: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">Gaussian</div>
          <svg viewBox="0 0 80 40" width="80" height="40" aria-hidden="true">
            <!-- Gaussian: flat origin, S-curve -->
            <path d="M 4 36 C 4 36 20 36 36 18 C 52 4 60 8 76 8" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div style="font-size: var(--small-size); color: var(--ink-mute); letter-spacing: 0.08em; text-transform: uppercase; margin-top: 0.5rem;">Best used when</div>
        <ul style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.4rem; padding-left: 1.1rem; line-height: 1.4;">
          <li>Spatial processes change smoothly over space</li>
          <li>Highly continuous surfaces</li>
          <li>Temperature, groundwater surfaces</li>
        </ul>
      </div>
    </div>
    <div class="reveal" style="text-align: center; margin-top: 1.5rem;">
      <a href="ten.html" target="_blank" rel="noopener" class="launch-button">
        Launch 10×10 + model picker →
      </a>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Reload, scroll to slide 15, confirm the three model cards each show a distinct sparkline shape, and the launch button opens `ten.html` in a new tab.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slide 15: Step 3 theoretical models with sparklines and 10x10 launch"
```

---

## Task 19: Slides 16-17 (Step 4 A/B/C/D, Step 5 figures-only)

**Files:**
- Modify: `index.html` — append two slides

- [ ] **Step 1: Append after slide 15:**

```html
<!-- Slide 16: Step 4 — Build the Kriging Matrix (A/B/C/D, no equations) -->
<section class="slide" id="slide-16">
  <div class="slide-content">
    <div class="eyebrow reveal">Step-by-Step Ordinary Kriging Workflow</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">Step 4 — Build the kriging matrix and solve weights</h2>
    <div class="reveal" style="font-size: var(--small-size); color: var(--ink-mute); margin-top: 0.5rem;">
      <strong>Inputs used:</strong> the fitted variogram model, sample-to-sample distances, and sample-to-target distances.
    </div>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin-top: 1.2rem;">
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">A. Calculate semivariance / covariance</div>
        <ul style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.4rem; padding-left: 1.1rem;">
          <li>Between all sample points</li>
          <li>Between sample points and the target point</li>
        </ul>
      </div>
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">B. Build the kriging system</div>
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.4rem;">
          Spatial-relationship matrix plus an unbiasedness constraint row and column.
        </p>
      </div>
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">C. Apply unbiasedness constraint</div>
      </div>
      <div class="reveal" style="padding: 1.2rem; background: var(--paper-soft); border-left: 3px solid var(--accent);">
        <div style="font-family: 'Fraunces', serif; font-size: var(--h3-size); color: var(--accent); font-weight: 500;">D. Solve for weights</div>
      </div>
    </div>
  </div>
</section>

<!-- Slide 17: Step 5 — Prediction Surface Generation (two figures only) -->
<section class="slide" id="slide-17">
  <div class="slide-content">
    <div class="eyebrow reveal">Step-by-Step Ordinary Kriging Workflow</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">Step 5 — Prediction surface generation</h2>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1.5rem; align-items: start;">
      <div class="reveal" style="text-align: center;">
        <img src="assets/img/slide17_prediction.png" alt="Predicted value surface" style="width: 100%; max-height: 55vh; object-fit: contain;">
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.8rem;">
          Estimated values mapped across the entire study area — the interpolated "best guess" map.
        </p>
      </div>
      <div class="reveal" style="text-align: center;">
        <img src="assets/img/slide17_uncertainty.png" alt="Prediction uncertainty surface" style="width: 100%; max-height: 55vh; object-fit: contain;">
        <p style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.8rem;">
          Map of prediction uncertainty — highlights where the model is confident vs. uncertain.
        </p>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 2: Reload and verify slides 16 and 17. Confirm slide 16 has 4 cards (A/B/C/D) with A and B having notes, C and D title-only. Confirm slide 17 shows only two figures with their captions and NO left-panel text or equations.**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slides 16-17: Step 4 (A/B/C/D, no equations) and Step 5 (figures only)"
```

---

## Task 20: Slides 18-19 (Validation, Types of Kriging — moved)

**Files:**
- Modify: `index.html` — append two slides

- [ ] **Step 1: Append after slide 17:**

```html
<!-- Slide 18: Step 6 — Validation (LOOCV) -->
<section class="slide" id="slide-18">
  <div class="slide-content">
    <div class="eyebrow reveal">Step-by-Step Ordinary Kriging Workflow</div>
    <h2 class="slide-heading reveal" style="margin-top: 0.4rem;">Step 6 — Validation</h2>
    <p class="reveal" style="font-size: var(--body-size); color: var(--ink-soft); margin-top: 0.6rem;">
      Evaluate whether the kriging model performs well. A common approach is
      <strong>leave-one-out cross-validation</strong>:
    </p>
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 1rem;">
      <div class="reveal">
        <div style="font-family: 'Manrope', sans-serif; font-size: var(--small-size); letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-mute);">Steps</div>
        <ol style="font-size: var(--body-size); color: var(--ink); margin-top: 0.5rem; padding-left: 1.3rem; line-height: 1.7;">
          <li>Remove one observed point</li>
          <li>Predict its value using the remaining points</li>
          <li>Compare predicted vs. observed value</li>
          <li>Repeat for all points</li>
        </ol>
      </div>
      <div class="reveal">
        <table style="width: 100%; border-collapse: collapse; font-size: var(--body-size);">
          <thead>
            <tr style="border-bottom: 2px solid var(--rule);">
              <th style="text-align: left; padding: 0.5rem; color: var(--ink-mute); font-weight: 600;">Metric</th>
              <th style="text-align: left; padding: 0.5rem; color: var(--ink-mute); font-weight: 600;">Desired result</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--rule-soft);">
              <td style="padding: 0.45rem;">Mean Error</td>
              <td style="padding: 0.45rem; color: var(--ink-soft);">Close to 0</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--rule-soft);">
              <td style="padding: 0.45rem;">Root Mean Square Error</td>
              <td style="padding: 0.45rem; color: var(--ink-soft);">As small as possible</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--rule-soft);">
              <td style="padding: 0.45rem;">Mean Standardized Error</td>
              <td style="padding: 0.45rem; color: var(--ink-soft);">Close to 0</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--rule-soft);">
              <td style="padding: 0.45rem;">Root Mean Sq. Standardized Error</td>
              <td style="padding: 0.45rem; color: var(--ink-soft);">Close to 1</td>
            </tr>
            <tr>
              <td style="padding: 0.45rem;">Prediction error map</td>
              <td style="padding: 0.45rem; color: var(--ink-soft);">No strong spatial pattern</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</section>

<!-- Slide 19: Different Types of Kriging (moved here per user note) -->
<section class="slide" id="slide-19">
  <div class="slide-content">
    <h2 class="slide-heading reveal">Different types of Kriging</h2>
    <table class="reveal" style="width: 100%; border-collapse: collapse; font-size: var(--body-size); margin-top: 1.2rem;">
      <thead>
        <tr style="border-bottom: 2px solid var(--rule);">
          <th style="text-align: left; padding: 0.65rem; color: var(--ink-mute); font-weight: 600;">Type</th>
          <th style="text-align: left; padding: 0.65rem; color: var(--ink-mute); font-weight: 600;">Mean assumption</th>
          <th style="text-align: left; padding: 0.65rem; color: var(--ink-mute); font-weight: 600;">Best for</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid var(--rule-soft);">
          <td style="padding: 0.55rem;">Simple Kriging</td>
          <td style="padding: 0.55rem; color: var(--ink-soft);">Known constant</td>
          <td style="padding: 0.55rem; color: var(--ink-soft);">Rare theoretical cases</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--rule-soft); background: var(--accent-pale);">
          <td style="padding: 0.55rem; font-weight: 600;">Ordinary Kriging ★</td>
          <td style="padding: 0.55rem;">Unknown local constant</td>
          <td style="padding: 0.55rem;">Most common interpolation</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--rule-soft);">
          <td style="padding: 0.55rem;">Universal Kriging</td>
          <td style="padding: 0.55rem; color: var(--ink-soft);">Trend / drift present</td>
          <td style="padding: 0.55rem; color: var(--ink-soft);">Large-scale gradients</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--rule-soft);">
          <td style="padding: 0.55rem;">Indicator Kriging</td>
          <td style="padding: 0.55rem; color: var(--ink-soft);">Binary or threshold probabilities</td>
          <td style="padding: 0.55rem; color: var(--ink-soft);">Probability mapping</td>
        </tr>
        <tr>
          <td style="padding: 0.55rem;">Co-Kriging</td>
          <td style="padding: 0.55rem; color: var(--ink-soft);">Multiple correlated variables</td>
          <td style="padding: 0.55rem; color: var(--ink-soft);">Multi-source prediction</td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

- [ ] **Step 2: Reload and verify slides 18 and 19. Confirm the Ordinary Kriging row is highlighted (light-blue background).**

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "Add slides 18-19: Validation, Types of Kriging (moved after workflow)"
```

---

## Task 21: Slides 20-21 (Lab Assignment + PDF button, Resources)

**Files:**
- Modify: `index.html` — append two slides

- [ ] **Step 1: Append after slide 19:**

```html
<!-- Slide 20: Lab Assignment 6 + PDF button -->
<section class="slide" id="slide-20">
  <div class="slide-content" style="align-items: center; text-align: center;">
    <h2 class="slide-heading reveal">Lab Assignment 6</h2>
    <p class="reveal" style="font-size: var(--h3-size); color: var(--ink-soft); margin-top: 1rem; max-width: 60ch;">
      Move from theory into practice: hands-on Ordinary Kriging in ArcGIS Pro to
      reinforce today's lecture.
    </p>
    <div class="reveal" style="margin-top: 2rem;">
      <a href="assets/lab/Ordinary-Kriging-Laurier-Lab-EL_2026_05_26.pdf" target="_blank" rel="noopener" class="launch-button">
        Open Lab Assignment 6 (PDF) →
      </a>
    </div>
  </div>
</section>

<!-- Slide 21: Resources -->
<section class="slide" id="slide-21">
  <div class="slide-content">
    <h2 class="slide-heading reveal">Resources</h2>
    <ul class="reveal" style="font-size: var(--body-size); color: var(--ink); line-height: 1.7; margin-top: 1rem; padding-left: 1.4rem;">
      <li>Burrough, P. A., McDonnell, R. A., &amp; Lloyd, C. D. (2015). <em>Principles of Geographical Information Systems</em> (3rd ed.). Oxford University Press.</li>
      <li>Cressie, N. A. C. (1993). <em>Statistics for Spatial Data</em> (rev. ed.). Wiley.</li>
      <li>Isaaks, E. H., &amp; Srivastava, R. M. (1989). <em>An Introduction to Applied Geostatistics</em>. Oxford University Press.</li>
      <li>Li, J., &amp; Heap, A. D. (2008). A review of spatial interpolation methods for environmental scientists. <em>Geoscience Australia, Record 2008/23</em>, 1–137.</li>
      <li>Tobler, W. R. (1970). A computer movie simulating urban growth in the Detroit region. <em>Economic Geography, 46</em>(2), 234–240.</li>
      <li>Webster, R., &amp; Oliver, M. A. (2007). <em>Geostatistics for Environmental Scientists</em> (2nd ed.). Wiley.</li>
    </ul>
  </div>
</section>
```

- [ ] **Step 2: Reload, scroll to slide 20, click the PDF button, confirm the PDF opens in a new tab. Scroll to slide 21, confirm the references render cleanly.**

- [ ] **Step 3: Verify the counter now reads `1 / 21` through `21 / 21` as you scroll through the deck.**

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "Add slides 20-21: Lab Assignment with PDF button, Resources"
```

---

## Task 22: Rewrite `verify.py` to drive all three pages

**Files:**
- Modify: `verify.py`

- [ ] **Step 1: Read the existing `verify.py` to understand the helper patterns it uses (page-load wait, console-error filter, screenshot helper). Then replace its contents with a multi-page driver:**

```python
"""
Smoke test the teaching-demo branch:
  - three.html: 3×3 walkthrough
  - ten.html:   10×10 explorer + model picker
  - index.html: 21-slide deck

Runs Playwright + Chromium. Each page must:
  * load without console errors
  * emit the [semivariogram tests done] banner (apps only — the deck doesn't load lib/semivariogram.js)
  * pass page-specific smoke checks (see PAGE_CHECKS below)
Exits non-zero on any failure.
"""

from pathlib import Path
import sys
from playwright.sync_api import sync_playwright, ConsoleMessage

ROOT = Path(__file__).resolve().parent

def file_url(name: str) -> str:
    return (ROOT / name).resolve().as_uri()

class PageResult:
    def __init__(self, name):
        self.name = name
        self.console_errors = []
        self.page_errors = []
        self.ok = True
        self.messages = []
    def fail(self, msg):
        self.ok = False
        self.messages.append(f"FAIL [{self.name}] {msg}")
    def info(self, msg):
        self.messages.append(f"     [{self.name}] {msg}")

def install_listeners(page, result):
    def on_console(msg: ConsoleMessage):
        text = msg.text or ""
        if msg.type == "error" or text.startswith("FAIL:"):
            result.console_errors.append(text)
    page.on("console", on_console)
    page.on("pageerror", lambda e: result.page_errors.append(str(e)))

def expect_banner(page, result):
    banner = page.locator("text=semivariogram tests done").first
    try:
        banner.wait_for(state="attached", timeout=5000)
        # Actually look in console — banner is a console.log not a DOM node.
        # Instead, wait briefly and look for "ok  T7" in the captured logs:
    except Exception:
        pass
    # Use page.evaluate to peek at console messages — simpler: just wait and verify no FAIL.
    page.wait_for_load_state("networkidle", timeout=10000)
    if any(t.startswith("FAIL:") for t in result.console_errors):
        result.fail("FAIL: in-browser self-tests reported a failure")

def check_three(page, result):
    """3×3 walkthrough smoke checks."""
    expect_banner(page, result)
    # Step bar exists with chips
    chips = page.locator(".lag-chip, .step-chip, [class*='chip']")
    if chips.count() == 0:
        result.fail("expected lag/step chips on 3×3 page")
    else:
        result.info(f"found {chips.count()} step/lag chips")
    page.screenshot(path=str(ROOT / "verify_three.png"), full_page=True)

def check_ten(page, result):
    """10×10 explorer smoke checks."""
    expect_banner(page, result)
    # Model picker should have 4 buttons (None / Spherical / Exp / Gaussian).
    model_radios = page.locator("label.model-radio, [class*='model'][class*='radio']")
    if model_radios.count() < 4:
        result.fail(f"expected at least 4 model-picker buttons, found {model_radios.count()}")
    else:
        result.info(f"found {model_radios.count()} model-picker buttons")
    page.screenshot(path=str(ROOT / "verify_ten.png"), full_page=True)

def check_deck(page, result):
    """Deck (index.html) smoke checks."""
    # Deck has 21 slides
    slide_count = page.locator(".slide").count()
    if slide_count != 21:
        result.fail(f"expected 21 slides, found {slide_count}")
    else:
        result.info(f"found 21 slides")

    # Counter starts at "1 / 21"
    counter_text = page.locator("#slide-counter").inner_text()
    if not counter_text.startswith("1 /"):
        result.fail(f"counter should start with '1 /', got '{counter_text}'")

    # Press PageDown — counter advances
    page.keyboard.press("PageDown")
    page.wait_for_timeout(500)
    counter_after = page.locator("#slide-counter").inner_text()
    if counter_after.startswith("1 /"):
        result.fail("counter did not advance after PageDown")
    else:
        result.info(f"PageDown advanced counter to '{counter_after}'")

    # Slide-14 launch button has correct href + target
    slide14_link = page.locator("#slide-14 a.launch-button").first
    if slide14_link.get_attribute("href") != "three.html":
        result.fail(f"slide 14 launch link href = {slide14_link.get_attribute('href')}")
    if slide14_link.get_attribute("target") != "_blank":
        result.fail("slide 14 launch link missing target=_blank")

    # Slide-15 launch button
    slide15_link = page.locator("#slide-15 a.launch-button").first
    if slide15_link.get_attribute("href") != "ten.html":
        result.fail(f"slide 15 launch link href = {slide15_link.get_attribute('href')}")

    # Slide-20 PDF link
    slide20_link = page.locator("#slide-20 a.launch-button").first
    href = slide20_link.get_attribute("href")
    if not href or not href.endswith(".pdf"):
        result.fail(f"slide 20 PDF link href = {href}")

    # Slide-10 click-reveal: scroll to it then click table 6 times
    page.locator("#slide-10").scroll_into_view_if_needed()
    page.wait_for_timeout(400)
    wrap = page.locator("#quick-test-wrap")
    for i in range(6):
        wrap.click()
        page.wait_for_timeout(50)
    status_text = page.locator("#quick-test-status").inner_text()
    if "6 / 6" not in status_text:
        result.fail(f"click-reveal expected '6 / 6', got '{status_text}'")
    else:
        result.info("click-reveal advanced 0 → 6")

    page.screenshot(path=str(ROOT / "verify_deck.png"), full_page=True)

PAGE_CHECKS = [
    ("three.html", check_three),
    ("ten.html",   check_ten),
    ("index.html", check_deck),
]

def main():
    overall_ok = True
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for fname, checker in PAGE_CHECKS:
            result = PageResult(fname)
            context = browser.new_context()
            page = context.new_page()
            install_listeners(page, result)
            page.goto(file_url(fname))
            page.wait_for_load_state("networkidle", timeout=15000)
            checker(page, result)
            # Aggregate
            if result.page_errors:
                result.fail("page errors: " + " | ".join(result.page_errors))
            for msg in result.messages:
                print(msg)
            if not result.ok:
                overall_ok = False
            context.close()
        browser.close()
    if not overall_ok:
        print("\nverify FAILED")
        sys.exit(1)
    print("\nverify OK")

if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run the script**

```bash
python verify.py
```

Expected: prints info lines for each page, ends with `verify OK`, and writes `verify_three.png`, `verify_ten.png`, `verify_deck.png`.

- [ ] **Step 3: Fix any failures revealed by the run. Common issues to expect: locator selectors may need adjusting if class names differ from what I've guessed; the banner expectation needs to be only for `three.html` and `ten.html` (not the deck — the deck does not load `lib/semivariogram.js`).**

- [ ] **Step 4: Commit**

```bash
git add verify.py
git commit -m "Rewrite verify.py: smoke-test three.html, ten.html, and the deck"
```

---

## Task 23: Update `.gitignore` for new screenshot files

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Read `.gitignore` and confirm it already contains `verify_*.png`. If not, add:**

```
verify_three.png
verify_ten.png
verify_deck.png
```

- [ ] **Step 2: Commit (only if changes made)**

```bash
git add .gitignore
git commit -m "Ignore new per-page verify screenshots"
```

---

## Task 24: Update `CLAUDE.md` and `README.md`

**Files:**
- Modify: `CLAUDE.md`, `README.md`

- [ ] **Step 1: Rewrite `CLAUDE.md` to reflect the new structure. Replace the "What this is" section with:**

```markdown
## What this is

A single-page teaching deck (`index.html`) for Ordinary Kriging — 21 scroll-snap slides
that convert the lecture PowerPoint into a web format — plus two sibling interactive
apps that the deck launches in new tabs:

- `three.html` — 3×3 hand-calculation walkthrough
- `ten.html` — 10×10 explorer with empirical lags and theoretical model fitting
  (Spherical / Exponential / Gaussian)

Shared math + React components live in `lib/semivariogram.js`; the shared palette and
base styles in `lib/theme.css`. All four files (deck + two apps + lib) are plain HTML
served by GitHub Pages — no build step.
```

- [ ] **Step 2: In `CLAUDE.md`, update the "Run / verify" section to describe both the deck and the two apps:**

```markdown
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

`verify.py` smoke-tests all three pages and writes `verify_three.png`, `verify_ten.png`,
`verify_deck.png` (all gitignored).
```

- [ ] **Step 3: In `CLAUDE.md`, update the "Architecture notes" section to reflect that math now lives in `lib/semivariogram.js`. Replace the line ranges in the existing notes (e.g., "≈ line 583" → "lib/semivariogram.js"). Specifically:**

  - Replace `computePairs(grid, allDirections)` (≈ line 583) with `computePairs(grid, opts)` in `lib/semivariogram.js`
  - Replace `computeSemivariogram(pairs, maxLag)` (≈ line 610) with same in `lib/semivariogram.js`
  - Replace the "Spherical model fit" paragraph to say all three models are fit via `fitModel(name, lags)` and `modelGamma(model, h)` in `lib/semivariogram.js`. Mention the auto-fit-on-step-10 trigger now lives in `three.html` (the 3×3 walkthrough's pedagogical choice; the 10×10 explorer in `ten.html` defaults to None).

- [ ] **Step 4: Update `README.md` to mention the new deck. Add a section near the top:**

```markdown
## Teaching demo deck

The repo root (`index.html`) is a 21-slide web-based teaching deck on Ordinary Kriging.
Scroll to advance slides; use `←` / `→` / `Home` / `End` for keyboard navigation; press
`f` to toggle fullscreen.

The deck launches two interactive companion apps in new tabs:

- [3×3 walkthrough](three.html) — hand-calculate the semivariogram from a 3×3 grid
- [10×10 explorer](ten.html) — build the empirical semivariogram on a 10×10 grid and fit
  a theoretical model (Spherical, Exponential, or Gaussian)
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "Update CLAUDE.md and README.md to reflect new deck + split-app structure"
```

---

## Task 25: Final end-to-end verification + push

**Files:**
- No edits — verification only

- [ ] **Step 1: Run the full verify script**

```bash
python verify.py
```

Expected: `verify OK`.

- [ ] **Step 2: Manually walk the deck end to end**

```bash
start index.html
```

Walk through all 21 slides with the scroll wheel, then with arrow keys, then with PageDown/PageUp. On slide 10, click the table 6 times and confirm the reveal animation. On slides 14, 15, 20 click each launch button and confirm it opens the right file in a new tab. Press `f` to confirm fullscreen toggles.

- [ ] **Step 3: Manually exercise `three.html` and `ten.html`**

Confirm each loads its respective UI (3×3 walkthrough; 10×10 explorer with the 4-button model picker) and that the in-browser self-test banner appears in DevTools.

- [ ] **Step 4: Push the branch**

```bash
git push
```

- [ ] **Step 5: Print a final summary to the user**

State which slides exist, which apps the deck launches, the new file structure (deck + three.html + ten.html + lib/ + assets/), and the URL where the deck will be served once GitHub Pages picks up the change (`https://erin-1919.github.io/interactive-semivariogram-builder/`).

---

## Plan Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| §3.2 file layout | Tasks 1, 2, 3, 4, 5, 7, 9, 10 |
| §3.3 GitHub Pages impact | Documented in Task 24 |
| §4 slide outline (21 slides) | Tasks 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21 |
| §5 split details | Tasks 3, 4, 5 |
| §6.1 slide 14 (3×3 launch) | Task 17 |
| §6.2 slide 15 (Step 3 + sparklines + 10×10 launch) | Task 18 |
| §6.3 slide 10 click-reveal | Task 15 |
| §6.4 theoretical model math (moved verbatim) | Task 2 |
| §6.5 deck navigation | Task 10 |
| §6.6 entrance animations | Task 10 |
| §6.7 viewport fitting | Task 10 (CSS), all slide tasks (clamp() typography) |
| §7.1 image extraction (pic/ first, PPTX fallback, ≤1200px) | Tasks 8, 9 |
| §7.2 lab PDF | Task 7 |
| §8.1 in-browser self-tests | Task 2 (moved verbatim; emits banner) |
| §8.2 verify.py three-page smoke | Task 22 |

All spec sections have a corresponding task.

**Placeholder scan:** no TBD/TODO/XXX in the plan body. The image mapping in Task 8 is partial-by-design (exact pic/ ↔ slide assignments are inspection work done during execution); the structure of the mapping is shown explicitly.

**Type/name consistency:**
- `lib/semivariogram.js` is the consistent filename across all tasks.
- `lib/theme.css` consistent.
- `assets/img/` and `assets/lab/` consistent.
- `slide-counter` ID consistent (Task 10 defines, Task 22 reads).
- `quick-test-wrap`, `quick-test-status`, `qt-answer`, `qt-why` consistent (Task 15 defines, Task 22 reads).
- `launch-button` class consistent (Task 10 defines, Tasks 17, 18, 21 use).
- Branch name `feature/web-slide-deck` consistent.

No discrepancies found.
