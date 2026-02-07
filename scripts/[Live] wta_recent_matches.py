#!/usr/bin/env python3
"""Fetch recent (finished) WTA singles matches and print JSON."""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any, Dict, List

import requests

WTA_GLOBAL_MATCHES_URL = "https://api.wtatennis.com/tennis/matches/global"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Referer": "https://www.wtatennis.com/scores?type=S",
}


def fetch_global_matches(timeout: int) -> List[Dict[str, Any]]:
    response = requests.get(WTA_GLOBAL_MATCHES_URL, headers=HEADERS, timeout=timeout)
    response.raise_for_status()
    data = response.json()
    if isinstance(data, list):
        return [row for row in data if isinstance(row, dict)]
    if isinstance(data, dict):
        for key in ("Matches", "matches", "data"):
            value = data.get(key)
            if isinstance(value, list):
                return [row for row in value if isinstance(row, dict)]
    return []


def filter_recent_singles(matches: List[Dict[str, Any]], limit: int) -> List[Dict[str, Any]]:
    finished = [
        match
        for match in matches
        if match.get("DrawMatchType") == "S" and match.get("MatchState") == "F"
    ]
    finished.sort(key=lambda row: row.get("MatchTimeStamp") or "", reverse=True)
    return finished[: max(1, limit)]


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch recent WTA singles matches.")
    parser.add_argument("--limit", type=int, default=20, help="Maximum number of matches")
    parser.add_argument("--timeout", type=int, default=20, help="HTTP timeout in seconds")
    parser.add_argument("--out", type=str, default="", help="Optional file path to write JSON")
    args = parser.parse_args()

    try:
        payload = filter_recent_singles(fetch_global_matches(args.timeout), args.limit)
    except Exception as exc:
        print(f"[wta_recent_matches] {exc}", file=sys.stderr)
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
