#!/usr/bin/env python3
"""
Download missing ATP/WTA player images for data_analysis from Wikipedia.

What this script does:
- Can discover players from:
  - full historic CSV archives (default)
  - player manifests (fallback mode)
- Creates output folders:
  - data_analysis/images/atp
  - data_analysis/images/wta
- Processes top N players by match appearance frequency (CSV mode)
- Skips players who already have an image in main app source folders (data/atp, data/wta)
- Skips players already downloaded in data_analysis/images/{tour}
- Fetches lead image from Wikipedia (MediaWiki API)
- Saves as slugified player name (e.g., novak-djokovic.jpg)
- Prints progress bars and a final summary
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php"
USER_AGENT = "TennisDashboardImageFetcher/1.0 (local script)"

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp")

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_ANALYSIS_DIR = REPO_ROOT / "data_analysis"
ATP_MANIFEST = DATA_ANALYSIS_DIR / "data" / "player_manifest.json"
WTA_MANIFEST = DATA_ANALYSIS_DIR / "wta" / "data" / "player_manifest.json"
ATP_CSV_MANIFEST = DATA_ANALYSIS_DIR / "data" / "csv_manifest.json"
WTA_CSV_MANIFEST = DATA_ANALYSIS_DIR / "wta" / "data" / "csv_manifest.json"
OUTPUT_ROOT = DATA_ANALYSIS_DIR / "images"

TOUR_CONFIG = {
    "atp": {
        "manifest": ATP_MANIFEST,
        "csv_manifest": ATP_CSV_MANIFEST,
        "csv_base_dir": DATA_ANALYSIS_DIR,
        "source_data": REPO_ROOT / "data" / "atp",
        "output": OUTPUT_ROOT / "atp",
    },
    "wta": {
        "manifest": WTA_MANIFEST,
        "csv_manifest": WTA_CSV_MANIFEST,
        "csv_base_dir": DATA_ANALYSIS_DIR / "wta",
        "source_data": REPO_ROOT / "data" / "wta",
        "output": OUTPUT_ROOT / "wta",
    },
}


@dataclass
class PlayerCandidate:
    name: str
    folder: Optional[str]
    rank: Optional[int]
    folder_id: Optional[int]
    appearances: int


def slugify(value: str) -> str:
    text = unicodedata.normalize("NFKD", value)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text or "unknown-player"


def normalize_name_key(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_int(value) -> Optional[int]:
    try:
        if value is None:
            return None
        return int(value)
    except Exception:
        return None


def clean_player_name(value: str) -> str:
    text = re.sub(r"\s+", " ", str(value or "").strip())
    if not text:
        return ""
    if text.lower() in {"none", "nan", "null"}:
        return ""
    return text


def load_players_from_manifest(manifest_path: Path, top_n: int) -> Tuple[List[PlayerCandidate], int]:
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    rows = data.get("players", [])
    players: List[PlayerCandidate] = []

    for row in rows:
        name = (row.get("name") or "").strip()
        folder = (row.get("folder") or "").strip()
        if not name:
            continue
        players.append(
            PlayerCandidate(
                name=name,
                folder=folder or None,
                rank=parse_int(row.get("rank")),
                folder_id=parse_int(row.get("folder_id")),
                appearances=0,
            )
        )

    def sort_key(p: PlayerCandidate) -> Tuple[int, int, str]:
        # ATP has rank; WTA manifest rank is often null. Fallback to folder_id.
        rank = p.rank if p.rank is not None else 999999
        folder_id = p.folder_id if p.folder_id is not None else 999999
        return (rank, folder_id, p.name.lower())

    discovered_players = len(players)
    players = sorted(players, key=sort_key)
    if top_n > 0:
        players = players[:top_n]
    return players, discovered_players


def _resolve_csv_path(base_dir: Path, raw_path: str) -> Path:
    return (base_dir / str(raw_path or "").strip()).resolve()


def _resolve_name_column(fieldnames: Iterable[str], prefix: str) -> Optional[str]:
    lower_to_original = {}
    for name in fieldnames:
        if not name:
            continue
        lower_to_original[name.strip().lower()] = name
    direct = lower_to_original.get(f"{prefix}_name")
    if direct:
        return direct
    # Fallbacks for unexpected headers.
    for candidate in lower_to_original:
        if candidate.endswith(f"{prefix}_name"):
            return lower_to_original[candidate]
    return None


def _iter_csv_player_names(csv_path: Path) -> Iterable[str]:
    with csv_path.open("r", encoding="utf-8", errors="replace", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            return

        winner_col = _resolve_name_column(reader.fieldnames, "winner")
        loser_col = _resolve_name_column(reader.fieldnames, "loser")
        if not winner_col or not loser_col:
            return

        for row in reader:
            winner = clean_player_name(row.get(winner_col, ""))
            loser = clean_player_name(row.get(loser_col, ""))
            if winner:
                yield winner
            if loser:
                yield loser


def load_players_from_csv(
    tour: str,
    csv_manifest_path: Path,
    csv_base_dir: Path,
    top_n: int,
    min_appearances: int,
) -> Tuple[List[PlayerCandidate], int]:
    data = json.loads(csv_manifest_path.read_text(encoding="utf-8"))
    files = data.get("files", [])
    counter: Counter = Counter()

    total_files = len(files)
    for idx, item in enumerate(files, start=1):
        csv_path = _resolve_csv_path(csv_base_dir, item.get("path", ""))
        if not csv_path.exists():
            print(f"[WARN] {tour.upper()} CSV missing: {csv_path}")
            continue
        try:
            for name in _iter_csv_player_names(csv_path):
                counter[name] += 1
        except Exception as exc:
            print(f"[WARN] {tour.upper()} failed to scan {csv_path.name}: {exc}")
            continue

        if idx == 1 or idx == total_files or idx % 10 == 0:
            print(
                f"{tour.upper()} scan files {idx}/{total_files} | "
                f"unique players so far: {len(counter)}"
            )

    discovered_players = len(counter)
    players = [
        PlayerCandidate(
            name=name,
            folder=None,
            rank=None,
            folder_id=None,
            appearances=int(appearances),
        )
        for name, appearances in counter.items()
        if int(appearances) >= max(1, int(min_appearances))
    ]
    players.sort(key=lambda p: (-p.appearances, p.name.lower()))

    if top_n > 0:
        players = players[:top_n]

    return players, discovered_players


def _player_dir_has_image(player_dir: Path) -> bool:
    for ext in IMAGE_EXTENSIONS:
        if (player_dir / f"image{ext}").exists():
            return True
    return False


def scan_source_image_name_sets(source_data_dir: Path) -> Tuple[set, set]:
    """
    Returns two sets for players who already have main-app images:
    - normalized name keys
    - slug keys
    """
    name_keys = set()
    slugs = set()
    for profile_path in sorted(source_data_dir.glob("*/profile.json")):
        player_dir = profile_path.parent
        if not _player_dir_has_image(player_dir):
            continue
        try:
            profile = json.loads(profile_path.read_text(encoding="utf-8"))
        except Exception:
            continue
        name = clean_player_name(profile.get("name", ""))
        if not name:
            continue
        key = normalize_name_key(name)
        if key:
            name_keys.add(key)
        slugs.add(slugify(name))
    return name_keys, slugs


def get_existing_output_slugs(output_dir: Path) -> set:
    if not output_dir.exists():
        return set()
    slugs = set()
    for path in output_dir.iterdir():
        if not path.is_file():
            continue
        if path.suffix.lower() in IMAGE_EXTENSIONS:
            slugs.add(path.stem.lower())
    return slugs


def http_get_json(url: str, params: Dict[str, str], timeout: int) -> Dict:
    query = urllib.parse.urlencode(params)
    full_url = f"{url}?{query}"
    req = urllib.request.Request(
        full_url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def wikipedia_image_url_for_player(name: str, timeout: int) -> Optional[str]:
    candidates = [
        f"{name} (tennis)",
        f"{name} (tennis player)",
        name,
    ]

    for title in candidates:
        try:
            data = http_get_json(
                WIKIPEDIA_API,
                {
                    "action": "query",
                    "format": "json",
                    "redirects": "1",
                    "prop": "pageimages",
                    "piprop": "original|thumbnail|name",
                    "pithumbsize": "1200",
                    "titles": title,
                },
                timeout=timeout,
            )
        except Exception:
            continue

        pages = (data.get("query") or {}).get("pages") or {}
        for _, page in pages.items():
            if "missing" in page:
                continue
            original = page.get("original") or {}
            thumbnail = page.get("thumbnail") or {}
            source = (original.get("source") or thumbnail.get("source") or "").strip()
            if source:
                return source

    # Fallback: use Wikipedia search then fetch first hit image.
    try:
        search_data = http_get_json(
            WIKIPEDIA_API,
            {
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": f"{name} tennis player",
                "srlimit": "3",
            },
            timeout=timeout,
        )
    except Exception:
        return None

    hits = (search_data.get("query") or {}).get("search") or []
    for hit in hits:
        title = (hit.get("title") or "").strip()
        if not title:
            continue
        try:
            data = http_get_json(
                WIKIPEDIA_API,
                {
                    "action": "query",
                    "format": "json",
                    "redirects": "1",
                    "prop": "pageimages",
                    "piprop": "original|thumbnail|name",
                    "pithumbsize": "1200",
                    "titles": title,
                },
                timeout=timeout,
            )
        except Exception:
            continue

        pages = (data.get("query") or {}).get("pages") or {}
        for _, page in pages.items():
            if "missing" in page:
                continue
            original = page.get("original") or {}
            thumbnail = page.get("thumbnail") or {}
            source = (original.get("source") or thumbnail.get("source") or "").strip()
            if source:
                return source

    return None


def download_binary(url: str, timeout: int) -> Tuple[bytes, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "image/*,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        content = response.read()
        content_type = response.headers.get("Content-Type", "")
        return content, content_type


def ext_from_url_or_type(url: str, content_type: str) -> str:
    lower_type = (content_type or "").lower()
    if "png" in lower_type:
        return ".png"
    if "webp" in lower_type:
        return ".webp"
    if "jpeg" in lower_type or "jpg" in lower_type:
        return ".jpg"

    path = urllib.parse.urlparse(url).path.lower()
    for ext in IMAGE_EXTENSIONS:
        if path.endswith(ext):
            return ".jpg" if ext == ".jpeg" else ext
    return ".jpg"


def render_bar(current: int, total: int, width: int = 28) -> str:
    if total <= 0:
        return "[" + ("-" * width) + "]"
    ratio = max(0.0, min(1.0, current / total))
    filled = int(ratio * width)
    return "[" + ("#" * filled) + ("-" * (width - filled)) + "]"


def print_progress(tour: str, idx: int, total: int, saved: int, skipped: int, failed: int, name: str) -> None:
    pct = (idx / total * 100.0) if total else 100.0
    bar = render_bar(idx, total)
    line = (
        f"{tour.upper()} {bar} {idx}/{total} ({pct:5.1f}%) | "
        f"saved={saved} skipped={skipped} failed={failed} | {name}"
    )
    print(line)


def run_tour(
    tour: str,
    top_n: int,
    timeout: int,
    delay: float,
    dry_run: bool,
    player_source: str,
    min_appearances: int,
) -> Dict:
    config = TOUR_CONFIG[tour]
    manifest_path = config["manifest"]
    csv_manifest_path = config["csv_manifest"]
    csv_base_dir = config["csv_base_dir"]
    source_data_dir = config["source_data"]
    output_dir = config["output"]
    output_dir.mkdir(parents=True, exist_ok=True)

    if player_source == "csv":
        players, discovered_players = load_players_from_csv(
            tour=tour,
            csv_manifest_path=csv_manifest_path,
            csv_base_dir=csv_base_dir,
            top_n=top_n,
            min_appearances=min_appearances,
        )
    else:
        players, discovered_players = load_players_from_manifest(
            manifest_path=manifest_path,
            top_n=top_n,
        )

    source_name_keys, source_slugs = scan_source_image_name_sets(source_data_dir)
    existing_output = get_existing_output_slugs(output_dir)

    queue: List[PlayerCandidate] = []
    skipped_source_images = 0
    skipped_existing_output = 0
    for player in players:
        name_key = normalize_name_key(player.name)
        slug = slugify(player.name)
        if name_key in source_name_keys or slug in source_slugs:
            skipped_source_images += 1
            continue
        if slug in existing_output:
            skipped_existing_output += 1
            continue
        queue.append(player)

    total = len(queue)
    saved = 0
    skipped = skipped_source_images + skipped_existing_output
    failed = 0
    results = []

    print(
        f"{tour.upper()} discovery summary | source={player_source} "
        f"discovered={discovered_players} selected={len(players)} "
        f"skip_main_app_images={skipped_source_images} "
        f"skip_existing_analysis_images={skipped_existing_output} "
        f"queue={total}"
    )

    if total == 0:
        print(f"{tour.upper()}: no missing images in selected players.")

    for idx, player in enumerate(queue, start=1):
        name = player.name
        slug = slugify(name)
        status = "failed"
        file_path = None
        wiki_url = None
        reason = ""

        try:
            wiki_url = wikipedia_image_url_for_player(name, timeout=timeout)
            if not wiki_url:
                failed += 1
                reason = "no_wikipedia_image"
            else:
                content, content_type = download_binary(wiki_url, timeout=timeout)
                if not content:
                    failed += 1
                    reason = "empty_download"
                else:
                    ext = ext_from_url_or_type(wiki_url, content_type)
                    target = output_dir / f"{slug}{ext}"
                    if dry_run:
                        status = "would_save"
                        saved += 1
                        file_path = str(target.relative_to(REPO_ROOT))
                    else:
                        target.write_bytes(content)
                        status = "saved"
                        saved += 1
                        file_path = str(target.relative_to(REPO_ROOT))
        except urllib.error.HTTPError as exc:
            failed += 1
            reason = f"http_{exc.code}"
        except Exception as exc:
            failed += 1
            reason = f"error:{exc.__class__.__name__}"

        results.append(
            {
                "name": name,
                "tour": tour,
                "status": status,
                "reason": reason,
                "file_path": file_path,
                "wikipedia_image_url": wiki_url,
            }
        )
        print_progress(tour, idx, total, saved, skipped, failed, name)
        if delay > 0:
            time.sleep(delay)

    return {
        "tour": tour,
        "player_source": player_source,
        "discovered_players": discovered_players,
        "selected_players": len(players),
        "queued_missing": total,
        "skipped_main_app_images": skipped_source_images,
        "skipped_existing_analysis_images": skipped_existing_output,
        "saved": saved,
        "skipped": skipped,
        "failed": failed,
        "results": results,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Download missing ATP/WTA player images from Wikipedia into "
            "data_analysis/images. Default source uses full historic CSV archives."
        )
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=5000,
        help=(
            "Inspect only top N players per tour. In CSV mode, top N by match "
            "appearances. Use 0 for all discovered players. (default: 5000)"
        ),
    )
    parser.add_argument(
        "--player-source",
        choices=["csv", "manifest"],
        default="csv",
        help="Player discovery source (default: csv).",
    )
    parser.add_argument(
        "--min-appearances",
        type=int,
        default=1,
        help="CSV mode only: minimum match appearances required (default: 1).",
    )
    parser.add_argument(
        "--tour",
        choices=["atp", "wta", "both"],
        default="both",
        help="Select which tour to process (default: both).",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=20,
        help="HTTP timeout seconds (default: 20).",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.35,
        help="Delay between players in seconds (default: 0.35).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Simulate downloads without writing files.",
    )

    args = parser.parse_args()

    tours = ["atp", "wta"] if args.tour == "both" else [args.tour]

    # Ensure output root exists.
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    summary = {
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "top_n": args.top_n,
        "player_source": args.player_source,
        "min_appearances": args.min_appearances,
        "tour": args.tour,
        "dry_run": bool(args.dry_run),
        "items": [],
    }

    for tour in tours:
        print("=" * 72)
        print(f"Processing {tour.upper()} missing images from Wikipedia")
        print("=" * 72)
        result = run_tour(
            tour=tour,
            top_n=args.top_n,
            timeout=args.timeout,
            delay=args.delay,
            dry_run=args.dry_run,
            player_source=args.player_source,
            min_appearances=args.min_appearances,
        )
        summary["items"].append(result)

    report_path = OUTPUT_ROOT / "download_report.json"
    report_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print("\nFinal summary")
    print("-" * 72)
    total_saved = sum(item["saved"] for item in summary["items"])
    total_skipped = sum(item["skipped"] for item in summary["items"])
    total_failed = sum(item["failed"] for item in summary["items"])
    for item in summary["items"]:
        print(
            f"{item['tour'].upper()}: source={item['player_source']} "
            f"discovered={item['discovered_players']} "
            f"selected={item['selected_players']} "
            f"queued={item['queued_missing']} saved={item['saved']} "
            f"skipped={item['skipped']} failed={item['failed']}"
        )
    print(f"TOTAL: saved={total_saved} skipped={total_skipped} failed={total_failed}")
    print(f"Report: {report_path.relative_to(REPO_ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
