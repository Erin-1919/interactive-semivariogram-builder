"""
Smoke test the teaching-demo branch:
  - three.html: 3×3 walkthrough
  - ten.html:   10×10 explorer + model picker
  - index.html: 21-slide deck

Runs Playwright + Chromium. Apps must emit the [semivariogram tests done] banner
with no FAIL: lines. Deck must have 21 slides, a working counter, and the two
launch buttons + PDF button must be wired up correctly.

Writes verify_three.png, verify_ten.png, verify_deck.png. Exit non-zero on any failure.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import sys

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).parent

def file_url(name):
    return (ROOT / name).resolve().as_uri()

def check_three(page, errors, console):
    """3×3 walkthrough."""
    # Banner contract — confirm in-browser tests fired
    banner = any("[semivariogram tests done]" in t for _, t in console)
    if not banner:
        errors.append("three.html: missing [semivariogram tests done] banner")
    if any("FAIL" in t for _, t in console):
        errors.append("three.html: FAIL: lines in console")

    # 3×3 mode UI: lag toggle buttons (h=1, h=2) use class toggle-btn
    # (not lag-chip, which is the ten.html chip style)
    chips = page.locator(".toggle-btn")
    if chips.count() < 1:
        errors.append(f"three.html: expected at least one lag toggle button, got {chips.count()}")
    steps = page.locator(".step-bar .step-item")
    if steps.count() < 1:
        errors.append(f"three.html: expected step bar items, got {steps.count()}")
    page.screenshot(path=str(ROOT / "verify_three.png"), full_page=True)
    print(f"  three.html: {chips.count()} lag toggle buttons, {steps.count()} step items, banner={banner}")

def check_ten(page, errors, console):
    """10×10 explorer."""
    banner = any("[semivariogram tests done]" in t for _, t in console)
    if not banner:
        errors.append("ten.html: missing [semivariogram tests done] banner")
    if any("FAIL" in t for _, t in console):
        errors.append("ten.html: FAIL: lines in console")

    # Model picker has 4 radios
    radios = page.locator(".model-radio input[type=radio]")
    if radios.count() != 4:
        errors.append(f"ten.html: expected 4 model radios, got {radios.count()}")
    # Default model is "none" (checked)
    none_radio = page.locator(".model-radio input[type=radio][value=none]")
    if none_radio.count() == 1 and not none_radio.first.is_checked():
        errors.append("ten.html: model picker default should be 'none' (not checked)")
    # Lag chips and step bar exist
    chips = page.locator(".lag-chip")
    if chips.count() < 1:
        errors.append(f"ten.html: expected lag chips, got {chips.count()}")
    page.screenshot(path=str(ROOT / "verify_ten.png"), full_page=True)
    print(f"  ten.html: {radios.count()} model radios, {chips.count()} lag chips, banner={banner}")

def check_deck(page, errors, console):
    """21-slide deck (index.html)."""
    # Slide count
    slide_count = page.locator(".slide").count()
    if slide_count != 21:
        errors.append(f"index.html: expected 21 slides, got {slide_count}")

    # Counter starts at "1 / 21"
    counter_text = page.locator("#slide-counter").inner_text()
    if not counter_text.startswith("1 /"):
        errors.append(f"index.html: counter should start with '1 /', got '{counter_text}'")

    # Press PageDown — counter should advance
    page.keyboard.press("PageDown")
    page.wait_for_timeout(700)
    counter_after = page.locator("#slide-counter").inner_text()
    if counter_after.startswith("1 /"):
        errors.append(f"index.html: counter did not advance after PageDown (still '{counter_after}')")

    # Slide-14 launch link → three.html
    s14_link = page.locator("#slide-14 a.launch-button").first
    if s14_link.count() == 0:
        errors.append("index.html: slide 14 launch button missing")
    else:
        href = s14_link.get_attribute("href")
        target = s14_link.get_attribute("target")
        if href != "three.html":
            errors.append(f"index.html: slide 14 link href = {href!r}, expected 'three.html'")
        if target != "_blank":
            errors.append(f"index.html: slide 14 link target = {target!r}, expected '_blank'")

    # Slide-15 launch link → ten.html
    s15_link = page.locator("#slide-15 a.launch-button").first
    if s15_link.count() == 0:
        errors.append("index.html: slide 15 launch button missing")
    else:
        href = s15_link.get_attribute("href")
        if href != "ten.html":
            errors.append(f"index.html: slide 15 link href = {href!r}, expected 'ten.html'")

    # Slide-20 PDF link
    s20_link = page.locator("#slide-20 a.launch-button").first
    if s20_link.count() == 0:
        errors.append("index.html: slide 20 launch button missing")
    else:
        href = s20_link.get_attribute("href") or ""
        if not href.endswith(".pdf"):
            errors.append(f"index.html: slide 20 link href = {href!r}, expected to end with .pdf")

    # Slide-10 click-reveal: scroll to slide 10, click 6 times
    page.locator("#slide-10").scroll_into_view_if_needed()
    page.wait_for_timeout(500)
    wrap = page.locator("#quick-test-wrap")
    if wrap.count() == 0:
        errors.append("index.html: #quick-test-wrap missing on slide 10")
    else:
        for i in range(6):
            wrap.click()
            page.wait_for_timeout(80)
        status_text = page.locator("#quick-test-status").inner_text()
        if "6 / 6" not in status_text:
            errors.append(f"index.html: click-reveal final status = '{status_text}', expected to contain '6 / 6'")

    page.screenshot(path=str(ROOT / "verify_deck.png"), full_page=True)
    print(f"  index.html: {slide_count} slides, counter advanced past 1/21, all link checks done")

PAGE_CHECKS = [
    ("three.html", check_three),
    ("ten.html", check_ten),
    ("index.html", check_deck),
]

def main():
    overall_errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--allow-file-access-from-files", "--disable-web-security"],
        )
        for fname, checker in PAGE_CHECKS:
            print(f"checking {fname} ...")
            errors = []
            console = []
            context = browser.new_context(viewport={"width": 1700, "height": 1100})
            page = context.new_page()
            page.on("console", lambda m: console.append((m.type, m.text)))
            page.on("pageerror", lambda e: errors.append(f"{fname}: pageerror: {e}"))
            page.goto(file_url(fname))
            page.wait_for_timeout(2500)
            page.wait_for_load_state("networkidle", timeout=15000)
            checker(page, errors, console)
            for err in errors:
                print(f"  FAIL: {err}")
            overall_errors.extend(errors)
            context.close()
        browser.close()

    if overall_errors:
        print(f"\nverify FAILED with {len(overall_errors)} error(s)")
        sys.exit(1)
    print("\nverify OK")

if __name__ == "__main__":
    main()
