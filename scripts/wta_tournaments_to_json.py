#!/usr/bin/env python3
import argparse
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

API_BASE = "https://api.wtatennis.com/tennis"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)


def _iso_now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def _clean_text(value: Optional[str]) -> str:
    return (value or "").strip()


def _level_number(level: str) -> Optional[str]:
    if not level:
        return None
    upper = level.upper()
    if "GRAND SLAM" in upper:
        return "Grand Slam"
    match = re.search(r"(\\d{3,4})", level)
    if match:
        return match.group(1)
    return level


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (text or "").lower()).strip("-")


def _parse_draw_json(draw_info_entry: object) -> Optional[dict]:
    if draw_info_entry is None:
        return None
    if isinstance(draw_info_entry, dict):
        return draw_info_entry
    if isinstance(draw_info_entry, str):
        try:
            return json.loads(draw_info_entry)
        except Exception:
            return None
    return None


def _pick_singles_event(events: List[dict]) -> Optional[dict]:
    if not events:
        return None
    for event in events:
        title = _clean_text(event.get("DrawTypeTitle", "")).lower()
        code = _clean_text(event.get("EventTypeCode", "")).upper()
        if "singles" in title or code.endswith("S"):
            return event
    return events[0]


def _extract_draw(event: dict) -> dict:
    draw_lines = []
    for line in event.get("Draw", {}).get("DrawLine", []) or []:
        player = line.get("Players", {}).get("Player")
        if isinstance(player, list):
            # Singles events usually have a single player object.
            player = player[0] if player else None
        draw_lines.append(
            {
                "pos": line.get("Pos"),
                "seed": line.get("Seed"),
                "rank": line.get("Rank"),
                "entry_type": line.get("EntryType"),
                "display": line.get("DisplayLine"),
                "player": {
                    "id": player.get("id") if isinstance(player, dict) else None,
                    "first_name": player.get("FirstName") if isinstance(player, dict) else None,
                    "last_name": player.get("SurName") if isinstance(player, dict) else None,
                    "country": player.get("Country") if isinstance(player, dict) else None,
                },
            }
        )

    breakdown = []
    for place in event.get("Breakdown", {}).get("Place", []) or []:
        breakdown.append(
            {
                "name": place.get("Name"),
                "points": place.get("PointsRound"),
                "prize": place.get("PrizeRound"),
                "id": place.get("id"),
            }
        )

    results_rounds = []
    for rnd in event.get("Results", {}).get("Round", []) or []:
        matches = []
        for match in rnd.get("Match", []) or []:
            if isinstance(match, str):
                try:
                    match = json.loads(match)
                except Exception:
                    continue
            if not isinstance(match, dict):
                continue
            players = []
            for pt in match.get("Players", {}).get("PT", []) or []:
                player = pt.get("Player", {}) or {}
                players.append(
                    {
                        "slot": pt.get("id"),
                        "display": pt.get("PTDisplayLine"),
                        "seed": pt.get("seed"),
                        "entry_type": pt.get("eType"),
                        "player": {
                            "id": player.get("id"),
                            "first_name": player.get("FirstName"),
                            "last_name": player.get("SurName"),
                            "country": player.get("Country"),
                        },
                    }
                )
            result = match.get("Result", {}) or {}
            matches.append(
                {
                    "id": match.get("Id"),
                    "display_name": match.get("DisplayName"),
                    "result_score": match.get("ResultScore") or result.get("ResultScore"),
                    "winner_slot": result.get("winnerPTId"),
                    "result_name_and_score": result.get("ResultNameAndScore"),
                    "players": players,
                }
            )
        results_rounds.append({"round_id": rnd.get("roundId"), "matches": matches})

    return {
        "draw_size": event.get("DrawSize"),
        "surface": event.get("Surface"),
        "event_type": event.get("EventTypeCode"),
        "draw_type": event.get("DrawTypeTitle"),
        "draw_lines": draw_lines,
        "breakdown": breakdown,
        "results": results_rounds,
    }


def _player_name_from_match(match: dict, side: str) -> str:
    first = _clean_text(match.get(f"PlayerNameFirst{side}", ""))
    last = _clean_text(match.get(f"PlayerNameLast{side}", ""))
    return " ".join([p for p in [first, last] if p]).strip()


def _determine_winner_side(match: dict) -> Optional[str]:
    wins_a = 0
    wins_b = 0
    for idx in range(1, 6):
        score_a = match.get(f"ScoreSet{idx}A")
        score_b = match.get(f"ScoreSet{idx}B")
        if score_a in (None, "") or score_b in (None, ""):
            continue
        try:
            val_a = int(score_a)
            val_b = int(score_b)
        except Exception:
            continue
        if val_a > val_b:
            wins_a += 1
        elif val_b > val_a:
            wins_b += 1
    if wins_a > wins_b:
        return "A"
    if wins_b > wins_a:
        return "B"
    result = match.get("ResultString") or ""
    if " d " in result:
        winner_text = result.split(" d ")[0].strip()
        last_a = _clean_text(match.get("PlayerNameLastA", "")).lower()
        last_b = _clean_text(match.get("PlayerNameLastB", "")).lower()
        if last_a and last_a in winner_text.lower():
            return "A"
        if last_b and last_b in winner_text.lower():
            return "B"
    return None


def _extract_matches(payload: dict) -> List[dict]:
    matches_out = []
    for match in payload.get("matches", []) or []:
        sets = []
        for idx in range(1, 6):
            score_a = match.get(f"ScoreSet{idx}A")
            score_b = match.get(f"ScoreSet{idx}B")
            if score_a in (None, "") and score_b in (None, ""):
                continue
            sets.append({"a": score_a, "b": score_b})
        winner_side = _determine_winner_side(match)
        matches_out.append(
            {
                "match_id": match.get("MatchID"),
                "round_id": match.get("RoundID"),
                "draw_level_type": match.get("DrawLevelType"),
                "draw_match_type": match.get("DrawMatchType"),
                "match_state": match.get("MatchState"),
                "scheduled": match.get("MatchTimeStamp"),
                "duration": match.get("MatchTimeTotal"),
                "player_a": {
                    "id": match.get("PlayerIDA"),
                    "name": _player_name_from_match(match, "A"),
                    "country": match.get("PlayerCountryA"),
                },
                "player_b": {
                    "id": match.get("PlayerIDB"),
                    "name": _player_name_from_match(match, "B"),
                    "country": match.get("PlayerCountryB"),
                },
                "score_string": match.get("ScoreString"),
                "result_string": match.get("ResultString"),
                "sets": sets,
                "winner_side": winner_side,
            }
        )
    return matches_out


def _extract_finalists(matches: List[dict]) -> Tuple[Optional[dict], Optional[dict]]:
    finals = [m for m in matches if m.get("round_id") == "F" and m.get("draw_match_type") == "S"]
    if not finals:
        return None, None
    final = finals[0]
    winner_side = final.get("winner_side")
    player_a = final.get("player_a")
    player_b = final.get("player_b")
    if winner_side == "A":
        return player_a, player_b
    if winner_side == "B":
        return player_b, player_a
    return None, None


def fetch_tournaments(
    session: requests.Session, year: int, page_size: int = 100
) -> List[dict]:
    url = f"{API_BASE}/tournaments/"
    tournaments = []
    page = 0
    while True:
        params = {
            "page": page,
            "pageSize": page_size,
            "levels": "",
            "excludeLevels": "ITF",
            "surfaces": "",
            "from": f"{year}-01-01",
            "to": f"{year}-12-31",
        }
        resp = session.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        tournaments.extend(data.get("content", []) or [])
        page_info = data.get("pageInfo", {})
        num_pages = page_info.get("numPages", 0)
        if num_pages == 0 or page >= num_pages - 1:
            break
        page += 1
        time.sleep(0.1)
    return tournaments


def fetch_draw(
    session: requests.Session, tournament_group_id: int, year: int
) -> Optional[dict]:
    url = f"{API_BASE}/tournaments/{tournament_group_id}/{year}/draw"
    resp = session.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    payload = resp.json()
    draw_info = payload.get("drawInfo", []) or []
    events = []
    for entry in draw_info:
        parsed = _parse_draw_json(entry)
        if not parsed:
            continue
        events.extend(parsed.get("Draws", {}).get("Events", {}).get("Event", []) or [])
    event = _pick_singles_event(events)
    if not event:
        return None
    return _extract_draw(event)


def fetch_matches(
    session: requests.Session, tournament_group_id: int, year: int
) -> Optional[dict]:
    url = f"{API_BASE}/tournaments/{tournament_group_id}/{year}/matches"
    resp = session.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2026, help="Season year to scrape.")
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/wta/tournaments",
        help="Directory to write per-tournament JSON files.",
    )
    parser.add_argument(
        "--limit", type=int, default=0, help="Limit number of tournaments."
    )
    parser.add_argument(
        "--fallback-year",
        type=int,
        default=2025,
        help="Fallback year to use when scores/draws are missing.",
    )
    args = parser.parse_args()

    session = requests.Session()
    tournaments = fetch_tournaments(session, args.year)
    if args.limit:
        tournaments = tournaments[: args.limit]

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    output = {
        "generated_at": _iso_now(),
        "year": args.year,
        "tournaments": [],
    }

    for idx, t in enumerate(tournaments, start=1):
        group = t.get("tournamentGroup", {}) or {}
        group_id = group.get("id")
        title = t.get("title") or group.get("name")
        level = t.get("level") or group.get("level")
        level_num = _level_number(level or "")

        print(f"[{idx}/{len(tournaments)}] {title}")

        has_singles_draw = bool(t.get("singlesDrawSize"))
        is_united_cup = (group.get("name") or "").strip().upper() == "UNITED CUP"
        is_grand_slam = "GRAND SLAM" in (level or "").upper()
        should_fetch_draw = not is_united_cup and (has_singles_draw or is_grand_slam)
        draw = None
        draw_year = t.get("year", args.year)
        if group_id and should_fetch_draw:
            draw = fetch_draw(session, group_id, t.get("year", args.year))
        if not draw and group_id and args.fallback_year:
            if should_fetch_draw:
                draw = fetch_draw(session, group_id, args.fallback_year)
                draw_year = args.fallback_year if draw else draw_year

        matches_payload = (
            fetch_matches(session, group_id, t.get("year", args.year)) if group_id else None
        )
        matches_year = t.get("year", args.year)
        if (not matches_payload or not matches_payload.get("matches")) and group_id and args.fallback_year:
            alt_payload = fetch_matches(session, group_id, args.fallback_year)
            if alt_payload and alt_payload.get("matches"):
                matches_payload = alt_payload
                matches_year = args.fallback_year

        matches = _extract_matches(matches_payload) if matches_payload else []
        champion, runner_up = _extract_finalists(matches)
        if not champion:
            for winner in (t.get("winners") or []):
                singles = winner.get("singles") or {}
                player = singles.get("player") or {}
                if player.get("fullName") or (player.get("firstName") or player.get("lastName")):
                    champion = {
                        "id": player.get("id"),
                        "name": player.get("fullName")
                        or " ".join(
                            [p for p in [player.get("firstName"), player.get("lastName")] if p]
                        ).strip(),
                        "country": player.get("countryCode"),
                    }
                    break

        output["tournaments"].append(
            {
                "order": idx,
                "tournament_group_id": group_id,
                "name": group.get("name"),
                "title": title,
                "level": level,
                "level_number": level_num,
                "year": t.get("year"),
                "start_date": t.get("startDate"),
                "end_date": t.get("endDate"),
                "surface": t.get("surface"),
                "indoor_outdoor": t.get("inOutdoor"),
                "city": t.get("city"),
                "country": t.get("country"),
                "status": t.get("status"),
                "draw_size_singles": t.get("singlesDrawSize"),
                "draw_size_doubles": t.get("doublesDrawSize"),
                "prize_money": t.get("prizeMoney"),
                "prize_money_currency": t.get("prizeMoneyCurrency"),
                "champion": champion,
                "runner_up": runner_up,
                "draw_year": draw_year if draw else None,
                "draw": draw,
                "scores_year": matches_year,
                "matches": matches,
            }
        )
        time.sleep(0.15)

    output["tournaments"].sort(key=lambda x: x.get("start_date") or "")
    for idx, t in enumerate(output["tournaments"], start=1):
        t["order"] = idx

    for tournament in output["tournaments"]:
        order = tournament.get("order")
        name = tournament.get("name") or tournament.get("title") or f"tournament-{order}"
        slug = _slugify(name)
        filename = f"{order:03d}_{slug}.json"
        path = output_dir / filename
        with path.open("w", encoding="utf-8") as f:
            json.dump(tournament, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(output['tournaments'])} tournament files to {output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
