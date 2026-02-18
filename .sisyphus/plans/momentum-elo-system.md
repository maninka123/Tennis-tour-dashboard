# Momentum / Elo Rating System for Tennis Dashboard

## TL;DR

> **Quick Summary**: Add a frontend-only Elo rating + momentum tracking system that computes player ratings from their last 10 matches (stored in stats_2026.json), displays interactive momentum sparklines on player cards and upcoming match cards, and adds an Elo leaderboard to the Stats Zone. Both ATP & WTA tours.
> 
> **Deliverables**:
> - New JS module: `frontend/js/elo-engine.js` — Elo computation engine with ATP/WTA data normalization
> - Modified: `frontend/js/player.js` — Elo score + momentum sparkline on player card
> - Modified: `frontend/js/scores.js` — Momentum indicators on upcoming match cards
> - Modified: `frontend/js/stats-zone.js` — Elo leaderboard table in Stats Zone
> - Modified: `frontend/js/app.js` — Wire EloModule into app lifecycle
> - Modified: `frontend/css/styles.css` — Elo/momentum styles matching existing theme
> - Modified: `frontend/index.html` — Elo detail modal overlay anchor
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 2 waves
> **Critical Path**: Task 1 (engine) → Tasks 2,3,4 (UI integration, parallel) → Task 5 (wiring)

---

## Context

### Original Request
User wants an Elo rating and momentum tracking system integrated into the Tennis Dashboard. Players get Elo scores computed from their last 10 matches. The momentum graph shows trajectory (trending up/down) with detailed breakdowns showing WHY each point changed (opponent rank, tournament type, result). An Elo leaderboard table is added to the Stats Zone.

### Interview Summary
**Key Discussions**:
- Tour scope: Both ATP & WTA
- Elo type: Single overall Elo (not surface-specific)
- Data source: `stats_2026.json` per player — `recent_matches_tab` section (last ~10 matches)
- Computation approach: Frontend JavaScript only — no backend changes
- Display: Player card (sparkline + score + delta arrows), upcoming match cards (momentum indicators), Stats Zone (Elo leaderboard table)
- Grand Slam matches get higher K-factor weight
- Click small sparkline → popup modal with detailed graph showing factor breakdown per match
- Click data point in detailed graph → popup showing calculation (opponent rank, tournament type, result, K-factor)
- All popups/modals must match existing dark theme
- Stats Zone: New Elo table next to existing stat tables, same styling, sorted high→low
- No automated tests — agent QA with Playwright screenshots

**Research Findings**:
- `stats_2026.json` has `recent_matches_tab.tournaments[].matches[]` with fields: round, result, opponent_name, opponent_rank, score, category, surface
- **Critical**: ATP data has `opponent_rank: null` universally — need name-based lookup from rankings
- ATP/WTA match schemas differ significantly — normalization layer required
- Existing WTA predictor (`prediction_wta_upcoming.js`) — should NOT be modified
- Player card: `PlayerModule.render()` in `player.js` — `.player-profile-actions` area
- Upcoming cards: `ScoresModule.createUpcomingMatchCard()` in `scores.js` — `.edge-bar` element
- Stats Zone: `StatZoneModule.render()` in `stats-zone.js` — `#statsZoneContent` container
- Modal pattern: `.modal-overlay.active > .modal-content > .close-modal`, backdrop click closes
- Main dashboard has NO charting library — sparklines must be inline SVG
- `data_analysis/assets/js/app.js` has existing Elo Trajectory card code (reference only, different app)
- Tennis Elo best practice: K = 250 / (matches + 5)^0.4, Expected = 1/(1+10^((Rb-Ra)/400))

### Metis Review
**Identified Gaps** (addressed):
- **ATP opponent_rank is null**: Resolved via name-matching lookup against `AppState.rankings.atp`. Build `Map<normalizedName, playerObj>` from rankings. Fall back to default Elo 1500 for unresolvable opponents.
- **ATP/WTA schema differences**: Resolved by adding a normalization layer as the first step in the engine. Converts both schemas to a unified `NormalizedMatch` shape.
- **No charting library on main dashboard**: Resolved by using inline SVG `<polyline>` for sparklines — no new dependencies.
- **Circular Elo dependency (A needs B's Elo)**: Resolved via two-phase batch computation: (1) seed all players with rank-based initial Elo, (2) single chronological pass through all matches updating Elo.
- **Players with 0 matches**: Resolved by showing rank-seeded default Elo with "provisional" indicator, hiding sparkline.
- **Walkover/retirement handling**: Resolved by filtering out W/O matches, counting retirements with K × 0.5.
- **Per-match dates unavailable**: Resolved by using tournament ordering (already reverse-chronological in data) + match round ordering within tournament.
- **Grand Slam identification**: Resolved using `category` field ("grand_slam") in tournament data.
- **Runtime Elo storage**: Resolved by computing batch at startup, storing in `AppState.eloRatings` Map.

---

## Work Objectives

### Core Objective
Build a frontend-only Elo rating and momentum visualization system that computes player ratings from existing match data, displays interactive momentum graphs, and provides detailed factor breakdowns — all integrated seamlessly into the existing dashboard theme.

### Concrete Deliverables
- `frontend/js/elo-engine.js` — New Elo computation module (data normalization + Elo math + batch compute)
- Modified player card with Elo score, momentum sparkline SVG, and week-over-week delta arrows
- Modified upcoming match cards with momentum indicators for both players
- Elo leaderboard table in Stats Zone with clickable scores opening detail modals
- Elo detail modal with interactive trajectory graph and per-match factor breakdown popups

### Definition of Done
- [ ] All ranked ATP players in `AppState.rankings.atp` have numeric Elo values (no NaN)
- [ ] All ranked WTA players in `AppState.rankings.wta` have numeric Elo values (no NaN)
- [ ] Player card shows Elo score with delta arrow when clicking any player
- [ ] Sparkline SVG renders on player card showing last N match trajectory
- [ ] Clicking sparkline opens modal with detailed interactive graph
- [ ] Clicking a data point in detailed graph shows factor breakdown popup
- [ ] Upcoming match cards show momentum indicators for both players
- [ ] Stats Zone has Elo leaderboard table sorted high→low for current tour
- [ ] Clicking Elo score in Stats Zone opens same detail modal
- [ ] All modals match existing dark theme styling
- [ ] No new npm/CDN dependencies added
- [ ] No backend code modified
- [ ] Elo batch computation completes in < 2 seconds for 400 players

### Must Have
- Single overall Elo (not surface-specific)
- Adaptive K-factor with Grand Slam higher weight (via `category` field)
- ATP/WTA data normalization handling opponent_rank null case
- Rank-seeded initial Elo for cold-start players
- Inline SVG sparklines (no charting library)
- Theme-matched modal popups
- Both ATP and WTA tours

### Must NOT Have (Guardrails)
- No surface-specific Elo ratings
- No modifications to `prediction_wta_upcoming.js` weights or prediction formula
- No backend Python code changes
- No new npm packages or CDN dependencies (no Plotly, Chart.js, etc.)
- No historic data processing beyond what's in stats_2026.json
- No changes to data_analysis/ directory
- No animated sparklines (static SVG)
- No doubles match handling
- No recursive opponent lookups — single batch computation only
- No Elo for players who aren't in current rankings
- No modifications to H2H page

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.

### Test Decision
- **Infrastructure exists**: NO
- **Automated tests**: None
- **Framework**: None

### Agent-Executed QA Scenarios (MANDATORY — ALL tasks)

> The executing agent will verify EVERY task via Playwright browser automation and browser console assertions. All evidence captured as screenshots in `.sisyphus/evidence/`.

**Verification Tool by Deliverable Type:**

| Type | Tool | How Agent Verifies |
|------|------|-------------------|
| **Elo Engine (JS module)** | Bash (browser console via Playwright) | Load app, run console assertions on AppState.eloRatings |
| **Player Card UI** | Playwright (playwright skill) | Click player, assert Elo elements visible, screenshot |
| **Upcoming Cards UI** | Playwright (playwright skill) | Navigate to upcoming section, assert momentum indicators |
| **Stats Zone UI** | Playwright (playwright skill) | Open Stats Zone, assert Elo table, click score |
| **Modal Popups** | Playwright (playwright skill) | Trigger modals, assert content, screenshot |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Elo Engine module (frontend/js/elo-engine.js) [no dependencies]
└── Task 6: CSS styles for Elo/momentum components [no dependencies]

Wave 2 (After Wave 1):
├── Task 2: Player Card Elo integration [depends: 1, 6]
├── Task 3: Upcoming Match Card momentum indicators [depends: 1, 6]
└── Task 4: Stats Zone Elo leaderboard [depends: 1, 6]

Wave 3 (After Wave 2):
└── Task 5: App wiring + index.html modal anchors + final integration [depends: 1-4, 6]

Critical Path: Task 1 → Task 2 → Task 5
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4, 5 | 6 |
| 6 | None | 2, 3, 4 | 1 |
| 2 | 1, 6 | 5 | 3, 4 |
| 3 | 1, 6 | 5 | 2, 4 |
| 4 | 1, 6 | 5 | 2, 3 |
| 5 | 1, 2, 3, 4, 6 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 6 | task(category="ultrabrain") for engine; task(category="visual-engineering") for CSS |
| 2 | 2, 3, 4 | task(category="visual-engineering") for all three (UI integration) |
| 3 | 5 | task(category="quick") for wiring |

---

## TODOs

- [ ] 1. Create Elo Engine Module (`frontend/js/elo-engine.js`)

  **What to do**:
  - Create a new JS module `frontend/js/elo-engine.js` that exports `window.TennisApp.EloModule`
  - Implement data normalization layer:
    - Function `normalizeMatches(player, tour)` that converts ATP and WTA `recent_matches_tab` into a unified `NormalizedMatch[]` array
    - WTA match fields: `{ result, opponent_name, opponent_rank, opponent_country, score, round, round_name, category, surface }`
    - ATP match fields: `{ result, opponent_name, opponent_id, opponent_rank (usually null), opponent_seed, score, score_raw, round, round_name, category, surface }`
    - Unified shape: `{ result: 'W'|'L', opponentName: string, opponentRank: number|null, score: string, round: string, tournamentName: string, category: string, surface: string, isWalkover: boolean, isRetirement: boolean }`
    - Detect walkovers: check if `score` contains "W/O" or "w/o"
    - Detect retirements: check if `score` contains "RET" or "ret" or "Ret."
    - Flatten: iterate `recent_matches_tab.tournaments[]` → `matches[]`, attach tournament metadata to each match
    - Order: tournaments are already reverse-chronological; within tournament, matches are ordered by round (later rounds = more recent). Reverse the flattened array so oldest match is first.
  - Implement opponent resolution:
    - Function `buildPlayerLookup(rankings)` that creates `Map<normalizedName, { rank, name, elo }>` from `AppState.rankings[tour]`
    - Name normalization: lowercase, trim, handle "N. Djokovic" → match against full name "novak djokovic" by checking last-name match + first-initial match
    - Function `resolveOpponentRank(opponentName, playerLookup)` that returns rank or null
  - Implement Elo computation:
    - Function `seedInitialElo(rank)` → returns `1500 + Math.max(0, (200 - rank)) * 2` (rank 1 ≈ 1900, rank 200 ≈ 1500, rank 200+ = 1500)
    - Function `adaptiveK(matchCount, category)` → returns `(250 / Math.pow(matchCount + 5, 0.4)) * categoryMultiplier` where:
      - `categoryMultiplier`: grand_slam = 1.5, masters_1000 / premier_mandatory / wta_1000 = 1.2, atp_500 / wta_500 = 1.0, atp_250 / wta_250 / wta_125 = 0.8
    - Function `expectedScore(ratingA, ratingB)` → `1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))`
    - Function `updateElo(currentElo, expectedScore, actualScore, K, isRetirement)`:
      - If walkover: return currentElo (no change)
      - If retirement: `K *= 0.5`
      - `newElo = currentElo + K * (actualScore - expectedScore)`
      - Apply floor: `Math.max(1200, newElo)`
      - Return newElo
  - Implement batch computation:
    - Function `computeAllElo(tour)`:
      - Get rankings from `AppState.rankings[tour]`
      - Build player lookup map via `buildPlayerLookup(rankings)`
      - Seed all players with initial Elo via `seedInitialElo(rank)`
      - For each player with `stats_2026.recent_matches_tab`:
        - Normalize their matches via `normalizeMatches(player, tour)`
        - Filter out walkovers
        - For each match (oldest → newest):
          - Resolve opponent rank from lookup map
          - Compute opponent Elo estimate: if opponent in lookup → use their seeded Elo; else → default 1500
          - Compute expected score
          - Compute K-factor (using player's running match count + tournament category)
          - Update player Elo
          - Record history entry: `{ elo, delta, opponentName, opponentRank, result, score, tournamentName, category, round }`
      - Return `Map<playerName, { elo: number, initialElo: number, eloHistory: Array<{elo, delta, ...}>, momentum: number, weekDelta: number, matchCount: number }>`
      - `momentum`: slope of elo trajectory (positive = trending up, negative = down). Calculate as average delta of last 3 matches.
      - `weekDelta`: compare current elo to elo 7 days ago (approximate by subtracting last 2-3 match deltas if matches fall within last week). If no recent matches, weekDelta = 0.
    - Function `init()`: called by app.js after rankings load. Calls `computeAllElo('atp')` and `computeAllElo('wta')`, stores results in `AppState.eloRatings = { atp: Map, wta: Map }`
  - Implement sparkline SVG generation:
    - Function `createSparklineSVG(eloHistory, options)`:
      - Accepts `eloHistory` array and `{ width: 120, height: 32, color: 'var(--accent-green)', negColor: 'var(--accent-red)' }`
      - If `eloHistory.length < 2`: return empty string or single dot SVG
      - Compute min/max Elo from history for Y-axis scaling
      - Generate `<svg>` with `<polyline>` connecting data points
      - Color: green if overall trend up (last > first), red if down
      - Add small circle at the last data point
      - Return SVG string
  - Implement detail modal HTML generation:
    - Function `createEloDetailModalHTML(playerName, eloData)`:
      - Full-size trajectory chart using SVG `<polyline>` (larger: 500×200)
      - X-axis labels: opponent names or tournament abbreviations
      - Y-axis labels: Elo values
      - Each data point is a clickable `<circle>` with `data-match-index` attribute
      - Below graph: summary row showing current Elo, highest Elo, lowest Elo, matches played
      - Factor breakdown popup template (hidden by default, shown on data point click):
        - Result (W/L)
        - Opponent name + rank
        - Tournament name + category badge
        - K-factor used
        - Expected score vs actual
        - Elo change (delta with + or -)
    - Function `openEloDetailModal(playerName, tour)`:
      - Gets elo data from `AppState.eloRatings[tour].get(playerName)`
      - Builds modal HTML via `createEloDetailModalHTML`
      - Inserts into `#eloDetailModal` (anchor in index.html)
      - Adds `.active` class to show
      - Binds click handlers on data point circles → show factor popup
      - Binds close button and backdrop click
    - Function `closeEloDetailModal()`:
      - Removes `.active` class
  - Register module as `window.TennisApp.EloModule = { init, computeAllElo, createSparklineSVG, openEloDetailModal, closeEloDetailModal, getPlayerElo }`
  - Utility: `getPlayerElo(playerName, tour)` → returns elo data object or null

  **Must NOT do**:
  - Do NOT load any charting library (Plotly, Chart.js, etc.)
  - Do NOT modify any existing JS files in this task
  - Do NOT make backend API calls for Elo computation
  - Do NOT implement surface-specific Elo
  - Do NOT use recursive opponent lookups
  - Do NOT add any npm/CDN dependencies

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Complex algorithmic logic (Elo math, data normalization, batch computation with circular dependency resolution, name matching). Requires careful handling of edge cases and performance.
  - **Skills**: [`playwright`]
    - `playwright`: Needed for browser console verification of computed Elo values
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: This task is pure logic/engine — no visual design decisions
    - `git-master`: No git operations needed during implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 6)
  - **Blocks**: Tasks 2, 3, 4, 5
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL - Be Exhaustive):

  **Pattern References** (existing code to follow):
  - `frontend/js/prediction_wta_upcoming.js` — Module pattern to follow: self-executing function, global export via `window.TennisApp` or direct global, factor-based computation approach
  - `frontend/js/app.js` — How `AppState` is structured and where rankings data lives (`AppState.rankings.atp`, `AppState.rankings.wta`). Each ranking entry is an object with `name`, `rank`, `points`, `stats_2026`, etc.
  - `frontend/js/player.js:PlayerModule.extractRecentMatches(player)` — Shows how `recent_matches_tab` is accessed from player data
  - `frontend/js/scores.js:ScoresModule.calculateWinEdge(match)` — Shows how existing edge/prediction is calculated (for reference, NOT to modify)

  **API/Type References** (contracts to implement against):
  - `data/wta/001_aryna-sabalenka/stats_2026.json` — Sample stats file showing `recent_matches_tab` structure: `{ year, tournaments: [{ tournament, category, surface, matches: [{ result, opponent_name, opponent_rank, score, round }] }] }`
  - `data/atp/*/stats_2026.json` — ATP version (note: `opponent_rank` is null, has `opponent_id` field instead)
  - `AppState.rankings[tour]` — Array of ranking objects: each has `name`, `rank`, `points`, `country`, `stats_2026` embedded

  **Documentation References**:
  - Tennis Elo formula: `K = 250 / (matches + 5)^0.4`, `Expected = 1 / (1 + 10^((Rb - Ra) / 400))`
  - Adaptive K per FiveThirtyEight methodology
  - Category multipliers: Grand Slam 1.5x, Masters/1000 1.2x, 500 1.0x, 250/125 0.8x

  **WHY Each Reference Matters**:
  - `prediction_wta_upcoming.js`: Copy the module pattern (IIFE + global export) for consistency
  - `app.js`: Must read `AppState.rankings` to access player data and store computed elo in `AppState.eloRatings`
  - `player.js:extractRecentMatches`: Shows exact path to access `recent_matches_tab` — follow this for data extraction
  - Sample `stats_2026.json` files: The actual data shape — check BOTH ATP and WTA samples because schemas differ

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios (MANDATORY):**

  ```
  Scenario: Elo computed for all WTA ranked players
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:8085, app loaded, WTA tour selected
    Steps:
      1. Navigate to: http://localhost:8085
      2. Wait for: .tour-tab.active visible (timeout: 10s)
      3. Execute in console: `const wta = window.TennisApp.AppState.rankings.wta; const eloMap = window.TennisApp.AppState.eloRatings?.wta; console.log('WTA rankings count:', wta?.length); console.log('WTA elo count:', eloMap?.size); const anyNaN = Array.from(eloMap?.values() || []).some(e => isNaN(e.elo)); console.log('Any NaN:', anyNaN);`
      4. Assert: Console shows WTA rankings count > 0
      5. Assert: Console shows WTA elo count > 0
      6. Assert: Console shows "Any NaN: false"
      7. Screenshot: .sisyphus/evidence/task-1-wta-elo-computed.png
    Expected Result: All WTA ranked players have numeric Elo values
    Evidence: .sisyphus/evidence/task-1-wta-elo-computed.png

  Scenario: Elo computed for all ATP ranked players (handles null opponent_rank)
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, ATP tour selected
    Steps:
      1. Navigate to: http://localhost:8085
      2. Click: button[data-tour="atp"]
      3. Wait for: .tour-tab[data-tour="atp"].active (timeout: 5s)
      4. Execute in console: `const atp = window.TennisApp.AppState.rankings.atp; const eloMap = window.TennisApp.AppState.eloRatings?.atp; console.log('ATP rankings count:', atp?.length); console.log('ATP elo count:', eloMap?.size); const anyNaN = Array.from(eloMap?.values() || []).some(e => isNaN(e.elo)); console.log('Any NaN:', anyNaN);`
      5. Assert: Console shows ATP rankings count > 0
      6. Assert: Console shows ATP elo count > 0
      7. Assert: Console shows "Any NaN: false"
      8. Screenshot: .sisyphus/evidence/task-1-atp-elo-computed.png
    Expected Result: All ATP ranked players have numeric Elo values despite null opponent_rank
    Evidence: .sisyphus/evidence/task-1-atp-elo-computed.png

  Scenario: Elo values are reasonable (top players > lower ranked)
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, app loaded
    Steps:
      1. Navigate to: http://localhost:8085
      2. Execute in console: `const eloMap = window.TennisApp.AppState.eloRatings?.wta; const entries = Array.from(eloMap?.entries() || []); const sorted = entries.sort((a,b) => b[1].elo - a[1].elo); console.log('Top 5 Elo:', sorted.slice(0,5).map(e => e[0] + ': ' + e[1].elo.toFixed(0))); console.log('Bottom 5 Elo:', sorted.slice(-5).map(e => e[0] + ': ' + e[1].elo.toFixed(0)));`
      3. Assert: Top 5 Elo values are higher than Bottom 5 Elo values
      4. Assert: All Elo values are between 1200 and 2200
      5. Screenshot: .sisyphus/evidence/task-1-elo-range-check.png
    Expected Result: Elo rankings roughly correlate with official rankings
    Evidence: .sisyphus/evidence/task-1-elo-range-check.png

  Scenario: Elo computation performance under 2 seconds
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to: http://localhost:8085
      2. Execute in console: `const start = performance.now(); window.TennisApp.EloModule.computeAllElo('wta'); const elapsed = performance.now() - start; console.log('WTA compute time:', elapsed.toFixed(0), 'ms');`
      3. Assert: elapsed < 2000
      4. Screenshot: .sisyphus/evidence/task-1-performance.png
    Expected Result: Elo computation completes in under 2 seconds
    Evidence: .sisyphus/evidence/task-1-performance.png

  Scenario: SparklineSVG generates valid SVG
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, Elo computed
    Steps:
      1. Navigate to: http://localhost:8085
      2. Execute in console: `const eloMap = window.TennisApp.AppState.eloRatings?.wta; const firstPlayer = eloMap?.entries().next().value; if (firstPlayer) { const svg = window.TennisApp.EloModule.createSparklineSVG(firstPlayer[1].eloHistory); console.log('SVG starts with <svg:', svg.startsWith('<svg')); console.log('Has polyline:', svg.includes('<polyline')); console.log('SVG length:', svg.length); }`
      3. Assert: SVG starts with <svg: true
      4. Assert: Has polyline: true
      5. Assert: SVG length > 50
    Expected Result: Valid SVG string generated with polyline element
    Evidence: Console output captured
  ```

  **Evidence to Capture:**
  - [ ] Screenshots in .sisyphus/evidence/ for all scenarios
  - [ ] Console output logs for computed values

  **Commit**: YES
  - Message: `feat(elo): add Elo computation engine with ATP/WTA normalization`
  - Files: `frontend/js/elo-engine.js`
  - Pre-commit: Playwright verification scenarios above

---

- [ ] 2. Integrate Elo into Player Card (`frontend/js/player.js`)

  **What to do**:
  - Modify `PlayerModule.render(player, stats, profile, performance, recentMatches)` to add Elo section:
    - After the existing player info section (rank/points badges), before `.player-profile-actions`:
      - Add an Elo rating badge: `<span class="elo-badge">Elo: {eloScore}</span>`
      - Add a week-over-week delta with arrow: `<span class="elo-delta {positive|negative}"><i class="fas fa-arrow-{up|down}"></i> {+/-delta}</span>`
      - If delta is 0 or player has no matches: show `<span class="elo-delta neutral">—</span>`
      - If player Elo data is null (not in rankings): show `<span class="elo-badge provisional">Elo: N/A</span>`
    - Add sparkline below the Elo badge:
      - Call `window.TennisApp.EloModule.createSparklineSVG(eloData.eloHistory)` to get SVG string
      - Wrap in a clickable container: `<div class="elo-sparkline-container" onclick="window.TennisApp.EloModule.openEloDetailModal('{playerName}', '{tour}')">{svgString}</div>`
      - If eloHistory has < 2 entries: show "Provisional" text instead of sparkline
    - Move the "match number" subtitle and "View Recent Matches" button higher in the layout (before Elo section), or ensure Elo section appears naturally below existing content
  - Get player Elo data:
    - Use `window.TennisApp.EloModule.getPlayerElo(player.name, AppState.currentTour)` to retrieve elo data
    - If player name doesn't match exactly, try normalizing (lowercase, trim)
  - Ensure the tour context is passed correctly (check `AppState.currentTour` or derive from player data)

  **Must NOT do**:
  - Do NOT modify `PlayerModule.extractRecentMatches()` logic
  - Do NOT change the existing player profile image or rank/points display
  - Do NOT add inline styles — use CSS classes only
  - Do NOT modify the recent matches modal (`getRecentMatchesModalHTML`)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend UI integration requiring careful placement of visual elements (sparkline, badges, arrows) within an existing dark-themed modal, matching styles.
  - **Skills**: [`playwright`, `frontend-ui-ux`]
    - `playwright`: Browser verification of rendered player card elements
    - `frontend-ui-ux`: UI placement, visual balance, theme matching for sparkline and badges
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations during implementation

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 6

  **References** (CRITICAL):

  **Pattern References**:
  - `frontend/js/player.js:PlayerModule.render()` — The function to modify. Contains the player card HTML template with `.player-profile`, `.player-hero`, `.rank-badge`, `.points-badge`, `.player-profile-actions`
  - `frontend/js/player.js:PlayerModule.showPlayerStats()` — Entry point that calls render(); understand the data flow (fetches player stats, then calls render)
  - `frontend/js/player.js:PlayerModule.extractRecentMatches()` — Shows how to access `stats_2026.recent_matches_tab`

  **API/Type References**:
  - `AppState.eloRatings[tour].get(playerName)` — Returns `{ elo, initialElo, eloHistory, momentum, weekDelta, matchCount }` (from Task 1)
  - `AppState.currentTour` — String "atp" or "wta"

  **CSS References**:
  - `frontend/css/styles.css` — Look for `.rank-badge`, `.points-badge` styles to match Elo badge styling
  - Existing color variables: `--accent-green`, `--accent-red` for positive/negative indicators

  **WHY Each Reference Matters**:
  - `player.js:render()`: This is THE function to inject Elo HTML into — understand its full template to find the right insertion point
  - `styles.css` badge styles: Must match existing visual language for rank/points badges

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios (MANDATORY):**

  ```
  Scenario: Player card shows Elo score and sparkline
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running on localhost:8085, app loaded, rankings loaded
    Steps:
      1. Navigate to: http://localhost:8085
      2. Wait for: .upcoming-match-card visible OR .player-clickable visible (timeout: 15s)
      3. Click: first .player-clickable element (player name in a match card)
      4. Wait for: #playerStatsModal.active visible (timeout: 5s)
      5. Assert: .elo-badge element exists inside #playerStatsModal
      6. Assert: .elo-badge text matches pattern /Elo:\s*\d{4}/
      7. Assert: .elo-sparkline-container element exists OR .elo-badge.provisional exists
      8. Assert: .elo-delta element exists
      9. Screenshot: .sisyphus/evidence/task-2-player-card-elo.png
    Expected Result: Player card displays Elo score, delta arrow, and sparkline
    Evidence: .sisyphus/evidence/task-2-player-card-elo.png

  Scenario: Sparkline click opens Elo detail modal
    Tool: Playwright (playwright skill)
    Preconditions: Player card open with sparkline visible
    Steps:
      1. Click: .elo-sparkline-container inside #playerStatsModal
      2. Wait for: #eloDetailModal.active visible (timeout: 5s)
      3. Assert: .elo-detail-chart svg element exists
      4. Assert: .elo-detail-summary element exists with current Elo text
      5. Screenshot: .sisyphus/evidence/task-2-elo-detail-modal.png
    Expected Result: Elo detail modal opens with trajectory chart and summary
    Evidence: .sisyphus/evidence/task-2-elo-detail-modal.png

  Scenario: Data point click shows factor breakdown popup
    Tool: Playwright (playwright skill)
    Preconditions: Elo detail modal open with trajectory chart
    Steps:
      1. Click: first circle.elo-data-point element in the chart SVG
      2. Wait for: .elo-factor-popup visible (timeout: 3s)
      3. Assert: .elo-factor-popup contains text matching /Result:\s*(W|L)/
      4. Assert: .elo-factor-popup contains text matching /Opponent:/
      5. Assert: .elo-factor-popup contains text matching /K-factor:/
      6. Assert: .elo-factor-popup contains text matching /Elo Change:/
      7. Screenshot: .sisyphus/evidence/task-2-factor-popup.png
    Expected Result: Factor breakdown popup shows result, opponent, K-factor, Elo delta
    Evidence: .sisyphus/evidence/task-2-factor-popup.png

  Scenario: Elo delta arrow shows correct direction
    Tool: Playwright (playwright skill)
    Preconditions: Player card open
    Steps:
      1. Assert: .elo-delta element has either class .positive or .negative or .neutral
      2. If .positive: assert contains fa-arrow-up icon
      3. If .negative: assert contains fa-arrow-down icon
      4. Screenshot: .sisyphus/evidence/task-2-delta-arrow.png
    Expected Result: Delta arrow direction matches positive/negative class
    Evidence: .sisyphus/evidence/task-2-delta-arrow.png
  ```

  **Evidence to Capture:**
  - [ ] Screenshots in .sisyphus/evidence/ for each scenario
  - [ ] Screenshot of player card for both ATP and WTA players

  **Commit**: YES (groups with Task 3, 4)
  - Message: `feat(elo): add Elo score, sparkline, and detail modal to player cards`
  - Files: `frontend/js/player.js`
  - Pre-commit: Playwright verification scenarios above

---

- [ ] 3. Add Momentum Indicators to Upcoming Match Cards (`frontend/js/scores.js`)

  **What to do**:
  - Modify the upcoming match card template in `ScoresModule` (inside `renderUpcomingMatches` or the card creation helper):
    - For each player in the upcoming match card, add a small momentum indicator:
      - `<span class="player-momentum {up|down|neutral}"><i class="fas fa-arrow-{up|down|minus}"></i> {momentum_label}</span>`
      - `momentum_label`: "Hot" (momentum > 20), "Rising" (momentum > 5), "Steady" (|momentum| <= 5), "Cooling" (momentum < -5), "Cold" (momentum < -20)
    - Place the momentum indicator next to the player name or below it in the `.player-row`
    - Add a small inline sparkline (tiny version, 60×16px) next to each player's name if space allows. If too cluttered, use just the text indicator.
  - Get player Elo data for both players in the match:
    - For player1: `window.TennisApp.EloModule.getPlayerElo(match.player1.name, tour)`
    - For player2: `window.TennisApp.EloModule.getPlayerElo(match.player2.name, tour)`
    - If no Elo data found for a player, show no indicator (graceful fallback)
  - Optionally enhance the existing `.edge-bar` with Elo-based prediction:
    - If both players have Elo data, compute win probability from Elo difference: `1 / (1 + 10^((elo2 - elo1) / 400))`
    - Display as a subtle Elo-based edge indicator alongside or within the existing edge bar
    - Do NOT replace the existing `calculateWinEdge` logic — add Elo info supplementally
  - Update `showUpcomingInsights()` modal to include an Elo comparison section:
    - Add a row in the insights modal showing both players' Elo scores and momentum
    - Show Elo-based win probability as a secondary prediction alongside existing factors

  **Must NOT do**:
  - Do NOT modify `calculateWinEdge()` formula or weights in `prediction_wta_upcoming.js`
  - Do NOT replace existing prediction logic — only supplement
  - Do NOT make cards significantly wider or taller — keep compact
  - Do NOT add full sparklines to cards if they make the layout too busy (use text indicators)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI modifications to existing match cards, careful visual placement to avoid cluttering compact card layout, theme-consistent styling.
  - **Skills**: [`playwright`, `frontend-ui-ux`]
    - `playwright`: Browser verification of updated match cards
    - `frontend-ui-ux`: Layout decisions for compact card space, visual balance
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 6

  **References** (CRITICAL):

  **Pattern References**:
  - `frontend/js/scores.js:ScoresModule.renderUpcomingMatches()` — Main rendering function for upcoming section; contains or calls the card creation template
  - `frontend/js/scores.js:ScoresModule.attachUpcomingInsights(matches)` — Binds `.edge-bar` click handlers
  - `frontend/js/scores.js:ScoresModule.showUpcomingInsights()` — Builds upcoming insights modal; reference for adding Elo comparison row
  - `frontend/js/scores.js:ScoresModule.calculateWinEdge(match)` — Existing prediction; DO NOT modify, but understand the output format to supplement

  **API/Type References**:
  - `AppState.upcomingMatches[tour]` — Array of match objects: `{ id, player1: { name, rank, ... }, player2: { name, rank, ... }, tournament, surface, ... }`
  - `AppState.eloRatings[tour].get(playerName)` — Returns elo data object (from Task 1)

  **CSS References**:
  - `frontend/css/styles.css` — `.upcoming-match-card`, `.player-row`, `.player-name`, `.edge-bar` styles
  - Existing category badge colors and surface badge patterns

  **WHY Each Reference Matters**:
  - `renderUpcomingMatches`: Entry point for card creation — must find the exact HTML template to inject momentum indicator
  - `showUpcomingInsights`: The modal that opens on edge-bar click — must add Elo section to its content
  - `calculateWinEdge`: Must understand output format so Elo info can be displayed alongside it without conflicting

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios (MANDATORY):**

  ```
  Scenario: Upcoming match cards show momentum indicators
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, upcoming matches loaded
    Steps:
      1. Navigate to: http://localhost:8085
      2. Wait for: .upcoming-match-card visible (timeout: 15s)
      3. Assert: at least one .player-momentum element exists in .upcoming-match-card
      4. Assert: .player-momentum has one of classes: .up, .down, or .neutral
      5. Assert: .player-momentum text matches one of: "Hot", "Rising", "Steady", "Cooling", "Cold"
      6. Screenshot: .sisyphus/evidence/task-3-upcoming-momentum.png
    Expected Result: Upcoming match cards display momentum labels for players
    Evidence: .sisyphus/evidence/task-3-upcoming-momentum.png

  Scenario: Upcoming insights modal shows Elo comparison
    Tool: Playwright (playwright skill)
    Preconditions: Upcoming match cards visible
    Steps:
      1. Click: first .edge-bar or .upcoming-match-card with edge indicator
      2. Wait for: upcoming insights modal visible (timeout: 5s)
      3. Assert: modal contains .elo-comparison element OR text containing "Elo"
      4. Assert: modal shows two Elo scores (one per player)
      5. Screenshot: .sisyphus/evidence/task-3-insights-elo.png
    Expected Result: Insights modal includes Elo-based comparison section
    Evidence: .sisyphus/evidence/task-3-insights-elo.png

  Scenario: Graceful fallback when player has no Elo data
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to: http://localhost:8085
      2. Execute in console: `document.querySelectorAll('.upcoming-match-card').forEach(card => { const moms = card.querySelectorAll('.player-momentum'); console.log('Card momentum count:', moms.length); });`
      3. Assert: No JS errors in console
      4. Assert: Cards without Elo data show no broken layout
      5. Screenshot: .sisyphus/evidence/task-3-fallback.png
    Expected Result: Cards gracefully handle missing Elo data
    Evidence: .sisyphus/evidence/task-3-fallback.png
  ```

  **Commit**: YES (groups with Task 2, 4)
  - Message: `feat(elo): add momentum indicators to upcoming match cards`
  - Files: `frontend/js/scores.js`
  - Pre-commit: Playwright scenarios above

---

- [ ] 4. Add Elo Leaderboard to Stats Zone (`frontend/js/stats-zone.js`)

  **What to do**:
  - Modify `StatZoneModule.render()` to add an Elo leaderboard table:
    - The Elo table sits NEXT to existing stat tables (side by side if space allows, or as a new section/tab)
    - Reduce existing table width slightly to make room, or add a toggle/tab for "Elo Rankings" alongside existing stat categories
    - Table structure matching existing stat tables:
      - Header: "Elo Rankings" with ATP/WTA indicator
      - Columns: `#` (rank by Elo), Player Name, Elo Score, Δ (delta), Trend (sparkline)
      - Rows: Sorted by Elo descending (highest first)
      - Limit: Show top 20-30 players
    - Use same CSS classes as existing stat tables for consistent styling (`.modal-data-table` or similar table class used in stats-zone.js)
    - Each row's Elo score is clickable: `<td class="elo-score-cell clickable" onclick="window.TennisApp.EloModule.openEloDetailModal('{playerName}', '{tour}')">{eloScore}</td>`
    - The Trend column contains a tiny sparkline (40×12px) — use `window.TennisApp.EloModule.createSparklineSVG(eloData.eloHistory, { width: 40, height: 12 })`
    - The Δ column shows `+{delta}` in green or `-{delta}` in red with appropriate CSS classes
  - Data source: Iterate `AppState.eloRatings[currentTour]`, sort entries by `.elo` descending, take top 20-30
  - Handle edge case: if `AppState.eloRatings` is not yet computed (module not loaded), show placeholder text "Loading Elo ratings..."
  - Ensure the table updates when tour is switched (ATP ↔ WTA) — listen to tour change or regenerate on `render()` call

  **Must NOT do**:
  - Do NOT break existing stat tables — they must continue working
  - Do NOT use a completely different table styling — match existing patterns
  - Do NOT make the Stats Zone modal significantly wider
  - Do NOT add pagination — just limit to top 20-30

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Table layout, responsive design, visual consistency with existing stat tables, dark theme matching.
  - **Skills**: [`playwright`, `frontend-ui-ux`]
    - `playwright`: Browser verification of Stats Zone table rendering
    - `frontend-ui-ux`: Table design, layout balancing with existing tables
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: Tasks 1, 6

  **References** (CRITICAL):

  **Pattern References**:
  - `frontend/js/stats-zone.js:StatZoneModule.render()` — Main render function to modify; understand current table creation pattern
  - `frontend/js/stats-zone.js:StatZoneModule.closeBreakdownModal()` — Existing breakdown modal pattern to reuse for Elo detail
  - `frontend/index.html:307-340` — Stats Zone modal HTML anchors: `#statsZoneModal`, `#statsZoneContent`, `#statsZoneBreakdownModal`, `#statsZoneBreakdownContent`

  **API/Type References**:
  - `AppState.eloRatings[tour]` — Map of playerName → eloData (from Task 1)
  - `AppState.currentTour` — String "atp" or "wta"

  **CSS References**:
  - `frontend/css/styles.css` — `.stats-zone-modal`, `.modal-data-table`, table styling patterns
  - Existing table responsive behavior: `overflow-x: auto` on table wrappers

  **WHY Each Reference Matters**:
  - `stats-zone.js:render()`: This is where the Elo table must be injected — understand its complete output to add alongside
  - `index.html modal anchors`: The Stats Zone already has modal + breakdown modal — reuse breakdown for Elo detail or redirect clicks to `#eloDetailModal`

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios (MANDATORY):**

  ```
  Scenario: Stats Zone shows Elo leaderboard table
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running, app loaded
    Steps:
      1. Navigate to: http://localhost:8085
      2. Click: #statsZoneBtn (Stats Zone button in header)
      3. Wait for: #statsZoneModal.active visible (timeout: 5s)
      4. Assert: element containing "Elo Rankings" text exists in #statsZoneContent
      5. Assert: Elo table has at least 10 rows
      6. Assert: First row Elo score > last row Elo score (sorted descending)
      7. Screenshot: .sisyphus/evidence/task-4-stats-zone-elo.png
    Expected Result: Elo leaderboard table visible in Stats Zone with sorted rankings
    Evidence: .sisyphus/evidence/task-4-stats-zone-elo.png

  Scenario: Elo score click opens detail modal
    Tool: Playwright (playwright skill)
    Preconditions: Stats Zone open with Elo table
    Steps:
      1. Click: first .elo-score-cell.clickable in Elo table
      2. Wait for: #eloDetailModal.active visible (timeout: 5s)
      3. Assert: Elo detail chart visible
      4. Assert: Player name matches the row clicked
      5. Screenshot: .sisyphus/evidence/task-4-elo-from-stats.png
    Expected Result: Clicking Elo score opens the detailed Elo modal for that player
    Evidence: .sisyphus/evidence/task-4-elo-from-stats.png

  Scenario: Tour switch updates Elo table
    Tool: Playwright (playwright skill)
    Preconditions: Stats Zone open showing ATP Elo table
    Steps:
      1. Note: first player name in Elo table
      2. Close Stats Zone modal
      3. Click: button[data-tour="wta"]
      4. Wait for: .tour-tab[data-tour="wta"].active
      5. Click: #statsZoneBtn
      6. Wait for: #statsZoneModal.active visible
      7. Assert: first player name in Elo table is different from ATP (different tour)
      8. Screenshot: .sisyphus/evidence/task-4-tour-switch.png
    Expected Result: Elo table updates to show WTA players when tour is switched
    Evidence: .sisyphus/evidence/task-4-tour-switch.png

  Scenario: Sparklines visible in Elo table trend column
    Tool: Playwright (playwright skill)
    Preconditions: Stats Zone open with Elo table
    Steps:
      1. Assert: at least one svg element exists within the Elo table
      2. Assert: svg contains polyline element
      3. Screenshot: .sisyphus/evidence/task-4-table-sparklines.png
    Expected Result: Tiny sparklines render in the Trend column
    Evidence: .sisyphus/evidence/task-4-table-sparklines.png
  ```

  **Commit**: YES (groups with Tasks 2, 3)
  - Message: `feat(elo): add Elo leaderboard table to Stats Zone`
  - Files: `frontend/js/stats-zone.js`
  - Pre-commit: Playwright scenarios above

---

- [ ] 5. App Wiring, Modal Anchors, and Final Integration

  **What to do**:
  - Modify `frontend/index.html`:
    - Add Elo detail modal overlay anchor (after existing modals, e.g., after `#statsZoneBreakdownModal`):
      ```html
      <div class="modal-overlay" id="eloDetailModal">
          <div class="modal-content elo-detail-modal">
              <div class="modal-header">
                  <h2 id="eloDetailTitle">Elo Trajectory</h2>
                  <button class="close-modal" onclick="window.TennisApp.EloModule.closeEloDetailModal()">&times;</button>
              </div>
              <div class="modal-body" id="eloDetailContent">
              </div>
          </div>
      </div>
      ```
    - Add `<script src="js/elo-engine.js?v=20260216"></script>` BEFORE `app.js` in the script loading order (elo-engine must be available when app.js calls `EloModule.init()`)
  - Modify `frontend/js/app.js`:
    - In the app initialization sequence (after rankings are loaded):
      - Call `window.TennisApp.EloModule.init()` to compute Elo for both tours
      - This should happen AFTER `AppState.rankings.atp` and `AppState.rankings.wta` are populated
    - In the tour-switch handler:
      - No Elo recompute needed (both tours computed at init), but ensure UI components that read `AppState.currentTour` re-render with correct tour's Elo data
    - In the rankings refresh handler (if rankings are re-fetched during session):
      - Re-compute Elo: call `window.TennisApp.EloModule.init()` again
  - Final integration testing:
    - Verify all 3 UI surfaces work together: player card, upcoming cards, Stats Zone
    - Verify Elo detail modal opens from all 3 locations (player card sparkline, Stats Zone Elo score click)
    - Verify modal close behavior: close button, backdrop click
    - Verify no JS console errors on fresh page load

  **Must NOT do**:
  - Do NOT change the script loading order of existing scripts
  - Do NOT modify any other modal anchors in index.html
  - Do NOT add async/await patterns that would block app initialization
  - Do NOT call `EloModule.init()` before rankings data is available

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple wiring task — adding a script tag, modal HTML, and one `init()` call. No complex logic.
  - **Skills**: [`playwright`]
    - `playwright`: Full end-to-end verification of the complete feature
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No design decisions in this task
    - `git-master`: Not needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential, final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 1, 2, 3, 4, 6

  **References** (CRITICAL):

  **Pattern References**:
  - `frontend/index.html:307-340` — Existing modal anchors pattern (`#statsZoneModal`, `#statsZoneBreakdownModal`) — follow exact same structure for `#eloDetailModal`
  - `frontend/js/app.js` — Initialization sequence where rankings are loaded and modules are initialized; find the callback/promise chain where `AppState.rankings` is populated
  - `frontend/index.html` — Script loading order at bottom of file (find where `app.js` is loaded)

  **API/Type References**:
  - `window.TennisApp.EloModule` — Module exported by `elo-engine.js` with methods: `init()`, `computeAllElo(tour)`, `openEloDetailModal()`, `closeEloDetailModal()`, `getPlayerElo()`, `createSparklineSVG()`

  **WHY Each Reference Matters**:
  - `index.html` modal anchors: Must place `#eloDetailModal` consistently with other modals
  - `app.js` init sequence: Must place `EloModule.init()` AFTER rankings load to ensure data is available
  - Script loading order: `elo-engine.js` must load before `app.js` calls its methods

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios (MANDATORY):**

  ```
  Scenario: Full end-to-end — page loads without errors
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running
    Steps:
      1. Navigate to: http://localhost:8085
      2. Wait for: page fully loaded (networkidle)
      3. Capture console errors: page.on('console', msg => msg.type() === 'error')
      4. Assert: No JavaScript errors in console related to EloModule or elo-engine
      5. Assert: window.TennisApp.EloModule is defined (execute in console)
      6. Assert: window.TennisApp.AppState.eloRatings is defined and has 'atp' and 'wta' keys
      7. Screenshot: .sisyphus/evidence/task-5-clean-load.png
    Expected Result: App loads cleanly with Elo computed for both tours
    Evidence: .sisyphus/evidence/task-5-clean-load.png

  Scenario: Full flow — player card to Elo detail to close
    Tool: Playwright (playwright skill)
    Preconditions: App loaded, rankings loaded
    Steps:
      1. Navigate to: http://localhost:8085
      2. Wait for: .player-clickable visible
      3. Click: first .player-clickable
      4. Wait for: #playerStatsModal.active
      5. Assert: .elo-badge visible
      6. Click: .elo-sparkline-container
      7. Wait for: #eloDetailModal.active
      8. Assert: .elo-detail-chart visible
      9. Click: .close-modal in #eloDetailModal
      10. Assert: #eloDetailModal does NOT have .active class
      11. Screenshot: .sisyphus/evidence/task-5-full-flow-player.png
    Expected Result: Complete flow from player card → Elo detail → close works
    Evidence: .sisyphus/evidence/task-5-full-flow-player.png

  Scenario: Full flow — Stats Zone Elo to detail to close
    Tool: Playwright (playwright skill)
    Preconditions: App loaded
    Steps:
      1. Click: #statsZoneBtn
      2. Wait for: #statsZoneModal.active
      3. Assert: Elo Rankings section visible
      4. Click: first .elo-score-cell.clickable
      5. Wait for: #eloDetailModal.active
      6. Assert: chart visible
      7. Click: #eloDetailModal backdrop (outside .modal-content)
      8. Assert: #eloDetailModal closed
      9. Screenshot: .sisyphus/evidence/task-5-full-flow-stats.png
    Expected Result: Complete flow from Stats Zone → Elo detail → backdrop close works
    Evidence: .sisyphus/evidence/task-5-full-flow-stats.png

  Scenario: Tour switch preserves Elo functionality
    Tool: Playwright (playwright skill)
    Preconditions: App loaded on ATP
    Steps:
      1. Navigate to: http://localhost:8085
      2. Click: button[data-tour="wta"]
      3. Wait for: content refresh
      4. Click: first .player-clickable
      5. Wait for: #playerStatsModal.active
      6. Assert: .elo-badge visible (WTA player Elo)
      7. Screenshot: .sisyphus/evidence/task-5-tour-switch.png
    Expected Result: WTA player card shows Elo after tour switch
    Evidence: .sisyphus/evidence/task-5-tour-switch.png

  Scenario: No regressions — existing features work
    Tool: Playwright (playwright skill)
    Preconditions: App loaded
    Steps:
      1. Navigate to: http://localhost:8085
      2. Verify: Live scores section loads (if live matches exist)
      3. Verify: Rankings tab works
      4. Click: H2H button
      5. Assert: H2H modal opens
      6. Close H2H modal
      7. Click: first .player-clickable
      8. Assert: Player card opens with profile info
      9. Click: "View Recent Matches" button if visible
      10. Assert: Recent matches modal opens
      11. Screenshot: .sisyphus/evidence/task-5-no-regression.png
    Expected Result: All existing features continue working alongside new Elo feature
    Evidence: .sisyphus/evidence/task-5-no-regression.png
  ```

  **Commit**: YES
  - Message: `feat(elo): wire Elo module into app lifecycle and add modal anchor`
  - Files: `frontend/index.html`, `frontend/js/app.js`
  - Pre-commit: All Playwright scenarios above

---

- [ ] 6. CSS Styles for Elo/Momentum Components (`frontend/css/styles.css`)

  **What to do**:
  - Add all Elo/momentum CSS to `frontend/css/styles.css` (append to end of file):
  - **Elo Badge styles** (player card):
    - `.elo-badge`: Match existing `.rank-badge` and `.points-badge` styling — background color, font size, padding, border-radius. Use a distinct but complementary accent color (e.g., `#8b5cf6` purple or golden accent).
    - `.elo-badge.provisional`: Muted/dimmed version for players without enough matches
  - **Elo Delta styles**:
    - `.elo-delta`: Base styles (font-size, display: inline-flex, align-items: center, gap)
    - `.elo-delta.positive`: Green color (`var(--accent-green)` or `#22c55e`), fa-arrow-up
    - `.elo-delta.negative`: Red color (`var(--accent-red)` or `#ef4444`), fa-arrow-down
    - `.elo-delta.neutral`: Gray/muted color
  - **Sparkline container styles**:
    - `.elo-sparkline-container`: cursor: pointer, padding, hover effect (subtle glow or scale), transition
    - `.elo-sparkline-container svg`: Display block, no overflow
  - **Momentum indicator styles** (upcoming cards):
    - `.player-momentum`: font-size small (0.7em), badge-like, rounded, inline
    - `.player-momentum.up`: green background tint
    - `.player-momentum.down`: red background tint
    - `.player-momentum.neutral`: gray background tint
  - **Elo detail modal styles**:
    - `.elo-detail-modal`: Width ~600px, max-width 90vw (responsive)
    - `.elo-detail-chart`: SVG container, full width, auto height
    - `.elo-detail-chart svg`: Width 100%, height auto
    - `.elo-detail-chart circle.elo-data-point`: cursor pointer, fill with accent color, hover: scale(1.5) transition
    - `.elo-detail-summary`: Flex row, gap, summary stats display
    - `.elo-factor-popup`: Position absolute, background dark (rgba or theme card bg), border-radius, padding, box-shadow, z-index high, max-width 280px. Arrow/pointer if possible.
    - `.elo-factor-popup .factor-row`: Display grid or flex for label:value pairs
    - `.elo-factor-popup .factor-label`: Muted text color
    - `.elo-factor-popup .factor-value`: Bold, accent color
    - `.elo-factor-popup .factor-value.positive`: Green
    - `.elo-factor-popup .factor-value.negative`: Red
  - **Elo leaderboard table styles** (Stats Zone):
    - `.elo-leaderboard-table`: Match existing `.modal-data-table` patterns
    - `.elo-leaderboard-table th`: Header styles matching existing stat tables
    - `.elo-leaderboard-table td`: Cell padding matching existing
    - `.elo-score-cell.clickable`: cursor pointer, hover: text-decoration underline or color change
    - `.elo-rank-cell`: Text align center, font-weight bold
    - `.elo-trend-cell`: Width ~50px, min-width for sparkline
  - **Elo comparison styles** (upcoming insights modal):
    - `.elo-comparison`: Flex row, center aligned, comparing two player Elo scores
    - `.elo-comparison .elo-vs`: Separator "vs" text between two scores
  - All styles must use the existing dark theme variables and color palette
  - Ensure responsive behavior: modals, tables, sparklines scale properly on smaller screens
  - Use existing CSS variable names (check what's defined in `:root` or `:root[data-theme]`)

  **Must NOT do**:
  - Do NOT modify any existing CSS rules
  - Do NOT add `!important` overrides
  - Do NOT change the existing color palette or theme variables
  - Do NOT add CSS animations for sparklines (keep them static)
  - Do NOT use external CSS frameworks

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Pure CSS styling work requiring deep understanding of existing dark theme, color variables, and visual consistency. Must produce visually appealing badges, sparklines, modals, and tables.
  - **Skills**: [`playwright`, `frontend-ui-ux`]
    - `playwright`: Screenshot verification of styled components
    - `frontend-ui-ux`: Visual design decisions, color choices, spacing, visual hierarchy
  - **Skills Evaluated but Omitted**:
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None (can start immediately)

  **References** (CRITICAL):

  **Pattern References**:
  - `frontend/css/styles.css` — ENTIRE file. Must read to understand:
    - `:root` CSS variables (colors, spacing, font sizes, border-radius)
    - `.rank-badge`, `.points-badge` — Template for `.elo-badge` styling
    - `.modal-overlay`, `.modal-content`, `.modal-header`, `.modal-body`, `.close-modal` — Modal styling patterns
    - `.upcoming-match-card`, `.player-row`, `.player-name` — Card layout patterns
    - `.modal-data-table` or table-related classes — Table styling for Elo leaderboard
    - `.edge-bar` — Edge indicator styling
    - All responsive breakpoints (`@media` queries)

  **Test References**:
  - No CSS tests — verified visually via Playwright screenshots

  **WHY Each Reference Matters**:
  - CSS variables: Must use existing theme variables (not hardcoded colors) for theme consistency
  - Badge styles: Copy structure for Elo badge to ensure visual family resemblance
  - Modal styles: Elo detail modal must feel like a native part of the dashboard
  - Table styles: Elo leaderboard must be indistinguishable in style from existing stat tables

  **Acceptance Criteria**:

  **Agent-Executed QA Scenarios (MANDATORY):**

  ```
  Scenario: CSS file has no syntax errors
    Tool: Bash
    Preconditions: styles.css modified
    Steps:
      1. Run: npx stylelint frontend/css/styles.css (if stylelint available) OR manually check for unclosed brackets
      2. Assert: No syntax errors
    Expected Result: CSS parses without errors
    Evidence: Command output captured

  Scenario: Elo styles use existing CSS variables
    Tool: Bash (grep)
    Preconditions: styles.css modified with new Elo styles
    Steps:
      1. Search for hardcoded color values in new Elo CSS rules
      2. Assert: New rules reference `var(--` CSS variables where possible
      3. Assert: No `!important` in new rules
    Expected Result: New CSS follows existing variable-based theming
    Evidence: grep output captured

  Scenario: Visual check — all Elo components styled correctly
    Tool: Playwright (playwright skill)
    Preconditions: Dev server running with all tasks complete
    Steps:
      1. Navigate to: http://localhost:8085
      2. Click: first .player-clickable to open player card
      3. Screenshot: .sisyphus/evidence/task-6-player-card-styled.png
      4. Click: .elo-sparkline-container
      5. Screenshot: .sisyphus/evidence/task-6-elo-modal-styled.png
      6. Close modal, click #statsZoneBtn
      7. Screenshot: .sisyphus/evidence/task-6-stats-zone-styled.png
    Expected Result: All Elo components match dashboard dark theme consistently
    Evidence: .sisyphus/evidence/task-6-*.png screenshots
  ```

  **Commit**: YES
  - Message: `feat(elo): add CSS styles for Elo badges, sparklines, modals, and leaderboard`
  - Files: `frontend/css/styles.css`
  - Pre-commit: Visual verification via Playwright

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(elo): add Elo computation engine with ATP/WTA normalization` | `frontend/js/elo-engine.js` | Console assertions |
| 6 | `feat(elo): add CSS styles for Elo badges, sparklines, modals, and leaderboard` | `frontend/css/styles.css` | Visual check |
| 2+3+4 | `feat(elo): integrate Elo into player cards, upcoming matches, and Stats Zone` | `frontend/js/player.js`, `frontend/js/scores.js`, `frontend/js/stats-zone.js` | Playwright screenshots |
| 5 | `feat(elo): wire Elo module into app lifecycle and add modal anchor` | `frontend/index.html`, `frontend/js/app.js` | Full E2E Playwright |

---

## Success Criteria

### Verification Commands
```bash
# Start dev server
cd backend && python app.py &
cd frontend && python3 no_cache_server.py &

# Verify all files exist
ls frontend/js/elo-engine.js  # Expected: file exists

# No JS errors on load (via Playwright console capture)
```

### Final Checklist
- [ ] All "Must Have" present (Elo badges, sparklines, detail modal, leaderboard, both tours)
- [ ] All "Must NOT Have" absent (no surface Elo, no backend changes, no new dependencies, no prediction formula changes)
- [ ] No JavaScript console errors on fresh page load
- [ ] Player card shows Elo + sparkline + delta for both ATP and WTA players
- [ ] Upcoming match cards show momentum indicators
- [ ] Stats Zone Elo leaderboard shows top 20-30 players sorted by Elo
- [ ] Elo detail modal opens from player card sparkline and Stats Zone score click
- [ ] Factor breakdown popup shows on data point click in detail modal
- [ ] All modals close via close button and backdrop click
- [ ] Elo computation completes in < 2 seconds
- [ ] No NaN Elo values for any ranked player
- [ ] All new CSS uses existing theme variables (no hardcoded colors)
- [ ] Responsive: modals and tables work on common screen sizes
