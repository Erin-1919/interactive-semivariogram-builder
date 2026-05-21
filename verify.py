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
        # Both modes are always mounted (display toggled via style) so that
        # per-mode state survives mode switches.  We use :visible on HTML
        # elements (step-item, tab, radio) to restrict counts to the active
        # pane; SVG elements (pair-line, plot-point, cell-rect) are checked
        # without :visible because the hidden pane starts with 0 of them.
        three_btn = page.locator(".mode-selector button", has_text="3×3 Guided Demo")
        ten_btn = page.locator(".mode-selector button", has_text="10×10 Exploration")
        assert "active" in (three_btn.get_attribute("class") or ""), "3x3 should be active by default"

        step_items = page.locator(".step-bar .step-item:visible")
        assert step_items.count() == 10, f"Expected 10 steps in 3x3 mode, got {step_items.count()}"
        print("3x3 step bar has 10 items: OK")

        # 2. Click the h = 1 toggle and advance a few steps.
        # pair-line elements are SVG <line>s whose zero-height bounding rect
        # makes Playwright's :visible filter exclude them even when drawn.
        # The 10x10 pane starts with revealedCount=0 so it has 0 pair-lines;
        # all pair-lines found here belong to the 3x3 grid.
        page.locator(".toggle-btn", has_text="h = 1").click()
        page.keyboard.press("ArrowRight")
        page.keyboard.press("ArrowRight")
        page.wait_for_timeout(200)
        pair_lines = page.locator(".pair-line").count()
        assert pair_lines > 0, "Expected pair lines once step >= 3"
        print(f"3x3 pair lines drawn at step 3+: {pair_lines}")

        # 3. Step all the way to 8 and confirm a plot point appeared.
        # After 6 more ArrowRight presses from step 4 we reach step 10.
        # Step 8 already reveals the first lag on the plot.
        # plot-point is an SVG <circle>; same :visible limitation applies.
        # The 10x10 pane starts with revealedCount=0 so it has 0 plot-points.
        for _ in range(6):
            page.keyboard.press("ArrowRight")
        page.wait_for_timeout(200)
        # Switch to plot tab in case auto-flip already did it
        page.locator(".tab:visible", has_text="Semivariogram plot").first.click()
        page.wait_for_timeout(200)
        plot_points = page.locator(".plot-point").count()
        assert plot_points >= 1, "Expected at least one plot point by step 8"
        print(f"3x3 plot points after stepping to 8+: {plot_points}")

        # 4. Edit the top-left cell to a wild value; γ should change.
        # cell-rect is an SVG <rect>; only the 3x3 grid has been edited.
        page.locator(".cell-rect").first.click()
        page.wait_for_timeout(200)
        page.keyboard.press("Control+A")
        page.keyboard.type("99")
        page.keyboard.press("Enter")
        page.wait_for_timeout(300)
        edited_count = page.locator(".cell-rect.edited").count()
        assert edited_count == 1, f"Expected 1 edited cell, got {edited_count}"
        print("3x3 edit ring rendered on edited cell")

        # 5. Switch to 10x10 mode.
        # At step 10, the 3x3 pane renders a 3-radio model picker (spherical/
        # exponential/gaussian, no "none").  When hidden, :visible excludes it,
        # leaving only the 4 radios (none+three models) in the 10x10 pane.
        ten_btn.click()
        page.wait_for_timeout(300)
        ten_steps = page.locator(".step-bar .step-item:visible")
        assert ten_steps.count() == 5, f"Expected 5 steps in 10x10 mode, got {ten_steps.count()}"
        chips = page.locator(".lag-chip:visible")
        assert chips.count() > 0, "Expected lag chips in 10x10 mode"
        print(f"10x10 step bar has 5 items and {chips.count()} lag chips: OK")

        # 6. Model radio is present (none/spherical/exponential/gaussian)
        radios = page.locator(".model-radio input[type=radio]:visible")
        assert radios.count() == 4, f"Expected 4 model radios, got {radios.count()}"
        print("10x10 model radio has none/spherical/exponential/gaussian")

        # 7. Toggle Predict at unknown — Prediction tab appears
        page.locator(".model-toggle-label", has_text="Predict at an unknown cell").locator(".model-toggle").check()
        page.wait_for_timeout(300)
        predict_tab = page.locator(".tab:visible", has_text="Prediction")
        assert predict_tab.count() == 1, "Expected Prediction tab to appear"
        predict_panel = page.locator(".predict-panel")
        assert predict_panel.count() == 1, "Expected PredictionPanel to render"
        zhat_visible = page.locator(".predict-panel .zhat").inner_text()
        assert "ẑ" in zhat_visible, f"Expected ẑ in prediction panel, got: {zhat_visible}"
        print(f"10x10 prediction panel rendered: {zhat_visible.replace(chr(10), ' ')}")

        # 8. Reveal-all snapshot — for the gallery
        page.locator(".model-toggle-label", has_text="Predict at an unknown cell").locator(".model-toggle").uncheck()
        page.wait_for_timeout(200)
        for chip in page.locator(".lag-chip:visible").all():
            chip.click()
        page.locator(".model-radio input[value=spherical]:visible").check()
        page.wait_for_timeout(300)
        page.locator(".tab:visible", has_text="Semivariogram plot").first.click()
        page.wait_for_timeout(200)
        model_curve = page.locator(".model-curve").count()
        assert model_curve >= 1, "Expected the spherical curve to be drawn"

        page.screenshot(path=str(Path(__file__).parent / "verify_full.png"), full_page=True)
        print("Saved verify_full.png")

        browser.close()

    if errors or any("FAIL" in m[1] for m in console_messages):
        sys.exit(1)

if __name__ == "__main__":
    main()
