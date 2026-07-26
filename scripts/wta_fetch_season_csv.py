#!/usr/bin/env python3
"""Fetch WTA season CSVs from tennisdata.app with a human in the loop.

tennisdata.app gates every download behind a Cloudflare Turnstile check, so this
script does not try to download unattended. It opens the downloads page in a real
browser, picks the season for you, and then waits while you complete the check and
press "Download CSV". The download itself is captured straight into
``historic data_wta/_source/`` so nothing has to be moved by hand.

The browser profile is kept between runs, so the Cloudflare clearance usually
carries over and later runs are a single click.

Usage:
    python3 scripts/wta_fetch_season_csv.py 2025 2026
    python3 scripts/wta_fetch_season_csv.py 2026          # in-season refresh
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

DOWNLOADS_URL = "https://tennisdata.app/downloads/"
REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "historic data_wta" / "_source"
PROFILE_DIR = REPO_ROOT / "historic data_wta" / "_source" / ".browser-profile"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
)


def fetch_year(context, year: int, timeout_s: int) -> Path | None:
    """Drive one season download. Returns the saved path, or None if it timed out."""
    page = context.pages[0] if context.pages else context.new_page()
    page.goto(DOWNLOADS_URL, wait_until="domcontentloaded", timeout=90_000)

    # Sit through the Cloudflare interstitial if it appears.
    for _ in range(20):
        if "moment" not in page.title().lower():
            break
        page.wait_for_timeout(2_000)

    if "moment" in page.title().lower():
        print("  ! still on the Cloudflare check page; solve it in the browser", file=sys.stderr)

    try:
        page.select_option("#dl_wta_year", str(year))
    except Exception as exc:
        print(f"  ! could not select year {year}: {exc}", file=sys.stderr)
        return None

    # Put the window in front and park the view on the WTA download card.
    try:
        page.bring_to_front()
        page.locator("#dl_wta_btn").scroll_into_view_if_needed(timeout=5_000)
        page.evaluate(
            """() => {
              const btn = document.getElementById('dl_wta_btn');
              if (!btn) return;
              btn.style.outline = '4px solid #ff2d55';
              btn.style.outlineOffset = '3px';
            }"""
        )
    except Exception:
        pass

    print(f"  → Season set to {year}. The WTA download button is outlined in red.", flush=True)
    print('    In the browser: tick the "not a bot" box, then click "Download CSV".', flush=True)
    print(f"    Waiting up to {timeout_s}s…", flush=True)

    try:
        with page.expect_download(timeout=timeout_s * 1_000) as download_info:
            pass
        download = download_info.value
    except Exception:
        print(f"  ! no download detected for {year} within {timeout_s}s", file=sys.stderr)
        return None

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    target = SOURCE_DIR / f"{year}-wta-season.csv"
    download.save_as(target)
    size_mb = target.stat().st_size / (1024 * 1024)
    print(f"  ✓ saved {target.relative_to(REPO_ROOT)} ({size_mb:.1f} MB)")
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch WTA season CSVs from tennisdata.app.")
    parser.add_argument("years", nargs="+", type=int, help="Season years, e.g. 2025 2026")
    parser.add_argument(
        "--timeout",
        type=int,
        default=180,
        help="Seconds to wait for you to click Download for each season (default: 180)",
    )
    args = parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print(
            "playwright is required: pip install playwright && playwright install chromium",
            file=sys.stderr,
        )
        return 1

    PROFILE_DIR.mkdir(parents=True, exist_ok=True)
    saved: list[Path] = []

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR),
            headless=False,
            accept_downloads=True,
            user_agent=USER_AGENT,
            viewport={"width": 1400, "height": 1100},
            args=["--disable-blink-features=AutomationControlled"],
        )
        try:
            for year in args.years:
                print(f"[{year}]")
                path = fetch_year(context, year, args.timeout)
                if path:
                    saved.append(path)
        finally:
            context.close()

    if not saved:
        print("No files downloaded.", file=sys.stderr)
        return 1

    print(f"\nDownloaded {len(saved)} file(s) into {SOURCE_DIR.relative_to(REPO_ROOT)}/")
    print("Next: python3 scripts/wta_import_season_csv.py " + " ".join(str(y) for y in args.years))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
