# Why-Distance App — Design

**Date:** 2026-05-22
**Status:** Approved for planning
**Author:** Mingke Li, with brainstorming assistance

## Purpose

Add a single new interactive web app, `why_distance.html`, launched from slide 5
("Why distance alone is not enough") of the Ordinary Kriging teaching deck. The
app reinforces the slide's existing four-scenario framing — barrier, geological
boundary, environmental gradient, directional anisotropy — by giving students a
**fixed-length "ruler"** they can translate and rotate over a synthetic field.
The pedagogical payoff: the ruler length never changes, but the value difference
between its endpoints swings wildly depending on where and how it is placed.

Distance-only spatial interpolation is therefore not enough.

The app must not foreshadow semivariance, semivariograms, or pair enumeration —
those concepts are introduced later in the lecture (slides 11–13). The vocabulary
on slide 5 is strictly "distance" and "value difference."

## Non-goals

- No semivariance, no γ(h), no pair-cloud scatter. The "variogram cloud" idea was
  considered and rejected because slide 5 precedes the introduction of those
  terms.
- No prediction, no interpolation method comparison, no IDW visualization. The
  app does not compute estimates — it only displays values at the ruler endpoints.
- No real-world geographic data. Each scenario uses a synthetic, closed-form
  `value(x, y)` so behavior is deterministic and testable.
- No build step. The app is a single static HTML file matching the existing
  sibling apps (`three.html`, `ten.html`).

## User flow

1. Student is on slide 5 of the deck. The slide now uses the side-by-side layout
   already established by slides 12 and 13: the existing four-panel image on the
   left, a short blurb plus a launch button on the right.
2. Student clicks **Launch why-distance explorer →**. The app opens in a new
   tab.
3. App opens on the first scenario tab (Barrier). A square field is rendered as
   a coarse grid of colored cells. A ruler is overlaid as a line segment with
   two endpoint dots and a midpoint handle.
4. Student drags the midpoint handle to translate the ruler, or drags either
   endpoint to rotate the ruler around its midpoint. The ruler length is locked.
5. A readout panel updates live: value at endpoint A, value at endpoint B,
   absolute difference |A − B|, the fixed distance (labelled in the scenario's
   units), and the current orientation angle.
6. Student clicks **Reveal explanation** to see one short sentence pinning the
   lesson for that scenario.
7. Student switches between the four scenario tabs and repeats. Across all four,
   the takeaway is the same: same distance, different difference.

## Architecture

### File layout

- **New:** `why_distance.html` at the repo root. Plain HTML, React via Babel
  CDN, no build step. Mirrors the structure of `three.html` and `ten.html`.
- **Modified:** `index.html` — slide 5 converted to side-by-side and wired with
  a launch button to `why_distance.html`.
- **Modified:** `verify.py` — adds a smoke test for the new app and a check that
  the launch button is wired on slide 5.

Shared math/components in `lib/semivariogram.js` are **not** touched. The new
app has no math overlap with semivariance, so duplication is not an issue. The
inline-copy quirk that affects `three.html`/`ten.html` does not apply here.

### Top-level component shape

A single root React component, `WhyDistanceApp`, holds three pieces of state:

- `scenario` — one of `"barrier" | "boundary" | "gradient" | "anisotropy"`.
- `ruler` — `{ cx, cy, angle }`, the midpoint position and rotation in field
  coordinates (0–1 normalized).
- `explanationOpen` — boolean, per-scenario disclosure of the lesson sentence.

Child components:

- `ScenarioTabs` — four buttons, drives `scenario` state.
- `FieldCanvas` — SVG element. Renders the field as a coarse grid of colored
  rectangles using the active scenario's `value(x, y)` function, then overlays
  the ruler. Handles pointer events on the midpoint handle (translate) and on
  each endpoint (rotate around midpoint).
- `ReadoutPanel` — displays endpoint values, |difference|, distance, angle.
- `ExplanationPanel` — collapsible single-sentence explanation for the active
  scenario.

### Field model

Each scenario defines a pure function `value(x, y) → number`, where `x, y ∈
[0, 1]`. The four implementations:

1. **Barrier** — two flat plateaus separated by a diagonal ridge line at
   `y = x`. One side ≈ 60, the other ≈ 20, with small deterministic noise
   (a low-amplitude sinusoid keyed off `x, y` so it is reproducible without
   needing a seeded RNG).
2. **Boundary** — two regions with a curved compositional split (e.g., a sine
   curve along the diagonal). One region ≈ 120, the other ≈ 500. Same shape of
   failure as Barrier, but framed in the explanation text as a change of
   underlying population rather than a physical block. Visually distinct from
   Barrier so students perceive them as separate scenarios.
3. **Gradient** — linear ramp along one axis: `value = 15 + 30 · x` (low at
   the left, high at the right), with light noise.
4. **Anisotropy** — smooth field with elongated structure: slow variation along
   `x`, fast variation along `y`. A workable form is
   `value = 45 + 15 · sin(2π · x) + 15 · sin(8π · y)`.

All four functions live in a small `scenarios` table at the top of the script,
keyed by the scenario id. Each entry carries:

- `value(x, y)` — the surface function.
- `label` — human-readable scenario name for the tab.
- `distanceLabel` — the scenario's display distance ("2 km", "500 m", "1 km",
  "1 km") for the readout. Purely cosmetic — the ruler is the same pixel
  length in every tab, per the user's preference.
- `explanation` — one short sentence revealed by the disclosure button.
- `colorRamp` — a two-or-three-stop color scheme used to map values to fill
  colors. Reuses CSS variables from `lib/theme.css` where possible.

### Field rendering

The field is drawn as a 20×20 grid of SVG `<rect>` elements. Each cell's fill
is computed by sampling `value(x, y)` at the cell centre and mapping through
the scenario's `colorRamp`. 20×20 is coarse on purpose — it matches the
`ten.html` aesthetic and keeps the visual register consistent with the rest of
the deck.

### Ruler

- Rendered as an SVG `<line>` plus three `<circle>` handles (two endpoints + a
  midpoint).
- Length is a fixed fraction of the field (e.g., 0.35 of the field side) for
  every scenario, so the ruler looks identical across tabs.
- Drag interactions use SVG pointer events with `setPointerCapture` for clean
  drag tracking. The midpoint handle translates the ruler; either endpoint
  rotates it around the midpoint.
- The ruler is clamped to keep both endpoints inside the field bounds — drag
  attempts that would push an endpoint outside are clipped to the boundary.

### Readout

Plain text panel showing:

- `A: <value>` (formatted to 1 decimal, units omitted — students infer from
  scenario context).
- `B: <value>`.
- `|A − B|: <value>`, emphasized — this is the number that should jump as the
  student moves the ruler.
- `Distance: <distanceLabel>` (constant per scenario, visually de-emphasized to
  reinforce that *it does not change*).
- `Orientation: <angle>°` (only shown for the Gradient and Anisotropy scenarios
  where rotation is pedagogically central; hidden for Barrier and Boundary
  where translation across the discontinuity is the lesson).

### Explanation panel

A collapsible region beneath the readout. Closed by default. Opens to show one
short sentence per scenario, e.g.:

- Barrier: "A physical barrier breaks spatial continuity — neighbours that look
  close on a map are effectively far apart."
- Boundary: "Across a geological boundary, the underlying population changes —
  distance no longer predicts similarity."
- Gradient: "When values change steadily across the landscape, two points the
  same distance apart can differ a lot or a little depending on direction."
- Anisotropy: "Spatial dependence can be stronger in one direction than
  another — orientation matters as much as distance."

## Slide 5 integration

The current slide 5 centers the four-panel image at full height. Adapt to
side-by-side layout:

- Left column (`flex: 1.2`): the existing `slide05_why_not.png`.
- Right column (`flex: 1`): a short blurb plus the launch button. The blurb is
  a single sentence reminding students that the four panels share one lesson,
  and inviting them to try it.

Pattern, classes, and button styling all match slide 12 and slide 13.

## Testing

### In-browser self-tests

On first load, the app runs a block of `console.log('ok', …)` /
`console.error('FAIL:', …)` assertions and emits `[why-distance tests done]`
when finished. This matches the contract `verify.py` already enforces for
`three.html` and `ten.html`.

Test coverage:

- For each scenario, two prescribed ruler placements — one expected to produce
  a large |A − B| and one expected to produce a small |A − B| — confirm the
  field functions behave as the lesson requires.
- Ruler length stays constant across translate and rotate operations
  (numerical check that the endpoint distance equals the configured ruler
  length within floating-point tolerance).
- Ruler clamping: an attempted drag that would push an endpoint outside the
  field bounds clips correctly.

### verify.py extensions

Add to the existing smoke test:

- Open `why_distance.html`, wait for `[why-distance tests done]` with no
  `FAIL:` lines, write `verify_why_distance.png`.
- On the deck check, assert slide 5 has an anchor pointing to
  `why_distance.html` and the deck still has 16 slides.

## Open questions

None at the time of writing. Outstanding design choices that were resolved
during brainstorming:

- Coarse 20×20 grid rendering, not smooth canvas heatmap.
- Same pixel length for the ruler in every scenario; scenario distance only
  appears as a text label in the readout.
- Barrier and Boundary are visually distinct (different boundary curve) but
  share the same pedagogical mechanism — that is intentional, mirroring the
  slide's framing.

## Out of scope for this spec

- The implementation plan itself, which `writing-plans` will produce next.
- Any change to `three.html`, `ten.html`, or `lib/semivariogram.js`.
- Updates to `CLAUDE.md` describing the new file and the new `verify.py`
  banner — these belong in the implementation plan, not the design.
