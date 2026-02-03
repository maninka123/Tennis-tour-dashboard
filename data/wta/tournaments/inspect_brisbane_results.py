#!/usr/bin/env python3
import json
import re
from pathlib import Path


def list_tournament_files():
    base = Path(__file__).resolve().parent
    return sorted([p for p in base.glob("*.json") if p.name[0].isdigit()])


def pick_tournament_file(files):
    if not files:
        return None
    print("Select a tournament draw to view:\n")
    for idx, path in enumerate(files, start=1):
        print(f"{idx:2d}. {path.name}")
    print("")
    choice = input("Enter number (or press Enter for 1): ").strip()
    if not choice:
        return files[0]
    try:
        index = int(choice)
    except ValueError:
        return None
    if 1 <= index <= len(files):
        return files[index - 1]
    return None


def format_score(score_text: str) -> str:
    if not score_text:
        return ""
    normalized = score_text.replace(",", " ").strip()
    parts = normalized.split()
    rebuilt = []
    for part in parts:
        match = re.match(r"^(\d)(\d)(\(\d+\))?$", part)
        if match:
            rebuilt.append(f"{match.group(1)}-{match.group(2)}{match.group(3) or ''}")
        else:
            rebuilt.append(part)
    return " ".join(rebuilt)


def parse_sets(score_text: str):
    if not score_text:
        return []
    normalized = score_text.replace(",", " ").strip()
    parts = normalized.split()
    rebuilt = []
    for part in parts:
        match = re.match(r"^(\d)(\d)(\(\d+\))?$", part)
        if match:
            rebuilt.append(f"{match.group(1)}-{match.group(2)}{match.group(3) or ''}")
        else:
            rebuilt.append(part)
    normalized = " ".join(rebuilt)
    tokens = re.findall(r"(\d+)-(\d+)(?:\((\d+)\))?", normalized)
    sets = []
    for a, b, tb in tokens:
        sets.append((int(a), int(b), tb))
    return sets


def decide_winner(p1, p2, score_text, winner_slot):
    if winner_slot == "A":
        return p1
    if winner_slot == "B":
        return p2
    sets = parse_sets(score_text)
    if not sets:
        return None
    p1_sets = sum(1 for a, b, _ in sets if a > b)
    p2_sets = sum(1 for a, b, _ in sets if b > a)
    if p1_sets > p2_sets:
        return p1
    if p2_sets > p1_sets:
        return p2
    return None


def round_labels(draw_size: int, round_ids):
    if draw_size >= 128:
        labels = ["R128", "R64", "R32", "R16", "QF", "SF", "F"]
    elif draw_size >= 64 or draw_size >= 48:
        labels = ["R64", "R32", "R16", "QF", "SF", "F"]
    elif draw_size >= 32:
        labels = ["R32", "R16", "QF", "SF", "F"]
    elif draw_size >= 16:
        labels = ["R16", "QF", "SF", "F"]
    else:
        labels = ["QF", "SF", "F"]

    ids = sorted({rid for rid in round_ids if rid is not None}, reverse=True)
    mapping = {}
    for idx, rid in enumerate(ids):
        if idx < len(labels):
            mapping[rid] = labels[idx]
    return mapping


def main():
    files = list_tournament_files()
    path = pick_tournament_file(files)
    if not path or not path.exists():
        print("No tournament JSON found for that selection.")
        return

    data = json.loads(path.read_text(encoding="utf-8"))
    draw = data.get("draw") or {}
    results = draw.get("results") or []
    draw_size = draw.get("draw_size") or data.get("draw_size_singles") or len(draw.get("draw_lines") or [])

    round_id_map = round_labels(draw_size, [r.get("round_id") for r in results])

    title = data.get('title') or data.get('name')
    start_date = data.get('start_date') or ''
    end_date = data.get('end_date') or ''
    date_range = f"{start_date} → {end_date}" if start_date or end_date else "N/A"

    print(f"🎾 Tournament: {title}")
    print(f"📅 Dates: {date_range}")
    print(f"🧮 Draw size: {draw_size}")
    print(f"📄 File: {path}")
    draw_lines = draw.get("draw_lines") or []
    seeds = [line for line in draw_lines if line.get("seed")]
    qualifiers = [line for line in draw_lines if str(line.get("entry_type", "")).upper() == "Q"]
    wildcards = [line for line in draw_lines if str(line.get("entry_type", "")).upper() in ("WC", "WILD", "WILDCARD", "Wc")]
    byes = [line for line in draw_lines if str(line.get("display", "")).lower() == "bye"]

    print(f"🌱 Seeds: {len(seeds)}  |  🎟️ Qualifiers: {len(qualifiers)}  |  ⭐ Wild Cards: {len(wildcards)}  |  💤 Byes: {len(byes)}")

    breakdown = draw.get("breakdown") or []
    if breakdown:
        print("\n💰 Prize Money by Round")
        print("------------------------")
        for place in breakdown:
            name = place.get("name") or ""
            points = place.get("points")
            prize = place.get("prize") or ""
            if points is not None:
                print(f"{name}: {prize} ({points} pts)")
            else:
                print(f"{name}: {prize}")
    print("-" * 60)

    for round_block in results:
        round_id = round_block.get("round_id")
        round_name = round_id_map.get(round_id, f"Round {round_id}")
        print(f"\n🎯 {round_name}")
        print("-" * len(round_name))
        for match in round_block.get("matches") or []:
            result_line = (match.get("result_name_and_score") or "").strip()
            if result_line:
                print(format_score(result_line))
                continue

            players = match.get("players") or []
            p1 = players[0]["display"] if len(players) > 0 else "TBD"
            p2 = players[1]["display"] if len(players) > 1 else "TBD"
            score_raw = match.get("result_score") or ""
            score = format_score(score_raw)
            winner_slot = match.get("winner_slot")
            winner = decide_winner(p1, p2, score_raw, winner_slot)
            if score:
                if winner:
                    loser = p2 if winner == p1 else p1
                    print(f"{winner} def {loser} {score}")
                else:
                    print(f"{p1} vs {p2} {score}")
            elif winner:
                print(f"{winner} def {p2 if winner == p1 else p1}")
            else:
                print(f"{p1} vs {p2}")

    # If final is missing from results, fall back to matches list
    final_in_results = any((r.get("round_id") in (1, "F") and (r.get("matches") or [])) for r in results)
    if not final_in_results:
        matches = data.get("matches") or []
        finals = [m for m in matches if m.get("round_id") == "F" and m.get("draw_match_type") == "S"]
        if finals:
            final = finals[0]
            if final.get("player_a") or final.get("player_b"):
                p1 = (final.get("player_a") or {}).get("name") or "Player A"
                p2 = (final.get("player_b") or {}).get("name") or "Player B"
            else:
                p1 = f"{final.get('PlayerNameFirstA','').strip()} {final.get('PlayerNameLastA','').strip()}".strip() or "Player A"
                p2 = f"{final.get('PlayerNameFirstB','').strip()} {final.get('PlayerNameLastB','').strip()}".strip() or "Player B"
            score = format_score(final.get("score_string") or "")
            print("\nFinal")
            print("-----")
            if score:
                print(f"{p1} def {p2} {score}")
            else:
                print(f"{p1} vs {p2}")


if __name__ == "__main__":
    main()
