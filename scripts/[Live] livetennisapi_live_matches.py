#!/usr/bin/env python3
"""Fetch live singles matches from Live Tennis API and print JSON.

Optional, opt-in fallback source for live scores. It is only ever invoked when
``LIVETENNISAPI_KEY`` is set AND the tour's normal scraper has already failed
(see ``TennisDataFetcher.fetch_live_scores``). With the variable unset nothing
here runs and behaviour is unchanged.

Output contract matches the other ``[Live] *`` scripts: a JSON array on stdout,
non-zero exit on failure, ``--timeout`` and ``--out`` flags. Match dicts use the
same already-normalized shape the ATP scraper emits, so no parsing changes are
needed downstream.

Fields the API does not publish are omitted rather than guessed. In particular
there is no player image, no court/venue, no tournament tier on the live feed
and no per-set tiebreak score, so those keys are left out and the dashboard's
existing fallbacks apply.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Dict, List, Optional

import requests

DEFAULT_BASE_URL = "https://api.livetennisapi.com/api/public/v1"
# /matches caps `limit` at 200; page until meta.has_more clears.
PAGE_SIZE = 200
MAX_PAGES = 10


def _base_url() -> str:
    return (os.getenv("LIVETENNISAPI_BASE_URL") or DEFAULT_BASE_URL).rstrip("/")


def fetch_live_matches(tour: str, timeout: int, api_key: str) -> List[Dict[str, Any]]:
    """Page GET /matches?status=live for one tour."""
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    })

    rows: List[Dict[str, Any]] = []
    offset = 0
    for _ in range(MAX_PAGES):
        response = session.get(
            f"{_base_url()}/matches",
            params={"status": "live", "tour": tour, "limit": PAGE_SIZE, "offset": offset},
            timeout=timeout,
        )
        response.raise_for_status()
        body = response.json()
        if not isinstance(body, dict):
            break
        page = body.get("data")
        if not isinstance(page, list):
            break
        rows.extend(row for row in page if isinstance(row, dict))

        meta = body.get("meta")
        has_more = bool(meta.get("has_more")) if isinstance(meta, dict) else False
        if not has_more or not page:
            break
        offset += len(page)

    return rows


def _player(raw: Any) -> Dict[str, Any]:
    """Map a Player object to the dashboard's player dict.

    No `id` and no `player_code` are emitted. The API's player ids belong to a
    different id space than this app's rankings CSVs, and the frontend treats a
    bare numeric id as a SofaScore id when building an image URL. Sending names
    and country only lets the dashboard's own `findRankingRowForPlayer` resolve
    the profile link against its own data, exactly as it already does for ATP.
    """
    raw = raw if isinstance(raw, dict) else {}
    return {
        "name": raw.get("name") or "",
        # Passed through verbatim; the API does not document a country format.
        "country": raw.get("country") or "",
        "rank": raw.get("ranking"),
    }


def _score(raw: Any) -> Dict[str, Any]:
    """Map a Score object.

    `games` is [games_p1, games_p2], each a per-set list. A live or completed
    match may carry an empty games array — that yields an empty `sets` list, it
    is never back-filled from the set counts.

    Per-set tiebreak scores are not published, so the `tiebreak` key the WTA
    parser can emit is deliberately never set here.
    """
    raw = raw if isinstance(raw, dict) else {}
    score: Dict[str, Any] = {"sets": []}

    games = raw.get("games")
    if isinstance(games, list) and len(games) == 2:
        p1_games = games[0] if isinstance(games[0], list) else []
        p2_games = games[1] if isinstance(games[1], list) else []
        for p1, p2 in zip(p1_games, p2_games):
            if isinstance(p1, int) and isinstance(p2, int):
                score["sets"].append({"p1": p1, "p2": p2})

    # In-game points are "0"/"15"/"30"/"40"/"AD" and either entry can be null.
    points = raw.get("points")
    if isinstance(points, list) and len(points) == 2:
        p1_pts, p2_pts = points[0], points[1]
        if p1_pts is not None and p2_pts is not None:
            score["current_game"] = {"p1": p1_pts, "p2": p2_pts}

    return score


def to_dashboard_match(raw: Dict[str, Any], tour: str) -> Optional[Dict[str, Any]]:
    """Map one Match object to the dashboard's normalized live-match dict."""
    match_id = raw.get("id")
    if match_id is None:
        return None

    players = raw.get("players") if isinstance(raw.get("players"), dict) else {}
    surface = raw.get("surface")
    score_raw = raw.get("score")

    return {
        # Prefixed so it can never collide with an `atp_*` / `wta_*` id, and is
        # never mistaken for a bare numeric id from another provider.
        "id": f"ltapi_{match_id}",
        "tour": tour.upper(),
        "tournament": raw.get("tournament") or "Tournament",
        # The live feed carries no tournament tier, so use the app's own
        # "unknown" bucket rather than inferring one.
        "tournament_category": "other",
        "location": "",
        "surface": surface.capitalize() if isinstance(surface, str) else "",
        "round": raw.get("round") or "",
        "court": "",
        "player1": _player(players.get("p1")),
        "player2": _player(players.get("p2")),
        "status": "live",
        "serving": (score_raw or {}).get("server") if isinstance(score_raw, dict) else None,
        "scheduled_time": raw.get("scheduled_time"),
        "score": _score(score_raw),
        # Parity with the enriched ATP shape; there is no H2H endpoint to fill it.
        "h2h_text": "N/A",
    }


def build_payload(rows: List[Dict[str, Any]], tour: str) -> List[Dict[str, Any]]:
    """Keep live singles only and map them, mirroring the other live scripts."""
    out: List[Dict[str, Any]] = []
    for raw in rows:
        if raw.get("status") != "live":
            continue
        if raw.get("is_doubles"):
            continue
        mapped = to_dashboard_match(raw, tour)
        if mapped is not None:
            out.append(mapped)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch live matches from Live Tennis API.")
    parser.add_argument("--tour", type=str, default="atp", choices=["atp", "wta"])
    parser.add_argument("--timeout", type=int, default=20, help="HTTP timeout in seconds")
    parser.add_argument("--out", type=str, default="", help="Optional file path to write JSON")
    args = parser.parse_args()

    api_key = os.getenv("LIVETENNISAPI_KEY", "").strip()
    if not api_key:
        print("[livetennisapi_live_matches] LIVETENNISAPI_KEY is not set", file=sys.stderr)
        return 1

    try:
        payload = build_payload(fetch_live_matches(args.tour, args.timeout, api_key), args.tour)
    except Exception as exc:
        print(f"[livetennisapi_live_matches] {exc}", file=sys.stderr)
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
