
## 2026-02-16 - Task 1 Elo engine learnings

- ATP `recent_matches_tab.matches[].opponent_rank` is frequently `null` (observed across most ATP players), so rank fallback from `AppState.rankings.atp` name matching is mandatory.
- ATP opponent names are often abbreviated (`"N. Djokovic"`, `"C. Alcaraz"`), while ranking rows use full names; last-name + first-initial alias lookup avoids most misses without expensive fuzzy matching.
- ATP records include walkovers (`"W/O"`) and retirements (`"RET"` in `score_raw`) regularly; walkovers should be skipped from Elo history and retirements should use reduced K.
- WTA and ATP schemas differ slightly in round fields (`round` vs `round_name`) and opponent fields (`opponent_country`/`opponent_id`/`score_raw`), so normalization to a unified match shape keeps Elo logic tour-agnostic.
- Tournament arrays are reverse chronological and per-tournament match arrays are late-round-first, so `flatten + reverse` is the cleanest way to get chronological order.
- Performance is excellent with a two-phase batch pass (seed then chronological updates): full ATP(200)+WTA(400) compute completed in ~11.9 ms in-browser, far below the 2s target.

## 2026-02-16 - Task 1 follow-up verification learnings

- A round-robin batch phase (`match depth 0..N` across all players) keeps seeded opponent Elo values evolving during the same run and reduces ordering bias compared with single-player sequential updates.
- Some elite players can exceed 2200 with the adaptive K setup and no ceiling; clamping to a practical ceiling of 2200 keeps the displayed range stable while preserving top-vs-bottom separation.
- In-browser QA confirmed ATP recent history has many `opponent_rank: null` rows (1525 across top-200 sample), so abbreviation-aware lookup is the key reliability path for ATP Elo.
- For this dataset snapshot, Elo compute time stayed at ~5.5-7.8 ms across repeated runs for 600 ranked players (ATP+WTA), leaving large headroom for UI-triggered recomputation.
