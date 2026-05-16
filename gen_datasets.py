"""Generate three 10x10 deterministic datasets that produce semivariograms
with the desired shapes (rise + sill, flat, irregular)."""
import numpy as np

SIZE = 10

def gauss_smooth(noise, sigma):
    k = int(np.ceil(3 * sigma))
    y, x = np.mgrid[-k:k+1, -k:k+1]
    kernel = np.exp(-(x**2 + y**2) / (2 * sigma**2))
    kernel /= kernel.sum()
    padded = np.pad(noise, k, mode='reflect')
    out = np.zeros_like(noise, dtype=float)
    for i in range(noise.shape[0]):
        for j in range(noise.shape[1]):
            out[i, j] = np.sum(padded[i:i+2*k+1, j:j+2*k+1] * kernel)
    return out

def smooth_dataset(seed=3, sigma=1.1, base=18, amp=16):
    """Short-range correlated field: plateau visible by h ~ 4-5."""
    rng = np.random.default_rng(seed)
    noise = rng.standard_normal((SIZE, SIZE))
    s = gauss_smooth(noise, sigma)
    s = (s - s.min()) / (s.max() - s.min() + 1e-9)
    return np.round(base + amp * s).astype(int)

def random_dataset(seed=7, low=12, high=34):
    rng = np.random.default_rng(seed)
    return rng.integers(low, high + 1, size=(SIZE, SIZE))

def clustered_dataset(seed=23):
    """Four alternating patches: gamma rises sharply then plateaus around h ~ 4."""
    rng = np.random.default_rng(seed)
    centers = [
        (1, 1, 30, 1.4),
        (1, 8, 14, 1.4),
        (8, 1, 14, 1.4),
        (8, 8, 30, 1.4),
    ]
    out = np.zeros((SIZE, SIZE), dtype=float)
    for r in range(SIZE):
        for c in range(SIZE):
            weights, vals = [], []
            for (cr, cc, cv, sigma) in centers:
                d2 = (r - cr) ** 2 + (c - cc) ** 2
                w = np.exp(-d2 / (2 * sigma ** 2)) + 1e-6
                weights.append(w)
                vals.append(cv)
            out[r, c] = np.average(vals, weights=weights) + rng.normal(0, 0.6)
    return np.round(out).astype(int)

def gamma_at(grid, h_target, tol=0.5):
    pairs = []
    for r1 in range(SIZE):
        for c1 in range(SIZE):
            if grid[r1][c1] is None: continue
            for r2 in range(SIZE):
                for c2 in range(SIZE):
                    if (r1, c1) >= (r2, c2): continue
                    if grid[r2][c2] is None: continue
                    d = ((r1-r2)**2 + (c1-c2)**2) ** 0.5
                    if abs(d - h_target) <= tol:
                        pairs.append((grid[r1][c1] - grid[r2][c2]) ** 2)
    if not pairs: return None, 0
    return sum(pairs) / (2 * len(pairs)), len(pairs)

def place_unknowns(grid, positions):
    g = grid.tolist()
    for (r, c) in positions:
        g[r][c] = None
    return g

def fmt_js(grid):
    rows = []
    for row in grid:
        cells = ["null" if v is None else f"{v:>3}" for v in row]
        rows.append("      [" + ", ".join(cells) + "]")
    return "    [\n" + ",\n".join(rows) + "\n    ]"

# Generate
smooth = place_unknowns(smooth_dataset(), [(2, 5), (5, 7), (8, 2)])
random_ = place_unknowns(random_dataset(), [(3, 6), (7, 1), (4, 8)])
clustered = place_unknowns(clustered_dataset(), [(2, 6), (6, 3), (8, 8)])

# Diagnostic: print gamma at h=1, 3, 5, 7, 9 to verify shape
for name, g in [("smooth", smooth), ("random", random_), ("clustered", clustered)]:
    print(f"\n--- {name} ---")
    for h in [1, 2, 3, 4, 5, 6, 7, 8, 9]:
        gh, n = gamma_at(g, h, 0.5)
        print(f"  h={h}: gamma={gh:.2f} N={n}" if gh else f"  h={h}: (none)")
    print("\ngrid:")
    print(fmt_js(g))
