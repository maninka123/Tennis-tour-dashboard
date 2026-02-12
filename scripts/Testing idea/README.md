# Testing Idea Plot Lab

File: `scripts/Testing idea/plot_testing_ideas.py`

This script is a prototype playground to preview analytics plots before wiring them into the app.

## Run

```bash
python3 "scripts/Testing idea/plot_testing_ideas.py"
```

It saves outputs to:

`scripts/Testing idea/outputs`

## Configure (no argparse)

Edit variables at the top of the script, or override with environment variables:

- `TI_TOUR` (`atp` or `wta`)
- `TI_PLAYER` (player name)
- `TI_IDEA` (one idea key or `all`)
- `TI_METRIC` (`win_pct`, `titles`, `finals`, `avg_round`, `wins`, `matches`)
- `TI_SECOND_PLAYER`
- `TI_TOURNAMENT`
- `TI_START_YEAR`, `TI_END_YEAR`
- `TI_SHOW_PLOTS` (`1/0`)
- `TI_SAVE_PLOTS` (`1/0`)

Example:

```bash
TI_TOUR=atp TI_PLAYER="Novak Djokovic" TI_IDEA=surface_strength_matrix TI_METRIC=win_pct TI_SHOW_PLOTS=1 python3 "scripts/Testing idea/plot_testing_ideas.py"
```

## Idea Keys

- `player_form_engine`
- `surface_strength_matrix`
- `opponent_quality_plot`
- `round_performance_funnel`
- `pressure_stats`
- `serve_return_radar`
- `rivalry_momentum`
- `tournament_dna`
- `era_comparison`
- `records_evolution`
- `bump_chart`
- `calendar_heatmap`
- `level_round_sankey`
- `duration_boxplot`
- `small_multiples_surface`
- `scatter_quadrants`
- `elo_trajectory`
- `win_probability_model`
- `style_clustering_pca`
