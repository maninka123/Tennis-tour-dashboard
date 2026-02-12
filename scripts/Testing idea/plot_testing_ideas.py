#!/usr/bin/env python3
"""
Testing Ideas Plot Lab
----------------------
Prototype chart generator for tennis analytics ideas using local historic CSV files.

No argparse is used. Edit the CONFIG variables below and run:
    python3 "scripts/Testing idea/plot_testing_ideas.py"

The script:
1) loads historic match data,
2) builds a player-centric match table,
3) renders one selected plot idea (or all),
4) saves output files under scripts/Testing idea/outputs,
5) shows each plot before closing when a GUI display is available.
"""

from __future__ import annotations

import os
import re
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.colors import LinearSegmentedColormap

try:
    from sklearn.decomposition import PCA
    from sklearn.cluster import KMeans
    from sklearn.linear_model import LogisticRegression
except Exception:  # pragma: no cover - optional dependency
    PCA = None
    KMeans = None
    LogisticRegression = None

try:
    import plotly.graph_objects as go
except Exception:  # pragma: no cover - optional dependency
    go = None


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


# =============================================================================
# CONFIG - edit these variables (no argparse needed)
# =============================================================================

TOUR = os.getenv("TI_TOUR", "atp")  # "atp" or "wta"
SELECTED_PLAYER = os.getenv("TI_PLAYER", "Novak Djokovic")
SELECTED_IDEA = os.getenv("TI_IDEA", "player_form_engine")
# Use "all" to generate every idea in one run.

SELECTED_METRIC = os.getenv("TI_METRIC", "win_pct")
# Used by some ideas; allowed values include:
# "win_pct", "titles", "finals", "avg_round", "wins", "matches"

SECOND_PLAYER = os.getenv("TI_SECOND_PLAYER", "Rafael Nadal")
COMPARISON_PLAYERS: List[str] = [
    x.strip() for x in os.getenv("TI_COMPARISON_PLAYERS", "").split(",") if x.strip()
]
SELECTED_TOURNAMENT = os.getenv("TI_TOURNAMENT", "Wimbledon")

START_YEAR = int(os.getenv("TI_START_YEAR", "2010"))
END_YEAR = int(os.getenv("TI_END_YEAR", "2026"))
MIN_MATCHES_PER_PLAYER = int(os.getenv("TI_MIN_MATCHES", "40"))
FORM_WINDOWS = tuple(int(x.strip()) for x in os.getenv("TI_FORM_WINDOWS", "10,25,50").split(",") if x.strip())
if len(FORM_WINDOWS) < 1:
    FORM_WINDOWS = (10, 25, 50)

SHOW_PLOTS = _env_bool("TI_SHOW_PLOTS", True)
SAVE_PLOTS = _env_bool("TI_SAVE_PLOTS", True)


# =============================================================================
# Paths and constants
# =============================================================================

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
OUTPUT_DIR = SCRIPT_DIR / "outputs"

IDEAS = [
    "player_form_engine",
    "surface_strength_matrix",
    "opponent_quality_plot",
    "round_performance_funnel",
    "pressure_stats",
    "serve_return_radar",
    "rivalry_momentum",
    "tournament_dna",
    "era_comparison",
    "records_evolution",
    "bump_chart",
    "calendar_heatmap",
    "level_round_sankey",
    "duration_boxplot",
    "small_multiples_surface",
    "scatter_quadrants",
    "elo_trajectory",
    "win_probability_model",
    "style_clustering_pca",
]

ROUND_ORDER = ["R128", "R64", "R32", "R16", "QF", "SF", "F"]
ROUND_WEIGHT = {"R128": 1, "R64": 2, "R32": 3, "R16": 4, "QF": 5, "SF": 6, "F": 7, "RR": 2, "BR": 0}
SURFACE_ORDER = ["Hard", "Clay", "Grass", "Indoor", "Carpet", "Other"]

ATP_LEVEL_LABELS = {
    "G": "Grand Slam",
    "M": "Masters 1000",
    "F": "Tour Finals",
    "500": "ATP 500",
    "250": "ATP 250",
    "125": "ATP 125",
    "A": "Tour Event",
    "D": "Team Event",
    "O": "Other",
}

WTA_LEVEL_LABELS = {
    "G": "Grand Slam",
    "P": "WTA 1000",
    "PM": "WTA 1000",
    "W": "WTA Finals",
    "F": "WTA Finals",
    "I": "WTA 250",
    "D": "Team Event",
    "O": "Other",
}


@dataclass
class PlotResult:
    idea: str
    saved_paths: List[Path]


def is_headless() -> bool:
    if os.name == "nt":
        return False
    return not bool(os.environ.get("DISPLAY"))


HEADLESS = is_headless()
ACTIVE_SHOW = SHOW_PLOTS and not HEADLESS


def slugify(text: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", str(text or "").strip().lower()).strip("-")
    return value or "plot"


def safe_div(numer: pd.Series | np.ndarray | float, denom: pd.Series | np.ndarray | float) -> pd.Series | np.ndarray:
    numer_arr = np.asarray(numer, dtype=float)
    denom_arr = np.asarray(denom, dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        out = np.where(denom_arr > 0, numer_arr / denom_arr, np.nan)
    return out


def level_labels() -> Dict[str, str]:
    return ATP_LEVEL_LABELS if TOUR.lower() == "atp" else WTA_LEVEL_LABELS


def level_sort_order() -> List[str]:
    if TOUR.lower() == "atp":
        return ["Grand Slam", "Masters 1000", "Tour Finals", "ATP 500", "ATP 250", "ATP 125", "Tour Event", "Team Event", "Other"]
    return ["Grand Slam", "WTA 1000", "WTA Finals", "WTA 500", "WTA 250", "Team Event", "Other"]


def detect_surface(surface_raw: str, indoor_raw: str) -> str:
    surface = str(surface_raw or "").strip().lower()
    indoor = str(indoor_raw or "").strip().upper()
    if "clay" in surface:
        return "Clay"
    if "grass" in surface:
        return "Grass"
    if "carpet" in surface:
        return "Carpet"
    if "indoor" in surface or indoor == "I":
        return "Indoor"
    if "hard" in surface:
        return "Hard"
    return "Other"


def map_wta_level(level: str, tourney_name: str) -> str:
    lvl = str(level or "").strip().upper()
    name = str(tourney_name or "")
    if lvl == "P":
        if re.search(r"\b500\b", name):
            return "WTA 500"
        return "WTA 1000"
    if lvl == "I":
        return "WTA 250"
    if lvl in WTA_LEVEL_LABELS:
        return WTA_LEVEL_LABELS[lvl]
    return "Other"


def load_match_data() -> pd.DataFrame:
    data_dir = PROJECT_ROOT / ("historic data" if TOUR.lower() == "atp" else "historic data_wta")
    if not data_dir.exists():
        raise FileNotFoundError(f"Data directory not found: {data_dir}")

    files = []
    for csv_path in sorted(data_dir.glob("*.csv")):
        if not csv_path.stem.isdigit():
            continue
        y = int(csv_path.stem)
        if y < START_YEAR or y > END_YEAR:
            continue
        files.append((y, csv_path))

    if not files:
        raise RuntimeError(f"No yearly CSV files found for {TOUR.upper()} in {data_dir} for {START_YEAR}-{END_YEAR}.")

    frames: List[pd.DataFrame] = []
    for year, path in files:
        df = pd.read_csv(path, low_memory=False)
        df["file_year"] = year
        frames.append(df)

    match_df = pd.concat(frames, ignore_index=True)

    # Ensure expected columns exist.
    expected_cols = [
        "tourney_name", "surface", "indoor", "tourney_level", "tourney_date", "round", "minutes", "score",
        "winner_name", "loser_name", "winner_age", "loser_age", "winner_rank", "loser_rank",
        "winner_rank_points", "loser_rank_points",
        "w_ace", "l_ace", "w_df", "l_df", "w_svpt", "l_svpt", "w_1stIn", "l_1stIn",
        "w_1stWon", "l_1stWon", "w_2ndWon", "l_2ndWon", "w_SvGms", "l_SvGms",
        "w_bpSaved", "l_bpSaved", "w_bpFaced", "l_bpFaced",
    ]
    for col in expected_cols:
        if col not in match_df.columns:
            match_df[col] = np.nan

    numeric_cols = [
        "minutes", "winner_age", "loser_age", "winner_rank", "loser_rank",
        "winner_rank_points", "loser_rank_points",
        "w_ace", "l_ace", "w_df", "l_df", "w_svpt", "l_svpt", "w_1stIn", "l_1stIn",
        "w_1stWon", "l_1stWon", "w_2ndWon", "l_2ndWon", "w_SvGms", "l_SvGms",
        "w_bpSaved", "l_bpSaved", "w_bpFaced", "l_bpFaced",
    ]
    for col in numeric_cols:
        match_df[col] = pd.to_numeric(match_df[col], errors="coerce")

    date_text = match_df["tourney_date"].astype(str).str.extract(r"(\d{8})", expand=False)
    match_df["date"] = pd.to_datetime(date_text, format="%Y%m%d", errors="coerce")
    match_df = match_df.dropna(subset=["date", "winner_name", "loser_name"]).copy()

    if TOUR.lower() == "atp":
        match_df["level_label"] = match_df["tourney_level"].astype(str).map(ATP_LEVEL_LABELS).fillna("Other")
    else:
        match_df["level_label"] = match_df.apply(
            lambda r: map_wta_level(r.get("tourney_level"), r.get("tourney_name")),
            axis=1,
        )

    match_df["surface_label"] = match_df.apply(
        lambda r: detect_surface(r.get("surface"), r.get("indoor")),
        axis=1,
    )
    match_df["round"] = match_df["round"].astype(str).str.upper().str.strip()
    match_df["round_weight"] = match_df["round"].map(ROUND_WEIGHT).fillna(0)
    match_df["year"] = match_df["date"].dt.year
    match_df["month"] = match_df["date"].dt.month
    match_df["has_tiebreak"] = match_df["score"].astype(str).str.contains(r"7-6|6-7", regex=True, na=False)

    return match_df


def build_player_view(match_df: pd.DataFrame) -> pd.DataFrame:
    base = match_df.copy()
    base["match_id"] = np.arange(len(base))

    win_rows = pd.DataFrame(
        {
            "match_id": base["match_id"],
            "date": base["date"],
            "year": base["year"],
            "month": base["month"],
            "tourney_name": base["tourney_name"],
            "level_label": base["level_label"],
            "surface_label": base["surface_label"],
            "round": base["round"],
            "round_weight": base["round_weight"],
            "minutes": base["minutes"],
            "score": base["score"],
            "is_win": 1,
            "is_final": (base["round"] == "F").astype(int),
            "player_name": base["winner_name"],
            "opponent_name": base["loser_name"],
            "player_age": base["winner_age"],
            "player_rank": base["winner_rank"],
            "opponent_rank": base["loser_rank"],
            "player_rank_points": base["winner_rank_points"],
            "opponent_rank_points": base["loser_rank_points"],
            "aces": base["w_ace"],
            "double_faults": base["w_df"],
            "svpt": base["w_svpt"],
            "first_in": base["w_1stIn"],
            "first_won": base["w_1stWon"],
            "second_won": base["w_2ndWon"],
            "service_games": base["w_SvGms"],
            "bp_saved": base["w_bpSaved"],
            "bp_faced": base["w_bpFaced"],
            "opp_svpt": base["l_svpt"],
            "opp_first_won": base["l_1stWon"],
            "opp_second_won": base["l_2ndWon"],
            "opp_bp_saved": base["l_bpSaved"],
            "opp_bp_faced": base["l_bpFaced"],
        }
    )

    lose_rows = pd.DataFrame(
        {
            "match_id": base["match_id"],
            "date": base["date"],
            "year": base["year"],
            "month": base["month"],
            "tourney_name": base["tourney_name"],
            "level_label": base["level_label"],
            "surface_label": base["surface_label"],
            "round": base["round"],
            "round_weight": base["round_weight"],
            "minutes": base["minutes"],
            "score": base["score"],
            "is_win": 0,
            "is_final": (base["round"] == "F").astype(int),
            "player_name": base["loser_name"],
            "opponent_name": base["winner_name"],
            "player_age": base["loser_age"],
            "player_rank": base["loser_rank"],
            "opponent_rank": base["winner_rank"],
            "player_rank_points": base["loser_rank_points"],
            "opponent_rank_points": base["winner_rank_points"],
            "aces": base["l_ace"],
            "double_faults": base["l_df"],
            "svpt": base["l_svpt"],
            "first_in": base["l_1stIn"],
            "first_won": base["l_1stWon"],
            "second_won": base["l_2ndWon"],
            "service_games": base["l_SvGms"],
            "bp_saved": base["l_bpSaved"],
            "bp_faced": base["l_bpFaced"],
            "opp_svpt": base["w_svpt"],
            "opp_first_won": base["w_1stWon"],
            "opp_second_won": base["w_2ndWon"],
            "opp_bp_saved": base["w_bpSaved"],
            "opp_bp_faced": base["w_bpFaced"],
        }
    )

    all_rows = pd.concat([win_rows, lose_rows], ignore_index=True)
    for col in [
        "aces", "double_faults", "svpt", "first_in", "first_won", "second_won", "service_games",
        "bp_saved", "bp_faced", "opp_svpt", "opp_first_won", "opp_second_won", "opp_bp_saved", "opp_bp_faced",
        "player_rank", "opponent_rank", "player_rank_points", "opponent_rank_points", "minutes", "player_age",
    ]:
        all_rows[col] = pd.to_numeric(all_rows[col], errors="coerce")

    all_rows["titles"] = ((all_rows["is_win"] == 1) & (all_rows["is_final"] == 1)).astype(int)
    all_rows["finals"] = all_rows["is_final"].astype(int)

    all_rows["ace_rate"] = safe_div(all_rows["aces"], all_rows["svpt"])
    all_rows["df_rate"] = safe_div(all_rows["double_faults"], all_rows["svpt"])
    all_rows["first_serve_won_pct"] = safe_div(all_rows["first_won"], all_rows["first_in"]) * 100
    all_rows["second_serve_won_pct"] = safe_div(all_rows["second_won"], (all_rows["svpt"] - all_rows["first_in"])) * 100
    all_rows["return_pts_won_pct"] = safe_div(
        all_rows["opp_svpt"] - all_rows["opp_first_won"] - all_rows["opp_second_won"],
        all_rows["opp_svpt"],
    ) * 100

    all_rows["bp_saved_pct"] = safe_div(all_rows["bp_saved"], all_rows["bp_faced"]) * 100
    all_rows["bp_won"] = all_rows["opp_bp_faced"] - all_rows["opp_bp_saved"]
    all_rows["bp_chances"] = all_rows["opp_bp_faced"]
    all_rows["bp_won_pct"] = safe_div(all_rows["bp_won"], all_rows["bp_chances"]) * 100

    all_rows["rank_gap"] = all_rows["opponent_rank"] - all_rows["player_rank"]
    all_rows = all_rows.replace([np.inf, -np.inf], np.nan)
    return all_rows


def resolve_player_name(all_rows: pd.DataFrame, desired_name: str) -> str:
    desired = str(desired_name or "").strip().lower()
    if not desired:
        raise ValueError("SELECTED_PLAYER cannot be empty.")

    player_counts = all_rows["player_name"].value_counts()
    exact = [name for name in player_counts.index if str(name).strip().lower() == desired]
    if exact:
        return exact[0]

    contains = [name for name in player_counts.index if desired in str(name).strip().lower()]
    if contains:
        return contains[0]

    top_examples = ", ".join(player_counts.head(8).index.tolist())
    raise ValueError(f"Player '{desired_name}' not found. Try one of: {top_examples}")


def player_df_for(all_rows: pd.DataFrame, player_name: str) -> pd.DataFrame:
    df = all_rows[all_rows["player_name"] == player_name].copy()
    df = df.sort_values("date").reset_index(drop=True)
    df["match_index"] = np.arange(1, len(df) + 1)
    df["rank_delta"] = df["player_rank"].shift(1) - df["player_rank"]
    df["rank_points_delta"] = df["player_rank_points"] - df["player_rank_points"].shift(1)
    for w in FORM_WINDOWS:
        df[f"rolling_win_{w}"] = df["is_win"].rolling(w, min_periods=max(3, w // 2)).mean() * 100
    return df


def choose_peers(all_rows: pd.DataFrame, player_name: str, count: int = 4) -> List[str]:
    totals = (
        all_rows.groupby("player_name")["is_win"]
        .agg(matches="count", wins="sum")
        .reset_index()
        .query("matches >= @MIN_MATCHES_PER_PLAYER")
        .sort_values(["wins", "matches"], ascending=False)
    )
    peers = [p for p in totals["player_name"].tolist() if p != player_name][:count]
    return peers


def finalize_matplotlib(fig: plt.Figure, idea_name: str, suffix: str = "") -> List[Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
    stem = f"{stamp}_{slugify(idea_name)}"
    if suffix:
        stem += f"_{slugify(suffix)}"
    out_path = OUTPUT_DIR / f"{stem}.png"

    saved: List[Path] = []
    if SAVE_PLOTS:
        fig.savefig(out_path, dpi=180, bbox_inches="tight")
        saved.append(out_path)
        print(f"[saved] {out_path}")

    if ACTIVE_SHOW:
        plt.show()
    plt.close(fig)
    return saved


def finalize_plotly(fig, idea_name: str) -> List[Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    stamp = pd.Timestamp.now().strftime("%Y%m%d_%H%M%S")
    out_html = OUTPUT_DIR / f"{stamp}_{slugify(idea_name)}.html"
    saved: List[Path] = []

    if SAVE_PLOTS:
        fig.write_html(out_html, include_plotlyjs="cdn")
        saved.append(out_html)
        print(f"[saved] {out_html}")

    if ACTIVE_SHOW:
        fig.show()
    return saved


def plot_player_form_engine(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    fig, axes = plt.subplots(3, 1, figsize=(14, 11), sharex=True)
    fig.suptitle(f"Player Form Engine: {SELECTED_PLAYER}", fontsize=15, fontweight="bold")

    ax = axes[0]
    for w, color in zip(FORM_WINDOWS, ["#2563eb", "#16a34a", "#ea580c"]):
        series = pdf[f"rolling_win_{w}"]
        ax.plot(pdf["date"], series, label=f"Rolling {w} win %", linewidth=2, color=color)
    ax.set_ylabel("Win %")
    ax.set_ylim(0, 100)
    ax.grid(alpha=0.2)
    ax.legend(loc="upper left")

    ax = axes[1]
    ax.plot(pdf["date"], pdf["rank_delta"].rolling(10, min_periods=3).mean(), color="#7c3aed", linewidth=2, label="Rolling rank delta (10)")
    ax.axhline(0, color="#111827", linewidth=1, alpha=0.4)
    ax.set_ylabel("Rank Δ")
    ax.grid(alpha=0.2)
    ax.legend(loc="upper left")

    ax = axes[2]
    ax.plot(pdf["date"], pdf["rank_points_delta"].rolling(10, min_periods=3).mean(), color="#0891b2", linewidth=2, label="Rolling rank-points delta (10)")
    ax.axhline(0, color="#111827", linewidth=1, alpha=0.4)
    ax.set_ylabel("Rank Pts Δ")
    ax.grid(alpha=0.2)
    ax.legend(loc="upper left")
    ax.set_xlabel("Date")

    saved = finalize_matplotlib(fig, "player_form_engine", SELECTED_PLAYER)
    return PlotResult("player_form_engine", saved)


def plot_surface_strength_matrix(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    group = (
        pdf.groupby(["surface_label", "level_label"], as_index=False)
        .agg(
            matches=("is_win", "size"),
            wins=("is_win", "sum"),
            titles=("titles", "sum"),
            finals=("is_final", "sum"),
            avg_round=("round_weight", "mean"),
        )
    )
    group["win_pct"] = safe_div(group["wins"], group["matches"]) * 100
    metric = SELECTED_METRIC if SELECTED_METRIC in {"win_pct", "titles", "finals", "avg_round", "wins", "matches"} else "win_pct"
    if metric in {"wins", "matches"}:
        group[metric] = group[metric]

    pivot = group.pivot(index="surface_label", columns="level_label", values=metric)
    pivot = pivot.reindex(index=SURFACE_ORDER).dropna(how="all")
    pivot = pivot.reindex(columns=[c for c in level_sort_order() if c in pivot.columns])

    fig, ax = plt.subplots(figsize=(12, 6))
    cmap = LinearSegmentedColormap.from_list("matrix", ["#eff6ff", "#93c5fd", "#2563eb", "#1e3a8a"])
    data = pivot.fillna(np.nan).values
    im = ax.imshow(data, cmap=cmap, aspect="auto")
    fig.colorbar(im, ax=ax, shrink=0.9, label=metric.replace("_", " ").title())

    ax.set_xticks(np.arange(len(pivot.columns)))
    ax.set_xticklabels(pivot.columns, rotation=30, ha="right")
    ax.set_yticks(np.arange(len(pivot.index)))
    ax.set_yticklabels(pivot.index)
    ax.set_title(f"Surface Strength Matrix ({metric.replace('_', ' ').title()}): {SELECTED_PLAYER}", fontsize=14, fontweight="bold")

    for i in range(len(pivot.index)):
        for j in range(len(pivot.columns)):
            val = pivot.iloc[i, j]
            if pd.notna(val):
                txt = f"{val:.1f}" if metric in {"win_pct", "avg_round"} else f"{int(round(val))}"
                ax.text(j, i, txt, ha="center", va="center", color="#0f172a", fontsize=9, fontweight="bold")

    saved = finalize_matplotlib(fig, "surface_strength_matrix", f"{SELECTED_PLAYER}_{metric}")
    return PlotResult("surface_strength_matrix", saved)


def plot_opponent_quality(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    ranks = pd.to_numeric(pdf["opponent_rank"], errors="coerce")
    bins = [0, 5, 10, 20, 50, 100, 200, 500, np.inf]
    labels = ["Top 5", "Top 10", "Top 20", "Top 50", "Top 100", "Top 200", "Top 500", "500+"]
    bucket = pd.cut(ranks, bins=bins, labels=labels, include_lowest=True)

    grp = (
        pd.DataFrame({"bucket": bucket, "is_win": pdf["is_win"]})
        .dropna(subset=["bucket"])
        .groupby("bucket", observed=True, as_index=False)
        .agg(matches=("is_win", "size"), wins=("is_win", "sum"))
    )
    grp["win_pct"] = safe_div(grp["wins"], grp["matches"]) * 100

    fig, ax1 = plt.subplots(figsize=(12, 6))
    ax2 = ax1.twinx()
    ax1.bar(grp["bucket"].astype(str), grp["win_pct"], color="#3b82f6", alpha=0.85, label="Win %")
    ax2.plot(grp["bucket"].astype(str), grp["matches"], color="#111827", marker="o", linewidth=2, label="Matches")
    ax1.set_ylim(0, 100)
    ax1.set_ylabel("Win %")
    ax2.set_ylabel("Matches")
    ax1.set_title(f"Opponent Quality Plot: {SELECTED_PLAYER}")
    ax1.grid(axis="y", alpha=0.2)
    ax1.tick_params(axis="x", rotation=25)

    saved = finalize_matplotlib(fig, "opponent_quality_plot", SELECTED_PLAYER)
    return PlotResult("opponent_quality_plot", saved)


def plot_round_funnel(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    appearances = pdf[pdf["round"].isin(ROUND_ORDER)].groupby("round", as_index=False).agg(
        appearances=("is_win", "size"),
        wins=("is_win", "sum"),
    )
    app_map = appearances.set_index("round")["appearances"].to_dict()
    title_count = int(pdf["titles"].sum())

    stages = ROUND_ORDER[:-1]
    conv_values = []
    for idx, stage in enumerate(stages):
        current = app_map.get(stage, 0)
        nxt = app_map.get(ROUND_ORDER[idx + 1], 0)
        conv = (nxt / current * 100) if current > 0 else np.nan
        conv_values.append(conv)
    finals = app_map.get("F", 0)
    conv_values.append((title_count / finals * 100) if finals > 0 else np.nan)
    labels = [f"{s} -> {ROUND_ORDER[i+1]}" for i, s in enumerate(stages)] + ["F -> Title"]

    fig, ax = plt.subplots(figsize=(11, 6))
    y = np.arange(len(labels))
    vals = np.nan_to_num(conv_values, nan=0.0)
    bars = ax.barh(y, vals, color="#16a34a", alpha=0.85)
    ax.set_yticks(y)
    ax.set_yticklabels(labels)
    ax.set_xlim(0, 100)
    ax.set_xlabel("Conversion %")
    ax.set_title(f"Round Performance Funnel: {SELECTED_PLAYER}")
    ax.grid(axis="x", alpha=0.2)
    for bar, val in zip(bars, conv_values):
        txt = "-" if np.isnan(val) else f"{val:.1f}%"
        ax.text(bar.get_width() + 1.2, bar.get_y() + bar.get_height() / 2, txt, va="center", fontsize=9)

    saved = finalize_matplotlib(fig, "round_performance_funnel", SELECTED_PLAYER)
    return PlotResult("round_performance_funnel", saved)


def plot_pressure_stats(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    trend = pdf.copy()
    trend["bp_saved_trend"] = trend["bp_saved_pct"].rolling(15, min_periods=5).mean()
    trend["bp_won_trend"] = trend["bp_won_pct"].rolling(15, min_periods=5).mean()

    fig, ax = plt.subplots(figsize=(12, 6))
    ax.plot(trend["date"], trend["bp_saved_trend"], color="#2563eb", linewidth=2.2, label="Break Points Saved % (rolling 15)")
    ax.plot(trend["date"], trend["bp_won_trend"], color="#dc2626", linewidth=2.2, label="Break Points Won % (rolling 15)")
    ax.set_ylim(0, 100)
    ax.set_ylabel("%")
    ax.set_title(f"Pressure Stats Trend: {SELECTED_PLAYER}")
    ax.grid(alpha=0.2)
    ax.legend(loc="upper left")

    saved = finalize_matplotlib(fig, "pressure_stats", SELECTED_PLAYER)
    return PlotResult("pressure_stats", saved)


def plot_serve_return_radar(pdf: pd.DataFrame, all_rows: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    recent = pdf.tail(80).copy()
    if recent.empty:
        recent = pdf

    metrics = {
        "Ace Rate": recent["ace_rate"].mean() * 100,
        "1st Serve Won %": recent["first_serve_won_pct"].mean(),
        "2nd Serve Won %": recent["second_serve_won_pct"].mean(),
        "Return Pts Won %": recent["return_pts_won_pct"].mean(),
        "BP Won %": recent["bp_won_pct"].mean(),
        "DF Control": 100 - (recent["df_rate"].mean() * 100),
    }

    baseline = {
        "Ace Rate": all_rows["ace_rate"].quantile([0.1, 0.9]).tolist(),
        "1st Serve Won %": all_rows["first_serve_won_pct"].quantile([0.1, 0.9]).tolist(),
        "2nd Serve Won %": all_rows["second_serve_won_pct"].quantile([0.1, 0.9]).tolist(),
        "Return Pts Won %": all_rows["return_pts_won_pct"].quantile([0.1, 0.9]).tolist(),
        "BP Won %": all_rows["bp_won_pct"].quantile([0.1, 0.9]).tolist(),
        "DF Control": (100 - all_rows["df_rate"] * 100).quantile([0.1, 0.9]).tolist(),
    }

    labels = list(metrics.keys())
    values = []
    for k in labels:
        lo, hi = baseline[k]
        v = metrics[k]
        if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo or not np.isfinite(v):
            values.append(0.5)
        else:
            values.append(float(np.clip((v - lo) / (hi - lo), 0, 1)))
    values.append(values[0])

    angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
    angles.append(angles[0])

    fig = plt.figure(figsize=(8, 8))
    ax = plt.subplot(111, polar=True)
    ax.plot(angles, values, color="#0ea5e9", linewidth=2.5)
    ax.fill(angles, values, color="#0ea5e9", alpha=0.3)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels)
    ax.set_yticks([0.2, 0.4, 0.6, 0.8, 1.0])
    ax.set_yticklabels(["20", "40", "60", "80", "100"])
    ax.set_title(f"Serve vs Return Radar (Normalized): {SELECTED_PLAYER}", y=1.08)

    saved = finalize_matplotlib(fig, "serve_return_radar", SELECTED_PLAYER)
    return PlotResult("serve_return_radar", saved)


def plot_rivalry_momentum(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    opponent = SECOND_PLAYER.strip()
    if not opponent:
        opponent = pdf["opponent_name"].value_counts().idxmax()

    rdf = pdf[pdf["opponent_name"].str.lower() == opponent.lower()].copy()
    if rdf.empty:
        raise RuntimeError(f"No head-to-head rows for '{SELECTED_PLAYER}' vs '{opponent}'.")
    rdf = rdf.sort_values("date").reset_index(drop=True)
    rdf["momentum"] = np.where(rdf["is_win"] == 1, 1, -1).cumsum()

    fig, ax = plt.subplots(figsize=(12, 6))
    ax.step(rdf["date"], rdf["momentum"], where="post", linewidth=2.3, color="#7c3aed")
    ax.fill_between(rdf["date"], 0, rdf["momentum"], where=rdf["momentum"] >= 0, color="#16a34a", alpha=0.15, step="post")
    ax.fill_between(rdf["date"], 0, rdf["momentum"], where=rdf["momentum"] < 0, color="#dc2626", alpha=0.15, step="post")
    ax.axhline(0, color="#111827", linewidth=1)
    ax.set_ylabel("Cumulative Momentum (+W / -L)")
    ax.set_title(f"Rivalry Momentum: {SELECTED_PLAYER} vs {opponent}")
    ax.grid(alpha=0.2)

    saved = finalize_matplotlib(fig, "rivalry_momentum", f"{SELECTED_PLAYER}_vs_{opponent}")
    return PlotResult("rivalry_momentum", saved)


def plot_tournament_dna(pdf: pd.DataFrame, _: pd.DataFrame, match_df: pd.DataFrame) -> PlotResult:
    target = SELECTED_TOURNAMENT.strip()
    if not target:
        target = pdf["tourney_name"].value_counts().index[0]

    tdf = match_df[match_df["tourney_name"].astype(str).str.lower() == target.lower()].copy()
    if tdf.empty:
        tdf = match_df[match_df["tourney_name"].astype(str).str.contains(target, case=False, na=False)].copy()
    if tdf.empty:
        raise RuntimeError(f"No matches found for tournament '{target}'.")

    rank_ok = tdf["winner_rank"].notna() & tdf["loser_rank"].notna() & (tdf["winner_rank"] > 0) & (tdf["loser_rank"] > 0)
    upset_rate = (tdf.loc[rank_ok, "winner_rank"] > tdf.loc[rank_ok, "loser_rank"]).mean() * 100 if rank_ok.any() else np.nan
    avg_minutes = tdf["minutes"].dropna().mean()
    tiebreak_freq = tdf["has_tiebreak"].mean() * 100

    finals = tdf[tdf["round"] == "F"]
    champion_diversity = finals["winner_name"].nunique() / len(finals) * 100 if len(finals) > 0 else np.nan

    player_in_tourney = pdf[pdf["tourney_name"].astype(str).str.lower() == str(tdf["tourney_name"].mode().iat[0]).lower()]
    player_win_pct = player_in_tourney["is_win"].mean() * 100 if len(player_in_tourney) else np.nan

    labels = ["Upset Rate %", "Tiebreak Freq %", "Champion Diversity %", f"{SELECTED_PLAYER} Win %"]
    values = [upset_rate, tiebreak_freq, champion_diversity, player_win_pct]
    values = [0 if not np.isfinite(v) else float(v) for v in values]

    fig, ax = plt.subplots(figsize=(11, 6))
    bars = ax.barh(labels, values, color=["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"], alpha=0.9)
    ax.set_xlim(0, 100)
    ax.set_xlabel("%")
    ax.set_title(f"Tournament DNA: {tdf['tourney_name'].mode().iat[0]}  |  Avg Minutes: {avg_minutes:.1f}")
    ax.grid(axis="x", alpha=0.2)
    for bar, val in zip(bars, values):
        ax.text(bar.get_width() + 1.0, bar.get_y() + bar.get_height() / 2, f"{val:.1f}%", va="center", fontsize=9)

    saved = finalize_matplotlib(fig, "tournament_dna", target)
    return PlotResult("tournament_dna", saved)


def plot_era_comparison(pdf: pd.DataFrame, all_rows: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    age_min, age_max = 20, 23
    players = [SELECTED_PLAYER]

    if COMPARISON_PLAYERS:
        players.extend([p for p in COMPARISON_PLAYERS if p])
    elif SECOND_PLAYER.strip():
        players.append(SECOND_PLAYER.strip())
    else:
        players.extend(choose_peers(all_rows, SELECTED_PLAYER, count=2))

    fig, ax = plt.subplots(figsize=(12, 6))
    for player in dict.fromkeys(players):
        p = all_rows[all_rows["player_name"].str.lower() == player.lower()].copy()
        p = p[p["player_age"].between(age_min, age_max, inclusive="both")]
        if p.empty:
            continue
        by_age = p.groupby(p["player_age"].round().astype("Int64"), as_index=False).agg(
            matches=("is_win", "size"),
            wins=("is_win", "sum"),
        )
        by_age["win_pct"] = safe_div(by_age["wins"], by_age["matches"]) * 100
        ax.plot(by_age["player_age"], by_age["win_pct"], marker="o", linewidth=2, label=f"{player} (n={int(by_age['matches'].sum())})")

    ax.set_ylim(0, 100)
    ax.set_xlabel("Age")
    ax.set_ylabel("Win %")
    ax.set_title(f"Era Comparison: Age {age_min}-{age_max} Trajectory")
    ax.grid(alpha=0.2)
    handles, labels = ax.get_legend_handles_labels()
    if handles:
        ax.legend(loc="best")

    saved = finalize_matplotlib(fig, "era_comparison", SELECTED_PLAYER)
    return PlotResult("era_comparison", saved)


def plot_records_evolution(_: pd.DataFrame, all_rows: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    metric = SELECTED_METRIC if SELECTED_METRIC in {"wins", "titles", "matches"} else "wins"
    yearly = (
        all_rows.groupby(["player_name", "year"], as_index=False)
        .agg(wins=("is_win", "sum"), titles=("titles", "sum"), matches=("is_win", "size"))
        .sort_values(["player_name", "year"])
    )
    yearly["cum_metric"] = yearly.groupby("player_name")[metric].cumsum()

    leaders = (
        yearly.sort_values(["year", "cum_metric", "player_name"], ascending=[True, False, True])
        .groupby("year", as_index=False)
        .first()[["year", "player_name", "cum_metric"]]
        .rename(columns={"player_name": "holder", "cum_metric": "value"})
    )
    leaders["holder_change"] = leaders["holder"] != leaders["holder"].shift(1)

    fig, ax = plt.subplots(figsize=(13, 6))
    ax.plot(leaders["year"], leaders["value"], color="#0f766e", linewidth=2.4, marker="o")
    change_points = leaders[leaders["holder_change"]]
    ax.scatter(change_points["year"], change_points["value"], color="#dc2626", zorder=3)
    for _, row in change_points.iterrows():
        ax.text(row["year"], row["value"] + 1.5, str(row["holder"]), fontsize=8, ha="center")
    ax.set_xlabel("Year")
    ax.set_ylabel(f"Cumulative {metric.title()}")
    ax.set_title(f"Records Evolution ({metric.title()}): Who Held #1 Over Time")
    ax.grid(alpha=0.2)

    saved = finalize_matplotlib(fig, "records_evolution", metric)

    if SAVE_PLOTS:
        table_path = OUTPUT_DIR / f"{pd.Timestamp.now():%Y%m%d_%H%M%S}_records_evolution_{slugify(metric)}.csv"
        leaders.to_csv(table_path, index=False)
        saved.append(table_path)
        print(f"[saved] {table_path}")

    return PlotResult("records_evolution", saved)


def plot_bump_chart(pdf: pd.DataFrame, all_rows: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    # Proxy season ranking by wins, to quickly visualize "rank race".
    season = (
        all_rows.groupby(["year", "player_name"], as_index=False)
        .agg(wins=("is_win", "sum"), matches=("is_win", "size"))
    )
    season = season[season["matches"] >= 8].copy()
    season["proxy_rank"] = season.groupby("year")["wins"].rank(method="min", ascending=False)

    focus_players = [SELECTED_PLAYER]
    if SECOND_PLAYER.strip():
        focus_players.append(SECOND_PLAYER.strip())
    focus_players.extend(choose_peers(all_rows, SELECTED_PLAYER, count=6))
    focus_players = list(dict.fromkeys(focus_players))[:8]

    fig, ax = plt.subplots(figsize=(13, 7))
    for name in focus_players:
        d = season[season["player_name"].str.lower() == name.lower()].sort_values("year")
        if d.empty:
            continue
        ax.plot(d["year"], d["proxy_rank"], marker="o", linewidth=2, label=name)

    ax.invert_yaxis()
    ax.set_xlabel("Season")
    ax.set_ylabel("Proxy Rank (by season wins)")
    ax.set_title("Bump Chart: Rank Race Across Seasons (Proxy)")
    ax.grid(alpha=0.2)
    ax.legend(loc="upper right", fontsize=8, ncol=2)

    saved = finalize_matplotlib(fig, "bump_chart", SELECTED_PLAYER)
    return PlotResult("bump_chart", saved)


def plot_calendar_heatmap(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    month_stats = (
        pdf.groupby(["year", "month"], as_index=False)
        .agg(matches=("is_win", "size"), wins=("is_win", "sum"))
    )
    month_stats["win_pct"] = safe_div(month_stats["wins"], month_stats["matches"]) * 100
    metric = SELECTED_METRIC if SELECTED_METRIC in {"wins", "matches", "win_pct"} else "wins"
    matrix = month_stats.pivot(index="year", columns="month", values=metric).sort_index()
    matrix = matrix.reindex(columns=list(range(1, 13)))

    fig, ax = plt.subplots(figsize=(12, 7))
    cmap = LinearSegmentedColormap.from_list("calendar", ["#f8fafc", "#bfdbfe", "#3b82f6", "#1d4ed8"])
    im = ax.imshow(matrix.fillna(np.nan).values, aspect="auto", cmap=cmap)
    fig.colorbar(im, ax=ax, label=metric.replace("_", " ").title())
    ax.set_xticks(np.arange(12))
    ax.set_xticklabels(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])
    ax.set_yticks(np.arange(len(matrix.index)))
    ax.set_yticklabels(matrix.index)
    ax.set_title(f"Calendar Heatmap ({metric.replace('_', ' ').title()}): {SELECTED_PLAYER}")

    saved = finalize_matplotlib(fig, "calendar_heatmap", f"{SELECTED_PLAYER}_{metric}")
    return PlotResult("calendar_heatmap", saved)


def plot_level_round_sankey(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    flow = pdf.groupby(["level_label", "round"], as_index=False).agg(matches=("is_win", "size"))
    flow = flow[flow["matches"] > 0].copy()
    if flow.empty:
        raise RuntimeError("No rows available for Sankey plot.")

    if go is None:
        # Fallback: heatmap when Plotly is unavailable.
        pivot = flow.pivot(index="level_label", columns="round", values="matches").fillna(0)
        fig, ax = plt.subplots(figsize=(11, 6))
        im = ax.imshow(pivot.values, aspect="auto", cmap="Blues")
        fig.colorbar(im, ax=ax, label="Matches")
        ax.set_xticks(np.arange(len(pivot.columns)))
        ax.set_xticklabels(pivot.columns, rotation=30, ha="right")
        ax.set_yticks(np.arange(len(pivot.index)))
        ax.set_yticklabels(pivot.index)
        ax.set_title(f"Level -> Round Flow (Heatmap Fallback): {SELECTED_PLAYER}")
        saved = finalize_matplotlib(fig, "level_round_sankey_fallback", SELECTED_PLAYER)
        return PlotResult("level_round_sankey", saved)

    left_nodes = sorted(flow["level_label"].unique().tolist())
    right_nodes = sorted(flow["round"].unique().tolist(), key=lambda x: ROUND_WEIGHT.get(x, 99))
    labels = left_nodes + right_nodes
    idx = {label: i for i, label in enumerate(labels)}

    sources = flow["level_label"].map(idx).tolist()
    targets = flow["round"].map(idx).tolist()
    values = flow["matches"].astype(float).tolist()

    fig = go.Figure(
        data=[
            go.Sankey(
                arrangement="snap",
                node=dict(pad=12, thickness=14, label=labels),
                link=dict(source=sources, target=targets, value=values),
            )
        ]
    )
    fig.update_layout(title=f"Sankey: Tournament Level -> Round Reached ({SELECTED_PLAYER})", font_size=12)

    saved = finalize_plotly(fig, "level_round_sankey")
    return PlotResult("level_round_sankey", saved)


def plot_duration_boxplot(pdf: pd.DataFrame, all_rows: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    players = [SELECTED_PLAYER]
    if SECOND_PLAYER.strip():
        players.append(SECOND_PLAYER.strip())
    players = list(dict.fromkeys(players))

    fig, axes = plt.subplots(len(players), 1, figsize=(12, 4 * len(players)), sharex=True)
    if len(players) == 1:
        axes = [axes]

    for ax, name in zip(axes, players):
        d = all_rows[all_rows["player_name"].str.lower() == name.lower()].copy()
        d = d[d["minutes"].notna()]
        data = [d[d["surface_label"] == s]["minutes"].values for s in SURFACE_ORDER]
        data = [arr for arr in data if len(arr) > 0]
        labels = [s for s in SURFACE_ORDER if len(d[d["surface_label"] == s]) > 0]
        if not data:
            ax.text(0.5, 0.5, f"No duration data for {name}", ha="center", va="center")
            ax.axis("off")
            continue
        ax.boxplot(data, tick_labels=labels, showfliers=False)
        ax.set_ylabel("Minutes")
        ax.set_title(name)
        ax.grid(axis="y", alpha=0.2)

    axes[-1].set_xlabel("Surface")
    fig.suptitle("Match Duration by Surface and Player", fontsize=14, fontweight="bold")
    fig.tight_layout(rect=(0, 0, 1, 0.96))

    saved = finalize_matplotlib(fig, "duration_boxplot", SELECTED_PLAYER)
    return PlotResult("duration_boxplot", saved)


def plot_small_multiples_surface(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    d = pdf.copy()
    d["month_start"] = d["date"].dt.to_period("M").dt.to_timestamp()
    monthly = d.groupby(["surface_label", "month_start"], as_index=False).agg(matches=("is_win", "size"), wins=("is_win", "sum"))
    monthly["win_pct"] = safe_div(monthly["wins"], monthly["matches"]) * 100

    surfaces = [s for s in SURFACE_ORDER if s in monthly["surface_label"].unique()]
    if not surfaces:
        raise RuntimeError("No surface data to render small multiples.")

    cols = 3
    rows = math.ceil(len(surfaces) / cols)
    fig, axes = plt.subplots(rows, cols, figsize=(15, 4.4 * rows), sharex=False, sharey=True)
    axes = np.array(axes).reshape(rows, cols)

    for i, s in enumerate(surfaces):
        ax = axes[i // cols, i % cols]
        sd = monthly[monthly["surface_label"] == s].sort_values("month_start")
        ax.plot(sd["month_start"], sd["win_pct"], linewidth=2, color="#2563eb")
        ax.set_title(s)
        ax.set_ylim(0, 100)
        ax.grid(alpha=0.2)
    for j in range(len(surfaces), rows * cols):
        axes[j // cols, j % cols].axis("off")

    fig.suptitle(f"Small Multiples: Win % Trend by Surface ({SELECTED_PLAYER})", fontsize=14, fontweight="bold")
    fig.tight_layout(rect=(0, 0, 1, 0.96))
    saved = finalize_matplotlib(fig, "small_multiples_surface", SELECTED_PLAYER)
    return PlotResult("small_multiples_surface", saved)


def plot_scatter_quadrants(pdf: pd.DataFrame, all_rows: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    yearly = pdf.groupby("year", as_index=False).agg(
        ace_rate=("ace_rate", "mean"),
        df_rate=("df_rate", "mean"),
        first_serve_won_pct=("first_serve_won_pct", "mean"),
        return_pts_won_pct=("return_pts_won_pct", "mean"),
        bp_won_pct=("bp_won_pct", "mean"),
    )
    yearly["aggressive_serve"] = yearly["ace_rate"] * 100 - yearly["df_rate"] * 100 + 0.35 * yearly["first_serve_won_pct"]
    yearly["return_eff"] = yearly["return_pts_won_pct"] + 0.25 * yearly["bp_won_pct"]

    tour_baseline = all_rows.groupby("year", as_index=False).agg(
        ace_rate=("ace_rate", "mean"),
        df_rate=("df_rate", "mean"),
        first_serve_won_pct=("first_serve_won_pct", "mean"),
        return_pts_won_pct=("return_pts_won_pct", "mean"),
        bp_won_pct=("bp_won_pct", "mean"),
    )
    tour_baseline["aggressive_serve"] = tour_baseline["ace_rate"] * 100 - tour_baseline["df_rate"] * 100 + 0.35 * tour_baseline["first_serve_won_pct"]
    tour_baseline["return_eff"] = tour_baseline["return_pts_won_pct"] + 0.25 * tour_baseline["bp_won_pct"]

    x0 = float(tour_baseline["aggressive_serve"].mean())
    y0 = float(tour_baseline["return_eff"].mean())

    fig, ax = plt.subplots(figsize=(10, 8))
    ax.scatter(yearly["aggressive_serve"], yearly["return_eff"], s=80, color="#0ea5e9", alpha=0.9)
    for _, r in yearly.iterrows():
        ax.text(r["aggressive_serve"], r["return_eff"], str(int(r["year"])), fontsize=8, ha="left", va="bottom")
    ax.axvline(x0, color="#111827", linestyle="--", linewidth=1)
    ax.axhline(y0, color="#111827", linestyle="--", linewidth=1)
    ax.set_xlabel("Aggressive Serve Index")
    ax.set_ylabel("Return Efficiency Index")
    ax.set_title(f"Scatter with Quadrants: {SELECTED_PLAYER}")
    ax.grid(alpha=0.2)

    saved = finalize_matplotlib(fig, "scatter_quadrants", SELECTED_PLAYER)
    return PlotResult("scatter_quadrants", saved)


def compute_elo_series(pdf: pd.DataFrame, k_factor: float = 24.0) -> pd.DataFrame:
    rows = pdf.sort_values("date").copy()
    opp_elo: Dict[str, float] = {}
    elo = 1500.0
    elo_surface: Dict[str, float] = {s: 1500.0 for s in SURFACE_ORDER}
    history = []

    for _, r in rows.iterrows():
        opp = r["opponent_name"]
        surface = r["surface_label"] if r["surface_label"] in elo_surface else "Other"
        opp_rating = opp_elo.get(opp, 1500.0)

        expected = 1.0 / (1.0 + 10 ** ((opp_rating - elo) / 400.0))
        actual = float(r["is_win"])
        elo = elo + k_factor * (actual - expected)
        opp_elo[opp] = opp_rating + k_factor * ((1.0 - actual) - (1.0 - expected))

        # Surface Elo update (independent quick proxy).
        surf_elo = elo_surface.get(surface, 1500.0)
        surf_exp = 1.0 / (1.0 + 10 ** ((opp_rating - surf_elo) / 400.0))
        surf_elo = surf_elo + k_factor * (actual - surf_exp)
        elo_surface[surface] = surf_elo

        history.append(
            {
                "date": r["date"],
                "elo_overall": elo,
                "elo_surface": surf_elo,
                "surface_label": surface,
                "is_win": actual,
            }
        )

    return pd.DataFrame(history)


def plot_elo_trajectory(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    elo_df = compute_elo_series(pdf)
    fig, ax = plt.subplots(figsize=(12, 6))
    ax.plot(elo_df["date"], elo_df["elo_overall"], color="#0f766e", linewidth=2.4, label="Overall Elo")
    for surf in ["Hard", "Clay", "Grass"]:
        s = elo_df[elo_df["surface_label"] == surf]
        if not s.empty:
            ax.plot(s["date"], s["elo_surface"], linewidth=1.3, alpha=0.8, label=f"{surf} Elo")
    ax.set_ylabel("Elo")
    ax.set_title(f"Elo-style Rating Trajectory: {SELECTED_PLAYER}")
    ax.grid(alpha=0.2)
    ax.legend(loc="best")

    saved = finalize_matplotlib(fig, "elo_trajectory", SELECTED_PLAYER)
    return PlotResult("elo_trajectory", saved)


def plot_win_probability_model(pdf: pd.DataFrame, _: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    df = pdf.copy().sort_values("date").reset_index(drop=True)
    df["recent_form_10"] = df["is_win"].rolling(10, min_periods=3).mean().shift(1).fillna(0.5)
    df["serve_edge"] = (df["first_serve_won_pct"].fillna(df["first_serve_won_pct"].median()) - 60.0) / 20.0
    df["rank_gap"] = pd.to_numeric(df["rank_gap"], errors="coerce").fillna(df["rank_gap"].median())

    usable = df.dropna(subset=["rank_gap", "recent_form_10", "serve_edge", "surface_label"]).copy()
    if len(usable) < 50:
        raise RuntimeError("Not enough rows to run win-probability prototype (need at least 50 matches).")

    surface_dummies = pd.get_dummies(usable["surface_label"], prefix="surface")
    X = pd.concat([usable[["rank_gap", "recent_form_10", "serve_edge"]], surface_dummies], axis=1)
    y = usable["is_win"].astype(int)

    split = int(len(usable) * 0.8)
    X_train, X_test = X.iloc[:split], X.iloc[split:]
    y_train, y_test = y.iloc[:split], y.iloc[split:]
    eval_df = usable.iloc[split:].copy()

    if LogisticRegression is None:
        # Fallback heuristic.
        z = -0.04 * X_test["rank_gap"].values + 1.4 * X_test["recent_form_10"].values + 0.5 * X_test["serve_edge"].values
        proba = 1.0 / (1.0 + np.exp(-z))
    else:
        model = LogisticRegression(max_iter=1200)
        model.fit(X_train, y_train)
        proba = model.predict_proba(X_test)[:, 1]

    eval_df["win_prob"] = proba

    fig, ax = plt.subplots(figsize=(12, 6))
    ax.plot(eval_df["date"], eval_df["win_prob"] * 100, color="#2563eb", linewidth=2.0, label="Predicted win probability")
    ax.scatter(eval_df["date"], eval_df["is_win"] * 100, color="#dc2626", alpha=0.55, s=18, label="Actual (0/100)")
    ax.set_ylim(-5, 105)
    ax.set_ylabel("Win Probability %")
    ax.set_title(f"Match Win Probability Prototype: {SELECTED_PLAYER}")
    ax.grid(alpha=0.2)
    ax.legend(loc="upper left")

    saved = finalize_matplotlib(fig, "win_probability_model", SELECTED_PLAYER)
    return PlotResult("win_probability_model", saved)


def plot_style_clustering(_: pd.DataFrame, all_rows: pd.DataFrame, __: pd.DataFrame) -> PlotResult:
    player_stats = (
        all_rows.groupby("player_name", as_index=False)
        .agg(
            matches=("is_win", "size"),
            ace_rate=("ace_rate", "mean"),
            df_rate=("df_rate", "mean"),
            first_serve_won_pct=("first_serve_won_pct", "mean"),
            second_serve_won_pct=("second_serve_won_pct", "mean"),
            return_pts_won_pct=("return_pts_won_pct", "mean"),
            bp_won_pct=("bp_won_pct", "mean"),
            bp_saved_pct=("bp_saved_pct", "mean"),
        )
    )
    player_stats = player_stats[player_stats["matches"] >= MIN_MATCHES_PER_PLAYER].copy()
    features = [
        "ace_rate", "df_rate", "first_serve_won_pct", "second_serve_won_pct",
        "return_pts_won_pct", "bp_won_pct", "bp_saved_pct",
    ]
    X = player_stats[features].replace([np.inf, -np.inf], np.nan).dropna()
    kept = player_stats.loc[X.index].copy()

    if len(X) < 30:
        raise RuntimeError("Not enough players for style clustering (need at least 30).")

    Xn = (X - X.mean()) / X.std(ddof=0)
    if PCA is not None:
        pca = PCA(n_components=2, random_state=7)
        coords = pca.fit_transform(Xn)
    else:
        # PCA fallback via SVD.
        u, s, vt = np.linalg.svd(Xn.values, full_matrices=False)
        coords = u[:, :2] * s[:2]

    if KMeans is not None:
        km = KMeans(n_clusters=5, random_state=7, n_init=15)
        cluster = km.fit_predict(coords)
    else:
        cluster = np.zeros(len(coords), dtype=int)

    kept["pc1"] = coords[:, 0]
    kept["pc2"] = coords[:, 1]
    kept["cluster"] = cluster

    fig, ax = plt.subplots(figsize=(11, 8))
    scatter = ax.scatter(kept["pc1"], kept["pc2"], c=kept["cluster"], cmap="tab10", alpha=0.7, s=30)
    ax.set_title("Style Clustering (PCA) from Serve/Return Profile")
    ax.set_xlabel("PC1")
    ax.set_ylabel("PC2")
    ax.grid(alpha=0.2)

    sel = kept[kept["player_name"].str.lower() == SELECTED_PLAYER.lower()]
    if not sel.empty:
        ax.scatter(sel["pc1"], sel["pc2"], color="black", s=90, marker="*", label=SELECTED_PLAYER)
        row = sel.iloc[0]
        ax.text(row["pc1"], row["pc2"], f"  {SELECTED_PLAYER}", fontsize=10, va="center", ha="left")
    ax.legend(loc="best")
    fig.colorbar(scatter, ax=ax, label="Cluster")

    saved = finalize_matplotlib(fig, "style_clustering_pca", SELECTED_PLAYER)
    return PlotResult("style_clustering_pca", saved)


def run_selected_idea(idea: str, pdf: pd.DataFrame, all_rows: pd.DataFrame, match_df: pd.DataFrame) -> PlotResult:
    dispatch: Dict[str, Callable[[pd.DataFrame, pd.DataFrame, pd.DataFrame], PlotResult]] = {
        "player_form_engine": plot_player_form_engine,
        "surface_strength_matrix": plot_surface_strength_matrix,
        "opponent_quality_plot": plot_opponent_quality,
        "round_performance_funnel": plot_round_funnel,
        "pressure_stats": plot_pressure_stats,
        "serve_return_radar": plot_serve_return_radar,
        "rivalry_momentum": plot_rivalry_momentum,
        "tournament_dna": plot_tournament_dna,
        "era_comparison": plot_era_comparison,
        "records_evolution": plot_records_evolution,
        "bump_chart": plot_bump_chart,
        "calendar_heatmap": plot_calendar_heatmap,
        "level_round_sankey": plot_level_round_sankey,
        "duration_boxplot": plot_duration_boxplot,
        "small_multiples_surface": plot_small_multiples_surface,
        "scatter_quadrants": plot_scatter_quadrants,
        "elo_trajectory": plot_elo_trajectory,
        "win_probability_model": plot_win_probability_model,
        "style_clustering_pca": plot_style_clustering,
    }
    if idea not in dispatch:
        raise ValueError(f"Unknown SELECTED_IDEA='{idea}'. Allowed: {', '.join(IDEAS)} or 'all'.")
    return dispatch[idea](pdf, all_rows, match_df)


def main() -> None:
    global SELECTED_PLAYER
    print(f"[info] Tour: {TOUR.upper()}  |  years {START_YEAR}-{END_YEAR}")
    if SHOW_PLOTS and HEADLESS:
        print("[info] Display not detected; SHOW_PLOTS was requested but disabled automatically for this run.")

    match_df = load_match_data()
    all_rows = build_player_view(match_df)
    resolved_player = resolve_player_name(all_rows, SELECTED_PLAYER)
    SELECTED_PLAYER = resolved_player
    pdf = player_df_for(all_rows, SELECTED_PLAYER)
    if pdf.empty:
        raise RuntimeError(f"No rows found for player '{SELECTED_PLAYER}'.")

    print(f"[info] Selected player resolved as: {SELECTED_PLAYER}  | matches: {len(pdf)}")
    print(f"[info] Output folder: {OUTPUT_DIR}")

    ideas_to_run = IDEAS if SELECTED_IDEA == "all" else [SELECTED_IDEA]
    results: List[PlotResult] = []
    for idea in ideas_to_run:
        print(f"\n[run] {idea}")
        result = run_selected_idea(idea, pdf, all_rows, match_df)
        results.append(result)

    total_files = sum(len(r.saved_paths) for r in results)
    print(f"\n[done] Generated {len(results)} idea plot(s), saved {total_files} file(s).")


if __name__ == "__main__":
    main()
