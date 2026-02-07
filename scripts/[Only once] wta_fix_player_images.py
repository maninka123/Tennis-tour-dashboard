#!/usr/bin/env python3
import argparse
import io
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import requests

try:
    from PIL import Image
except Exception:
    Image = None

BASE_URL = "https://www.wtatennis.com"
RANKINGS_PAGE_URL = f"{BASE_URL}/rankings/singles"
RANKINGS_API_URL = "https://api.wtatennis.com/tennis/players/ranked"
CONTENT_PHOTO_API_URL = "https://api.wtatennis.com/content/wta/PHOTO/en"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/122.0.0.0 Safari/537.36"
)
IMAGE_NAME_PREFIX = "image"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
DEFAULT_DATA_DIR = "data/wta"
DEFAULT_LOAD_MORE_CLICKS = 5
DEFAULT_MAX_PLAYERS = 250
DEFAULT_TIMEOUT = 30
DEFAULT_LIMIT_FOLDERS = 0
DEFAULT_REFRESH_EXISTING = True
DEFAULT_DRY_RUN = False


@dataclass
class LocalPlayerFolder:
    folder: Path
    profile_path: Path
    profile: Dict[str, Any]
    player_id: int
    name: str


def _get_session() -> requests.Session:
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
            "Referer": BASE_URL,
        }
    )
    return session


def _read_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: Dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def _extract_player_id(profile: Dict[str, Any]) -> Optional[int]:
    url = (profile.get("url") or "").strip()
    match = re.search(r"/players/(\d+)/", url)
    if not match:
        return None
    return int(match.group(1))


def _scan_local_player_folders(data_dir: Path) -> List[LocalPlayerFolder]:
    folders: List[LocalPlayerFolder] = []
    for profile_path in sorted(data_dir.glob("*/profile.json")):
        try:
            profile = _read_json(profile_path)
        except Exception as exc:
            print(f"[WARN] Could not read JSON: {profile_path} ({exc})")
            continue

        player_id = _extract_player_id(profile)
        if player_id is None:
            print(f"[WARN] Missing player id in: {profile_path}")
            continue

        folders.append(
            LocalPlayerFolder(
                folder=profile_path.parent,
                profile_path=profile_path,
                profile=profile,
                player_id=player_id,
                name=(profile.get("name") or profile_path.parent.name).strip(),
            )
        )
    return folders


def _fetch_rankings_config(session: requests.Session, timeout: int) -> Dict[str, Any]:
    resp = session.get(RANKINGS_PAGE_URL, timeout=timeout)
    resp.raise_for_status()
    html = resp.text

    section_match = re.search(
        r'<section[^>]*class="[^"]*js-rankings[^"]*"[^>]*>',
        html,
        flags=re.IGNORECASE,
    )
    section_tag = section_match.group(0) if section_match else ""

    def attr(name: str, default: str) -> str:
        if not section_tag:
            return default
        match = re.search(
            rf'{re.escape(name)}\s*=\s*["\']?([^"\'>\s]+)',
            section_tag,
            flags=re.IGNORECASE,
        )
        return match.group(1).strip() if match else default

    return {
        "date": attr("data-date", ""),
        "metric": attr("data-metric", "SINGLES"),
        "type": attr("data-type", "rankSingles"),
        "sort": attr("data-sort", "asc"),
        "page_size": int(attr("data-page-size", "50")),
    }


def _fetch_ranked_players(
    session: requests.Session,
    config: Dict[str, Any],
    load_more_clicks: int,
    max_players: int,
    timeout: int,
) -> Dict[int, Dict[str, Any]]:
    ranked: Dict[int, Dict[str, Any]] = {}
    page_size = int(config.get("page_size", 50))
    pages = max(1, load_more_clicks)

    print(
        f"[INFO] Rankings source: {RANKINGS_PAGE_URL}\n"
        f"[INFO] Simulating Load More x{load_more_clicks} "
        f"(page_size={page_size}, target={max_players})"
    )

    for page in range(pages):
        params = {
            "page": page,
            "pageSize": page_size,
            "type": config.get("type", "rankSingles"),
            "sort": config.get("sort", "asc"),
            "metric": config.get("metric", "SINGLES"),
            "at": config.get("date", ""),
            "name": "",
            "nationality": "",
        }
        resp = session.get(RANKINGS_API_URL, params=params, timeout=timeout)
        resp.raise_for_status()
        rows = resp.json()
        if not isinstance(rows, list) or not rows:
            print(f"[WARN] No rows for rankings page={page}.")
            break

        for row in rows:
            player = row.get("player") or {}
            pid = player.get("id")
            if not pid:
                continue
            pid_int = int(pid)
            if pid_int in ranked:
                continue
            ranked[pid_int] = {
                "full_name": (player.get("fullName") or "").strip(),
                "first_name": (player.get("firstName") or "").strip(),
                "last_name": (player.get("lastName") or "").strip(),
                "rank": row.get("ranking"),
            }
            if len(ranked) >= max_players:
                break

        print(f"[INFO] Rankings page {page + 1}/{pages}: {len(rows)} rows, total={len(ranked)}")
        if len(ranked) >= max_players:
            break

    return ranked


def _chunks(items: List[int], size: int) -> List[List[int]]:
    return [items[i : i + size] for i in range(0, len(items), size)]


def _headshot_score(item: Dict[str, Any]) -> float:
    tags = {(tag.get("label") or "").strip().lower() for tag in item.get("tags") or []}
    score = 0.0
    if "full-body-headshot" in tags:
        score += 100.0
    if "head-cropped-photo" in tags:
        score += 80.0
    if "player-headshot" in tags:
        score += 40.0
    if item.get("onDemandUrl"):
        score += 10.0
    details = item.get("originalDetails") or {}
    width = details.get("width") or 0
    height = details.get("height") or 0
    score += min((width * height) / 100000.0, 20.0)
    return score


def _extract_headshot_url(item: Dict[str, Any]) -> str:
    image_url = (item.get("imageUrl") or "").strip()
    if image_url:
        return image_url

    on_demand = (item.get("onDemandUrl") or "").strip()
    if not on_demand:
        return ""
    if "?" in on_demand:
        return on_demand
    return f"{on_demand}?height=400"


def _fetch_headshot_url_map(
    session: requests.Session,
    player_ids: List[int],
    timeout: int,
    chunk_size: int = 20,
) -> Dict[int, str]:
    candidates: Dict[int, Tuple[float, str]] = {}
    chunks = _chunks(player_ids, chunk_size)
    total_chunks = len(chunks)

    for idx, chunk in enumerate(chunks, 1):
        chunk_set = set(chunk)
        reference_expression = " or ".join(f"TENNIS_PLAYER:{pid}" for pid in chunk)
        params = {
            "limit": 200,
            "tagNames": "player-headshot",
            "referenceExpression": reference_expression,
        }
        resp = session.get(CONTENT_PHOTO_API_URL, params=params, timeout=timeout)
        resp.raise_for_status()
        payload = resp.json()
        content_items = payload.get("content") or []

        for item in content_items:
            url = _extract_headshot_url(item)
            if not url:
                continue
            score = _headshot_score(item)
            refs = item.get("references") or []
            for ref in refs:
                if (ref.get("type") or "").upper() != "TENNIS_PLAYER":
                    continue
                ref_id = ref.get("id") or ref.get("sid")
                try:
                    pid = int(ref_id)
                except Exception:
                    continue
                if pid not in chunk_set:
                    continue
                best = candidates.get(pid)
                if best is None or score > best[0]:
                    candidates[pid] = (score, url)

        print(
            f"[INFO] Headshot lookup chunk {idx}/{total_chunks}: "
            f"refs={len(chunk)} content={len(content_items)}"
        )

    return {pid: url for pid, (_, url) in candidates.items()}


def _get_local_image_files(folder: Path) -> List[Path]:
    files: List[Path] = []
    for file in folder.iterdir():
        if not file.is_file():
            continue
        if file.stem != IMAGE_NAME_PREFIX:
            continue
        if file.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        files.append(file)
    return sorted(files)


def _validate_local_image(path: Path) -> bool:
    if not path.exists() or path.stat().st_size == 0:
        return False
    if Image is None:
        return True
    try:
        with Image.open(path) as img:
            img.verify()
        with Image.open(path) as img:
            img.load()
        return True
    except Exception:
        return False


def _validate_image_url(session: requests.Session, url: str, timeout: int) -> bool:
    if not url:
        return False
    try:
        with session.get(url, timeout=timeout, stream=True, allow_redirects=True) as resp:
            if resp.status_code != 200:
                return False
            content_type = (resp.headers.get("Content-Type") or "").lower()
            if "image" not in content_type:
                return False
            first_chunk = next(resp.iter_content(1024), b"")
            return bool(first_chunk)
    except Exception:
        return False


def _remove_other_image_files(folder: Path, keep: Path) -> None:
    for file in _get_local_image_files(folder):
        if file.resolve() == keep.resolve():
            continue
        file.unlink(missing_ok=True)


def _save_image_bytes(folder: Path, raw: bytes, content_type: str) -> Optional[Path]:
    if not raw:
        return None

    if Image is not None:
        try:
            with Image.open(io.BytesIO(raw)) as img:
                img.load()
                if img.format == "WEBP":
                    out_path = folder / "image.jpg"
                    img.convert("RGB").save(out_path, format="JPEG", quality=92)
                    _remove_other_image_files(folder, out_path)
                    return out_path

                ext_map = {"JPEG": ".jpg", "JPG": ".jpg", "PNG": ".png"}
                ext = ext_map.get((img.format or "").upper(), ".jpg")
                out_path = folder / f"image{ext}"
                out_path.write_bytes(raw)
                _remove_other_image_files(folder, out_path)
                return out_path
        except Exception:
            pass

    ct = (content_type or "").lower()
    ext = ".jpg"
    if "png" in ct:
        ext = ".png"
    elif "webp" in ct:
        ext = ".webp"
    out_path = folder / f"image{ext}"
    out_path.write_bytes(raw)
    _remove_other_image_files(folder, out_path)
    return out_path


def _download_and_store_image(
    session: requests.Session, url: str, folder: Path, timeout: int
) -> Optional[Path]:
    resp = session.get(url, timeout=timeout, allow_redirects=True)
    if resp.status_code != 200:
        return None
    content_type = resp.headers.get("Content-Type", "")
    if "image" not in content_type.lower():
        return None
    return _save_image_bytes(folder, resp.content, content_type)


def _format_name(name: str, fallback: str) -> str:
    return name.strip() if name and name.strip() else fallback


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Audit WTA player folder images, detect missing/broken files/URLs, "
            "and backfill from official WTA rankings + headshot APIs."
        )
    )
    parser.add_argument("--data-dir", default=DEFAULT_DATA_DIR, help="Local WTA data folder")
    parser.add_argument(
        "--load-more-clicks",
        type=int,
        default=DEFAULT_LOAD_MORE_CLICKS,
        help="How many 'Load More' pages to fetch from rankings (default: 5 => 250 players)",
    )
    parser.add_argument("--max-players", type=int, default=DEFAULT_MAX_PLAYERS, help="Max ranked players to fetch")
    parser.add_argument("--timeout", type=int, default=DEFAULT_TIMEOUT, help="HTTP timeout in seconds")
    parser.add_argument(
        "--limit-folders",
        type=int,
        default=DEFAULT_LIMIT_FOLDERS,
        help="Process only first N local folders (0 means all)",
    )
    parser.set_defaults(
        refresh_existing=DEFAULT_REFRESH_EXISTING,
        dry_run=DEFAULT_DRY_RUN,
    )
    parser.add_argument(
        "--refresh-existing",
        dest="refresh_existing",
        action="store_true",
        help="Redownload image file even if local file already looks valid",
    )
    parser.add_argument(
        "--no-refresh-existing",
        dest="refresh_existing",
        action="store_false",
        help="Keep existing valid local images and only fill missing/broken ones",
    )
    parser.add_argument(
        "--dry-run",
        dest="dry_run",
        action="store_true",
        help="Print actions without writing files",
    )
    parser.add_argument(
        "--no-dry-run",
        dest="dry_run",
        action="store_false",
        help="Apply changes (write files)",
    )
    args, unknown_args = parser.parse_known_args()
    if unknown_args:
        print(f"[WARN] Ignoring unknown args: {' '.join(unknown_args)}")

    if len(sys.argv) == 1:
        print(
            "[INFO] Running with defaults: "
            f"data_dir={args.data_dir}, load_more_clicks={args.load_more_clicks}, "
            f"max_players={args.max_players}, timeout={args.timeout}, "
            f"limit_folders={args.limit_folders}, dry_run={args.dry_run}, "
            f"refresh_existing={args.refresh_existing}"
        )

    data_dir = Path(args.data_dir)
    if not data_dir.exists():
        print(f"[ERROR] data directory not found: {data_dir}")
        return 1

    session = _get_session()

    local_folders = _scan_local_player_folders(data_dir)
    if not local_folders:
        print("[ERROR] No local player folders with profile.json found.")
        return 1
    if args.limit_folders > 0:
        local_folders = local_folders[: args.limit_folders]

    config = _fetch_rankings_config(session, args.timeout)
    if not config.get("date"):
        print("[WARN] Could not read rankings date from page; continuing with API defaults.")

    ranked_map = _fetch_ranked_players(
        session=session,
        config=config,
        load_more_clicks=args.load_more_clicks,
        max_players=args.max_players,
        timeout=args.timeout,
    )
    if not ranked_map:
        print("[ERROR] Could not fetch ranked players from WTA API.")
        return 1

    headshot_map = _fetch_headshot_url_map(
        session=session,
        player_ids=list(ranked_map.keys()),
        timeout=args.timeout,
    )
    print(f"[INFO] Headshot URLs resolved: {len(headshot_map)}")

    stats = {
        "processed": 0,
        "skipped": 0,
        "updated_profile_only": 0,
        "downloaded_or_replaced": 0,
        "missing_rankings_match": 0,
        "unresolved_missing": 0,
    }

    total = len(local_folders)
    print(f"[INFO] Processing local folders: {total}\n")

    for idx, local in enumerate(local_folders, 1):
        stats["processed"] += 1
        ranked = ranked_map.get(local.player_id)
        ranked_name = ranked.get("full_name") if ranked else ""
        display_name = _format_name(local.name, local.folder.name)
        official_name = _format_name(ranked_name, display_name)

        image_files = _get_local_image_files(local.folder)
        local_valid_path = None
        for image_file in image_files:
            if _validate_local_image(image_file):
                local_valid_path = image_file
                break

        existing_url = (local.profile.get("image_url") or "").strip()
        existing_url_valid = _validate_image_url(session, existing_url, args.timeout) if existing_url else False
        replacement_url = headshot_map.get(local.player_id, "").strip()

        print(f"[{idx:03d}/{total:03d}] {local.folder.name} | {official_name} (id={local.player_id})")
        print(
            f"  local_image: "
            f"{local_valid_path.name if local_valid_path else 'MISSING_OR_BROKEN'} | "
            f"profile_url: {'VALID' if existing_url_valid else ('MISSING' if not existing_url else 'BROKEN')} | "
            f"rankings_url: {'FOUND' if replacement_url else 'NOT_FOUND'}"
        )

        if ranked is None:
            stats["missing_rankings_match"] += 1
            print("  action: SKIP (player not in fetched rankings range)\n")
            continue

        target_url = replacement_url or (existing_url if existing_url_valid else "")
        needs_profile_update = bool(target_url) and (existing_url != target_url)
        needs_local_file = local_valid_path is None or args.refresh_existing

        if not target_url:
            if existing_url and not existing_url_valid:
                if not args.dry_run:
                    local.profile["image_url"] = ""
                    _write_json(local.profile_path, local.profile)
                print("  action: CLEARED broken image_url (no replacement found)\n")
            else:
                print("  action: SKIP (no usable image URL found)\n")
            if local_valid_path is None:
                stats["unresolved_missing"] += 1
            else:
                stats["skipped"] += 1
            continue

        if args.dry_run:
            if needs_local_file:
                print("  action: DRY-RUN replace/download image file")
            elif needs_profile_update:
                print("  action: DRY-RUN update profile image_url only")
            else:
                print("  action: DRY-RUN skip (already valid)")
            print("")
            continue

        wrote_local = False
        if needs_local_file:
            saved = _download_and_store_image(session, target_url, local.folder, args.timeout)
            if saved is not None and _validate_local_image(saved):
                wrote_local = True
                local_valid_path = saved
            else:
                print("  action: FAILED download (kept existing state)\n")
                stats["unresolved_missing"] += 1
                continue

        if needs_profile_update or (local.profile.get("image_url") or "") != target_url:
            local.profile["image_url"] = target_url
            _write_json(local.profile_path, local.profile)
            if wrote_local:
                print(f"  action: REPLACED image -> {local_valid_path.name}, updated profile image_url\n")
                stats["downloaded_or_replaced"] += 1
            else:
                print("  action: UPDATED profile image_url (local image kept)\n")
                stats["updated_profile_only"] += 1
        else:
            if wrote_local:
                print(f"  action: REPLACED image -> {local_valid_path.name}\n")
                stats["downloaded_or_replaced"] += 1
            else:
                print("  action: SKIP (already valid)\n")
                stats["skipped"] += 1

    print("========== SUMMARY ==========")
    print(f"processed:              {stats['processed']}")
    print(f"downloaded/replaced:    {stats['downloaded_or_replaced']}")
    print(f"updated profile only:   {stats['updated_profile_only']}")
    print(f"skipped:                {stats['skipped']}")
    print(f"no rankings match:      {stats['missing_rankings_match']}")
    print(f"unresolved missing:     {stats['unresolved_missing']}")
    print("=============================")

    return 0


if __name__ == "__main__":
    sys.exit(main())
