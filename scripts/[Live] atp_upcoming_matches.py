#!/usr/bin/env python3
"""Fetch upcoming ATP singles matches from ATP schedule pages and print JSON."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from typing import Any, Dict, List

from atp_scores_common import (
    build_schedule_day_numbers,
    build_schedule_url,
    fetch_tour_tournaments,
    make_scraper,
    parse_upcoming_matches_from_schedule_page,
)


def _sort_key(match: Dict[str, Any]) -> str:
    return str(match.get("scheduled_time") or "")


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch upcoming ATP singles matches.")
    parser.add_argument("--days", type=int, default=2, help="Days ahead to include")
    parser.add_argument("--timeout", type=int, default=30, help="HTTP timeout in seconds")
    parser.add_argument("--out", type=str, default="", help="Optional file path to write JSON")
    args = parser.parse_args()

    try:
        scraper = make_scraper()
        tournaments = fetch_tour_tournaments(scraper=scraper, timeout=args.timeout)
        print(f"[DEBUG] Found {len(tournaments)} tournaments", file=sys.stderr)

        upcoming: List[Dict[str, Any]] = []
        now = datetime.now()
        for tournament in tournaments:
            try:
                event_name = tournament.get('EventTitle', '?')
                day_numbers = build_schedule_day_numbers(tournament, now=now)
                # Build list of URLs to try: specific day pages first, then default
                urls_to_try: List[str] = []
                for day_num in day_numbers:
                    urls_to_try.append(build_schedule_url(tournament, day=day_num))
                urls_to_try.append(build_schedule_url(tournament))

                seen_ids: set = set()
                for url in urls_to_try:
                    print(f"[DEBUG] Fetching {event_name} from {url}", file=sys.stderr)
                    try:
                        response = scraper.get(url, timeout=args.timeout)
                    except Exception as req_err:
                        print(f"[DEBUG] Request failed for {url}: {req_err}", file=sys.stderr)
                        continue
                    if response.status_code != 200:
                        print(f"[DEBUG] Skipping {url} with status {response.status_code}", file=sys.stderr)
                        continue
                    parsed = parse_upcoming_matches_from_schedule_page(
                        html_text=response.text,
                        tournament=tournament,
                        days=max(0, int(args.days)),
                        now=now,
                    )
                    new_count = 0
                    for match in parsed:
                        mid = str(match.get("id") or "")
                        if mid and mid not in seen_ids:
                            seen_ids.add(mid)
                            upcoming.append(match)
                            new_count += 1
                    print(f"[DEBUG] Parsed {new_count} new matches from {url}", file=sys.stderr)
            except Exception as e:
                print(f"[ERROR] Failed to fetch tournament {tournament.get('EventTitle')}: {e}", file=sys.stderr)
                continue

        deduped: Dict[str, Dict[str, Any]] = {}
        for match in upcoming:
            key = str(match.get("id") or "")
            if not key:
                continue
            if key not in deduped:
                deduped[key] = match

        payload = sorted(deduped.values(), key=_sort_key)
    except Exception as exc:
        print(f"[atp_upcoming_matches] {exc}", file=sys.stderr)
        return 1

    text = json.dumps(payload, ensure_ascii=False)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as out_file:
            out_file.write(text)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
