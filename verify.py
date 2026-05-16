"""Verify the semivariogram builder loads, renders, and hover works."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import sys
sys.stdout.reconfigure(encoding="utf-8")

HTML = Path(__file__).parent / "index.html"
URL = HTML.absolute().as_uri()

console_messages = []
errors = []

def on_console(msg):
    console_messages.append((msg.type, msg.text))

def on_pageerror(err):
    errors.append(str(err))

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1700, "height": 1100})
    page = context.new_page()
    page.on("console", on_console)
    page.on("pageerror", on_pageerror)

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

    tests_done = any("[semivariogram tests done]" in m[1] for m in console_messages)
    print("Self-tests banner present:", tests_done)

    panel_titles = page.locator(".panel-title").all_inner_texts()
    print("Panel titles:", panel_titles)

    # Reveal h=1 via Next, then test hover
    page.locator(".step-btn.primary").click()
    page.wait_for_timeout(200)

    pair_lines_full = page.locator(".pair-line").count()
    print("Pair lines at h=1 (full lag):", pair_lines_full)

    # Hover over center cell — should fade most of the grid
    grid_svg = page.locator(".grid-svg")
    box = grid_svg.bounding_box()
    # Target row 4, col 4 area (a known cell)
    cx = box["x"] + box["width"] / 2
    cy = box["y"] + box["height"] / 2
    page.mouse.move(cx, cy)
    page.wait_for_timeout(300)

    pair_lines_hover = page.locator(".pair-line").count()
    faded_count = page.locator(".cell-group.faded").count()
    print("Pair lines while hovering center:", pair_lines_hover)
    print("Faded cells during hover:", faded_count)

    # Take a screenshot showing hover state
    page.screenshot(path=str(Path(__file__).parent / "verify_hover.png"), full_page=True)

    # Move mouse away to clear hover
    page.mouse.move(10, 10)
    page.wait_for_timeout(200)

    # Take a clean screenshot of the redesigned page
    page.screenshot(path=str(Path(__file__).parent / "verify_screenshot.png"), full_page=True)

    # Reveal ALL lags by clicking the last chip
    chips = page.locator(".lag-chip").all()
    last_chip = chips[-1]
    last_chip.click()
    page.wait_for_timeout(300)
    visible_pts = page.locator(".plot-point").count()
    print("Plot points after revealing all:", visible_pts)

    # Now extract semivariance values by reading the SVG text labels on plot points (selected)
    # And tabulate (h, γ) by stepping back through chips
    print("\nAll-directions empirical semivariogram (smooth preset):")
    for chip in chips:
        chip.click()
        page.wait_for_timeout(100)
        h_text = page.locator(".summary-line .val").nth(0).inner_text()
        g_text = page.locator(".summary-line .val.big").inner_text()
        n_text = page.locator(".summary-line .val").nth(1).inner_text()
        print(f"  {h_text:18s}  {n_text:14s}  {g_text}")

    page.locator(".model-toggle").check()
    page.wait_for_timeout(200)
    model_present = page.locator(".model-curve").count()
    print("Model curve present:", model_present)

    page.screenshot(path=str(Path(__file__).parent / "verify_full.png"), full_page=True)

    browser.close()

if errors or any("FAIL" in m[1] for m in console_messages):
    sys.exit(1)
