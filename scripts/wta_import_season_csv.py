#!/usr/bin/env python3
"""Convert tennisdata.app WTA season CSVs into the project's WTA archive format.

Source files land in ``historic data_wta/_source/{year}-wta-season.csv`` via
``wta_fetch_season_csv.py``. They use a home/away layout with abbreviated player
names; the archive uses the Sackmann winner/loser 49-column layout with full
names, so this script pivots and remaps.

Scope decisions baked in:
  * Main tour only - WTA Challenger rows are dropped (they carry most of the
    players who cannot be resolved to a full name).
  * Qualifying rounds are dropped, matching the archive convention.
  * Only FINISHED matches are kept.

Fields the source simply does not carry (raw serve counts, minutes, seeds,
country, age, height, draw size) are written empty rather than guessed.

Usage:
    python3 scripts/wta_import_season_csv.py 2025 2026
    python3 scripts/wta_import_season_csv.py 2026 --dry-run
"""

from __future__ import annotations

import argparse
import collections
import csv
import datetime as dt
import glob
import json
import re
import sys
import unicodedata
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ARCHIVE_DIR = REPO_ROOT / "historic data_wta"
SOURCE_DIR = ARCHIVE_DIR / "_source"
REGISTRY_PATH = REPO_ROOT / "backend" / "tournament_category_registry.json"
MANIFEST_PATH = REPO_ROOT / "data_analysis" / "wta" / "data" / "csv_manifest.json"

ARCHIVE_COLUMNS = [
    "tourney_id", "tourney_name", "surface", "draw_size", "tourney_level",
    "tourney_date", "match_num",
    "winner_id", "winner_seed", "winner_entry", "winner_name", "winner_hand",
    "winner_ht", "winner_ioc", "winner_age",
    "loser_id", "loser_seed", "loser_entry", "loser_name", "loser_hand",
    "loser_ht", "loser_ioc", "loser_age",
    "score", "best_of", "round", "minutes",
    "w_ace", "w_df", "w_svpt", "w_1stIn", "w_1stWon", "w_2ndWon", "w_SvGms",
    "w_bpSaved", "w_bpFaced",
    "l_ace", "l_df", "l_svpt", "l_1stIn", "l_1stWon", "l_2ndWon", "l_SvGms",
    "l_bpSaved", "l_bpFaced",
    "winner_rank", "winner_rank_points", "loser_rank", "loser_rank_points",
]

ROUND_MAP = {
    "final": "F",
    "semi-finals": "SF",
    "quarter-finals": "QF",
    "1/8-finals": "R16",
    "1/16-finals": "R32",
    "1/32-finals": "R64",
    "1/64-finals": "R128",
    "round robin": "RR",
}

CATEGORY_TO_LEVEL = {
    "grand_slam": "G",
    "wta_finals": "F",
    "wta_1000": "PM",
    "wta_500": "P",
    "wta_250": "I",
    "wta_125": "W",
}

SURFACE_MAP = {"hard": "Hard", "clay": "Clay", "grass": "Grass", "carpet": "Carpet"}


# --------------------------------------------------------------------------- #
# Name resolution
# --------------------------------------------------------------------------- #

def name_tokens(value: str) -> list[str]:
    text = unicodedata.normalize("NFD", value)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z ]", " ", text.lower()).split()


class NameResolver:
    """Maps 'Swiatek I.' onto 'Iga Swiatek' using the existing archive."""

    def __init__(self) -> None:
        self.index: dict[tuple, set[str]] = collections.defaultdict(set)
        self.recency: dict[str, int] = {}
        self._build()
        self.stats = collections.Counter()
        self.unresolved: collections.Counter = collections.Counter()

    def _add(self, full_name: str, year: int) -> None:
        tokens = name_tokens(full_name)
        if len(tokens) < 2:
            return
        if year > self.recency.get(full_name, 0):
            self.recency[full_name] = year
        for split in range(1, len(tokens)):
            surname = tuple(tokens[split:])
            for given in tokens[:split]:
                self.index[(surname, given[0])].add(full_name)

    def _build(self) -> None:
        for path in sorted(glob.glob(str(ARCHIVE_DIR / "[12]*.csv"))):
            year = int(Path(path).stem[:4])
            if year < 2000:
                continue
            with open(path, newline="", encoding="utf-8-sig") as fh:
                for row in csv.DictReader(fh):
                    for key in ("winner_name", "loser_name"):
                        value = (row.get(key) or "").strip()
                        if value:
                            self._add(value, year)
        for profile_path in glob.glob(str(REPO_ROOT / "data" / "wta" / "*" / "profile.json")):
            try:
                with open(profile_path, encoding="utf-8") as fh:
                    value = (json.load(fh).get("name") or "").strip()
            except Exception:
                continue
            if value:
                self._add(value, 9999)

    @staticmethod
    def _parse_abbrev(value: str):
        tokens = name_tokens(value)
        if len(tokens) < 2:
            return None
        cut = len(tokens)
        while cut > 1 and len(tokens[cut - 1]) <= 1:
            cut -= 1
        if cut == len(tokens):        # e.g. "Wang Xin." - trailing short given name
            cut = len(tokens) - 1
        return tuple(tokens[:cut]), tokens[cut][0]

    def resolve(self, abbreviated: str) -> str:
        key = self._parse_abbrev(abbreviated)
        candidates = self.index.get(key, set()) if key else set()

        if len(candidates) == 1:
            self.stats["unique"] += 1
            return next(iter(candidates))
        if not candidates:
            self.stats["unresolved"] += 1
            self.unresolved[abbreviated] += 1
            return abbreviated.strip()

        # Ambiguous: prefer whoever was active most recently.
        self.stats["ambiguous"] += 1
        return max(candidates, key=lambda n: (self.recency.get(n, 0), -len(n)))


# --------------------------------------------------------------------------- #
# Tournament metadata
# --------------------------------------------------------------------------- #

def load_registry() -> dict[str, str]:
    try:
        with open(REGISTRY_PATH, encoding="utf-8") as fh:
            wta = json.load(fh).get("wta", {})
    except Exception:
        return {}
    return {key: entry.get("category", "") for key, entry in wta.items()}


def clean_tournament(raw: str) -> str:
    name = re.sub(r"\s*-\s*Qualification\s*$", "", raw or "", flags=re.I)
    name = re.sub(r"\s+WTA\s*$", "", name, flags=re.I)
    name = re.sub(r"\s+Women\s*$", "", name, flags=re.I)
    return name.strip() or "Unknown"


def registry_key(name: str) -> str:
    return " ".join(name_tokens(name))


def derive_level(name: str, registry: dict[str, str]) -> str:
    lowered = name.lower()
    if "olympic" in lowered:
        return "O"
    if "billie jean king cup" in lowered or "united cup" in lowered or "fed cup" in lowered:
        return "D"
    if re.search(r"\bwta finals\b", lowered):
        return "F"

    category = registry.get(registry_key(name), "")
    if category in CATEGORY_TO_LEVEL:
        return CATEGORY_TO_LEVEL[category]

    if re.search(r"(australian open|french open|roland garros|wimbledon|us open)", lowered):
        return "G"
    if re.search(r"\b125\b", lowered):
        return "W"
    return "I"


# --------------------------------------------------------------------------- #
# Row conversion
# --------------------------------------------------------------------------- #

def build_score(row: dict, home_won: bool) -> str:
    sets = []
    for index in range(1, 6):
        home = (row.get(f"home_set_{index}_score") or "").strip()
        away = (row.get(f"away_set_{index}_score") or "").strip()
        if not home and not away:
            continue
        winner_games, loser_games = (home, away) if home_won else (away, home)
        sets.append(f"{winner_games or '0'}-{loser_games or '0'}")
    return " ".join(sets)


def convert_year(year: int, resolver: NameResolver, registry: dict[str, str]) -> tuple[list[dict], dict]:
    source_path = SOURCE_DIR / f"{year}-wta-season.csv"
    if not source_path.exists():
        raise FileNotFoundError(
            f"{source_path.relative_to(REPO_ROOT)} not found - run wta_fetch_season_csv.py {year} first"
        )

    with open(source_path, newline="", encoding="utf-8-sig") as fh:
        raw_rows = list(csv.DictReader(fh))

    counts = collections.Counter(total=len(raw_rows))
    kept = []
    for row in raw_rows:
        if row.get("tour_type_human") != "WTA Tour":
            counts["dropped_challenger"] += 1
            continue
        if row.get("status") != "FINISHED":
            counts["dropped_unfinished"] += 1
            continue
        round_code = ROUND_MAP.get((row.get("round") or "").strip().lower())
        if not round_code:
            counts["dropped_qualifying_or_unknown_round"] += 1
            continue
        if re.search(r"Qualification", row.get("tournament") or "", flags=re.I):
            counts["dropped_qualifying_or_unknown_round"] += 1
            continue
        kept.append((row, round_code))

    # Group by tournament so we can assign a shared start date and match numbers.
    events: dict[str, list] = collections.defaultdict(list)
    for row, round_code in kept:
        events[clean_tournament(row.get("tournament", ""))].append((row, round_code))

    out_rows: list[dict] = []
    for event_name, entries in events.items():
        stamps = [int(r["date_timestamp"]) for r, _ in entries if str(r.get("date_timestamp", "")).isdigit()]
        start = dt.datetime.utcfromtimestamp(min(stamps)).strftime("%Y%m%d") if stamps else f"{year}0101"
        slug = re.sub(r"[^a-z0-9]+", "-", event_name.lower()).strip("-")[:24] or "event"
        level = derive_level(event_name, registry)

        entries.sort(key=lambda pair: int(pair[0].get("date_timestamp") or 0))
        for number, (row, round_code) in enumerate(entries, start=1):
            home_won = (row.get("winner_code") or "").strip() == "1"
            side_w, side_l = ("home", "away") if home_won else ("away", "home")

            def value(side: str, field: str) -> str:
                return (row.get(f"{side}_{field}") or "").strip()

            out_rows.append({
                "tourney_id": f"{year}-{slug}",
                "tourney_name": event_name,
                "surface": SURFACE_MAP.get((row.get("surface") or "").strip().lower(), ""),
                "draw_size": "",
                "tourney_level": level,
                "tourney_date": start,
                "match_num": number,
                "winner_id": value(side_w, "id"),
                "winner_seed": "",
                "winner_entry": "",
                "winner_name": resolver.resolve(value(side_w, "name")),
                "winner_hand": "",
                "winner_ht": "",
                "winner_ioc": "",
                "winner_age": "",
                "loser_id": value(side_l, "id"),
                "loser_seed": "",
                "loser_entry": "",
                "loser_name": resolver.resolve(value(side_l, "name")),
                "loser_hand": "",
                "loser_ht": "",
                "loser_ioc": "",
                "loser_age": "",
                "score": build_score(row, home_won),
                "best_of": 3,
                "round": round_code,
                "minutes": "",
                "w_ace": value(side_w, "aces"),
                "w_df": value(side_w, "double_faults"),
                "w_svpt": "", "w_1stIn": "", "w_1stWon": "", "w_2ndWon": "",
                "w_SvGms": "", "w_bpSaved": "", "w_bpFaced": "",
                "l_ace": value(side_l, "aces"),
                "l_df": value(side_l, "double_faults"),
                "l_svpt": "", "l_1stIn": "", "l_1stWon": "", "l_2ndWon": "",
                "l_SvGms": "", "l_bpSaved": "", "l_bpFaced": "",
                "winner_rank": value(side_w, "rank"),
                "winner_rank_points": value(side_w, "points"),
                "loser_rank": value(side_l, "rank"),
                "loser_rank_points": value(side_l, "points"),
            })

    out_rows.sort(key=lambda r: (r["tourney_date"], r["tourney_id"], r["match_num"]))
    counts["written"] = len(out_rows)
    counts["events"] = len(events)
    return out_rows, counts


def update_manifest(years: list[int]) -> str:
    if not MANIFEST_PATH.exists():
        return "manifest not found - skipped"
    with open(MANIFEST_PATH, encoding="utf-8") as fh:
        manifest = json.load(fh)

    files = manifest.get("files")
    if not isinstance(files, list) or not files:
        return "unexpected manifest shape - skipped"

    template = files[-1]
    known = {entry.get("year") for entry in files}
    added = []
    for year in sorted(years):
        if year in known:
            continue
        entry = dict(template)
        entry["year"] = year
        for key, value in list(entry.items()):
            if isinstance(value, str):
                entry[key] = re.sub(r"(19|20)\d{2}", str(year), value)
        files.append(entry)
        added.append(year)

    files.sort(key=lambda e: e.get("year", 0))
    with open(MANIFEST_PATH, "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=2)
        fh.write("\n")
    return f"added {added}" if added else "already current"


def main() -> int:
    parser = argparse.ArgumentParser(description="Import tennisdata.app WTA seasons into the archive.")
    parser.add_argument("years", nargs="+", type=int, help="Season years, e.g. 2025 2026")
    parser.add_argument("--dry-run", action="store_true", help="Report only; write nothing")
    args = parser.parse_args()

    print("Building name resolver from the existing archive…")
    resolver = NameResolver()
    registry = load_registry()
    print(f"  {len(resolver.recency)} known full names, {len(registry)} registry tournaments\n")

    written = []
    for year in args.years:
        try:
            rows, counts = convert_year(year, resolver, registry)
        except FileNotFoundError as exc:
            print(f"[{year}] {exc}", file=sys.stderr)
            continue

        print(f"[{year}] {counts['total']} source rows")
        print(f"   dropped: {counts['dropped_challenger']} challenger, "
              f"{counts['dropped_unfinished']} unfinished, "
              f"{counts['dropped_qualifying_or_unknown_round']} qualifying/unknown round")
        print(f"   kept: {counts['written']} matches across {counts['events']} events")

        if args.dry_run:
            continue

        target = ARCHIVE_DIR / f"{year}.csv"
        with open(target, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=ARCHIVE_COLUMNS)
            writer.writeheader()
            writer.writerows(rows)
        print(f"   → wrote {target.relative_to(REPO_ROOT)}")
        written.append(year)

    total = sum(resolver.stats.values()) or 1
    print("\nName resolution across all imported rows:")
    for key in ("unique", "ambiguous", "unresolved"):
        value = resolver.stats[key]
        print(f"   {key:11} {value:6}  ({value * 100 // total}%)")
    if resolver.unresolved:
        top = ", ".join(f"{n} ({c})" for n, c in resolver.unresolved.most_common(6))
        print(f"   kept abbreviated: {top}")

    if written and not args.dry_run:
        print(f"\nManifest: {update_manifest(written)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
