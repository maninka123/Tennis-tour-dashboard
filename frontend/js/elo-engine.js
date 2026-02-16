(function (global) {
    // New points-based form system (replaces Elo)
    const DEFAULT_FORM = 1000;
    const FORM_FLOOR = 700;
    const FORM_CEILING = 1500;
    const MAX_MATCHES = 10;

    // Global form cache - loaded asynchronously from server
    let formCacheData = null;
    let formCacheLoading = false;

    const CATEGORY_MULTIPLIERS = {
        grand_slam: 1.5,
        masters_1000: 1.2,
        premier_mandatory: 1.2,
        wta_1000: 1.2,
        atp_500: 0.9,
        wta_500: 0.9,
        atp_250: 0.7,
        wta_250: 0.7,
        wta_125: 0.6
    };

    function toNumber(value, fallback = null) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function toPositiveInt(value, fallback = null) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) && n > 0 ? n : fallback;
    }

    function toNonNegativeInt(value, fallback = null) {
        const n = parseInt(value, 10);
        return Number.isFinite(n) && n >= 0 ? n : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function round2(value) {
        const n = toNumber(value, 0);
        return Number(n.toFixed(2));
    }

    function normalizeName(name) {
        return String(name || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/["'`]/g, '')
            .replace(/[^a-z0-9\s.-]/g, ' ')
            .replace(/[.]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function splitNameParts(name) {
        return normalizeName(name).split(' ').filter(Boolean);
    }

    function getFirstInitial(parts) {
        return (parts[0] || '').charAt(0) || '';
    }

    function getLastName(parts) {
        return parts.length ? parts[parts.length - 1] : '';
    }

    function createEmptyEloData(initialElo) {
        return {
            elo: round2(initialElo),
            initialElo: round2(initialElo),
            eloHistory: [],
            momentum: 0,
            weekDelta: 0,
            matchCount: 0
        };
    }

    function normalizeRound(match) {
        const roundName = String(match?.round_name || '').trim();
        const round = String(match?.round || '').trim();
        return roundName || round || '-';
    }

    function getRecentMatchesSource(stats) {
        const candidates = [
            stats?.recent_matches_tab,
            stats?.recent_matches,
            stats?.recent_matches_from_tournaments,
            stats?.recent_matches_best
        ];

        let best = null;
        let bestCount = -1;

        for (const candidate of candidates) {
            if (!candidate || !Array.isArray(candidate.tournaments)) continue;
            const count = candidate.tournaments.reduce((acc, tournament) => {
                const matches = Array.isArray(tournament?.matches) ? tournament.matches.length : 0;
                return acc + matches;
            }, 0);
            if (count > bestCount) {
                best = candidate;
                bestCount = count;
            }
        }

        return best;
    }

    function inferResultFromScore(score, scoreRaw) {
        const fromScore = String(score || '');
        const setPattern = /(\d+)\s*-\s*(\d+)/g;
        const sets = [];
        let match;

        while ((match = setPattern.exec(fromScore)) !== null) {
            sets.push([parseInt(match[1], 10), parseInt(match[2], 10)]);
        }

        if (!sets.length) {
            const tokens = String(scoreRaw || '')
                .replace(/\(([^)]*)\)/g, ' $1 ')
                .replace(/[A-Za-z]+/g, ' ')
                .match(/\d+/g);
            const values = (tokens || []).map((token) => parseInt(token, 10)).filter(Number.isFinite);
            let i = 0;
            while (i + 1 < values.length) {
                const a = values[i];
                const b = values[i + 1];
                i += 2;
                if ((a === 7 && b === 6) || (a === 6 && b === 7)) {
                    if (i < values.length && values[i] >= 0 && values[i] <= 20) {
                        i += 1;
                    }
                }
                sets.push([a, b]);
            }
        }

        if (!sets.length) return null;

        let playerSets = 0;
        let opponentSets = 0;
        for (const [a, b] of sets) {
            if (a > b) playerSets += 1;
            if (b > a) opponentSets += 1;
        }

        if (playerSets > opponentSets) return 'W';
        if (opponentSets > playerSets) return 'L';
        return null;
    }

    function normalizeMatches(player, tour) {
        const stats = player?.stats_2026 || {};
        const recentMatchesTab = getRecentMatchesSource(stats);
        const tournaments = Array.isArray(recentMatchesTab?.tournaments) ? recentMatchesTab.tournaments : [];
        const flattened = [];

        for (const tournament of tournaments) {
            const matches = Array.isArray(tournament?.matches) ? tournament.matches : [];
            for (const match of matches) {
                const opponentName = String(match?.opponent_name || '').trim();
                if (!opponentName || opponentName === '-' || /^bye$/i.test(opponentName)) {
                    continue;
                }

                const score = String(match?.score || match?.score_raw || '').trim();
                const isWalkover = /w\s*\/\s*o/i.test(score);
                const isRetirement = /\bret\b|ret\./i.test(score) || /\bret\b|ret\./i.test(String(match?.score_raw || ''));
                let result = String(match?.result || '').trim().toUpperCase();

                if (result !== 'W' && result !== 'L') {
                    const inferred = inferResultFromScore(match?.score, match?.score_raw);
                    if (inferred) {
                        result = inferred;
                    } else if (isWalkover) {
                        result = 'W';
                    }
                }

                flattened.push({
                    result,
                    opponentName,
                    opponentRank: toPositiveInt(match?.opponent_rank, null),
                    score,
                    round: normalizeRound(match),
                    tournamentName: String(tournament?.tournament || '').trim() || 'Tournament',
                    category: String(tournament?.category || '').trim().toLowerCase() || 'other',
                    surface: String(tournament?.surface || tournament?.surface_key || '').trim() || 'HARD',
                    isWalkover,
                    isRetirement,
                    tour: String(tour || '').toLowerCase() === 'wta' ? 'wta' : 'atp'
                });
            }
        }

        flattened.reverse();
        return flattened;
    }

    function upsertAlias(aliasMap, aliasKey, playerKey, rank) {
        if (!aliasKey) return;
        const list = aliasMap.get(aliasKey) || [];
        const existing = list.find((item) => item.key === playerKey);
        if (!existing) {
            list.push({ key: playerKey, rank: toPositiveInt(rank, 9999) });
            list.sort((a, b) => a.rank - b.rank);
            aliasMap.set(aliasKey, list);
        }
    }

    function buildPlayerLookup(rankings) {
        const list = Array.isArray(rankings) ? rankings : [];
        const lookup = new Map();
        const initialLastMap = new Map();
        const lastNameMap = new Map();

        for (const player of list) {
            const name = String(player?.name || '').trim();
            if (!name) continue;

            const rank = toPositiveInt(player?.rank, null);
            const normalized = normalizeName(name);
            if (!normalized) continue;

            const seeded = seedInitialForm(rank, name);
            const existing = lookup.get(normalized);
            if (!existing || (toPositiveInt(rank, 9999) < toPositiveInt(existing.rank, 9999))) {
                lookup.set(normalized, {
                    rank,
                    name,
                    elo: seeded
                });
            }

            const parts = splitNameParts(name);
            const firstInitial = getFirstInitial(parts);
            const lastName = getLastName(parts);

            if (lastName && firstInitial) {
                upsertAlias(initialLastMap, `${lastName}|${firstInitial}`, normalized, rank);
            }
            if (lastName) {
                upsertAlias(lastNameMap, lastName, normalized, rank);
            }
        }

        Object.defineProperty(lookup, '_initialLastMap', {
            value: initialLastMap,
            enumerable: false,
            configurable: false,
            writable: false
        });

        Object.defineProperty(lookup, '_lastNameMap', {
            value: lastNameMap,
            enumerable: false,
            configurable: false,
            writable: false
        });

        return lookup;
    }

    function resolveOpponentEntry(opponentName, playerLookup) {
        if (!(playerLookup instanceof Map)) return null;
        const normalized = normalizeName(opponentName);
        if (!normalized) return null;

        const direct = playerLookup.get(normalized);
        if (direct) {
            return { key: normalized, player: direct };
        }

        const parts = normalized.split(' ').filter(Boolean);
        const firstInitial = getFirstInitial(parts);
        const lastName = getLastName(parts);

        if (lastName && firstInitial) {
            const bucket = playerLookup._initialLastMap?.get(`${lastName}|${firstInitial}`) || [];
            if (bucket.length) {
                const candidate = bucket[0];
                const player = playerLookup.get(candidate.key);
                if (player) {
                    return { key: candidate.key, player };
                }
            }
        }

        if (lastName) {
            const bucket = playerLookup._lastNameMap?.get(lastName) || [];
            if (bucket.length === 1) {
                const candidate = bucket[0];
                const player = playerLookup.get(candidate.key);
                if (player) {
                    return { key: candidate.key, player };
                }
            }
        }

        return null;
    }

    function resolveOpponentRank(opponentName, playerLookup) {
        const resolved = resolveOpponentEntry(opponentName, playerLookup);
        return toPositiveInt(resolved?.player?.rank, null);
    }

    function seedInitialForm(rank, playerName, tour = 'atp') {
        // First check if we have cached form from weekly file
        if (formCacheData) {
            const tourKey = String(tour || 'atp').toLowerCase();
            const playerCache = formCacheData[tourKey]?.[playerName];
            if (playerCache && typeof playerCache.form === 'number') {
                return playerCache.form;
            }
        }
        
        // Fallback to rank-based calculation (only for new players or cache miss)
        const numericRank = toPositiveInt(rank, null);
        if (!numericRank) return DEFAULT_FORM;
        const bonus = Math.max(0, Math.log(200 / Math.max(1, numericRank)) * 50);
        return DEFAULT_FORM + bonus;
    }

    function loadFormCacheAsync() {
        // Load form cache from backend without blocking initialization
        if (formCacheLoading) return; // Already loading
        formCacheLoading = true;
        
        fetch('/api/form-cache/data')
            .then(res => res.json())
            .then(response => {
                if (response.success && response.data) {
                    formCacheData = response.data;
                    console.log('[FormCache] Loaded player form cache successfully');
                    // Re-initialize form ratings with cache now available
                    const tennisApp = global.TennisApp;
                    if (tennisApp?.AppState?.eloRatings) {
                        // Trigger re-init with cache
                        init();
                    }
                }
            })
            .catch(err => {
                console.warn('[FormCache] Failed to load form cache:', err);
                // Continue without cache, fall back to rank-based calculation
            })
            .finally(() => {
                formCacheLoading = false;
            });
    }


    function calculateRankFactor(playerPoints, opponentPoints, isWin) {
        // Fair strength ratio: rewards upsets, reduces reward for expected results
        // Uses normalized share so differences scale reasonably across ranking ranges
        const playerPts = Math.max(1, toNumber(playerPoints, 1000));
        const opponentPts = Math.max(1, toNumber(opponentPoints, 1000));
        const total = playerPts + opponentPts;

        if (isWin) {
            // opponent's share of combined points → higher = harder opponent = more reward
            // Equal opponents → 0.5 * 2.4 = 1.2 (normal reward)
            // Weak opponent → 0.1 * 2.4 = 0.24 (minimal reward for expected win)
            // Strong opponent → 0.8 * 2.4 = 1.92 (big reward for upset)
            const opponentShare = opponentPts / total;
            const multiplier = opponentShare * 2.4;
            return clamp(multiplier, 0.15, 2.5);
        } else {
            // player's share → higher = bigger upset loss = heavier penalty
            // Equal opponents → -(0.5 * 2.2) = -1.1 (normal loss)
            // Lost to stronger → -(0.3 * 2.2) = -0.66 (expected, lighter penalty)
            // Lost to weaker → -(0.85 * 2.2) = -1.87 (upset loss, heavy penalty)
            const playerShare = playerPts / total;
            const multiplier = -(playerShare * 2.2);
            return clamp(multiplier, -2.5, -0.15);
        }
    }

    function calculateDominanceMultiplier(score, result) {
        // Analyze match dominance from score
        // Returns bonus/penalty multiplier based on match quality
        
        const fromScore = String(score || '').trim();
        const setPattern = /(\d+)\s*-\s*(\d+)/g;
        const sets = [];
        let match;
        
        while ((match = setPattern.exec(fromScore)) !== null) {
            sets.push([parseInt(match[1], 10), parseInt(match[2], 10)]);
        }
        
        if (!sets.length) return 1.0; // Unknown score, no adjustment
        
        // Check if straight sets (for win) or lost 0 sets (for loss)
        const playerSets = sets.filter(s => s[0] > s[1]).length;
        const opponentSets = sets.filter(s => s[1] > s[0]).length;
        
        let multiplier = 1.0;
        
        if (result === 'W') {
            // Straight sets win: +30% bonus
            if (opponentSets === 0) {
                multiplier += 0.30;
            }
            
            // Check for tiebreak losses (competitive set): -10% if any set went to TB
            let hadTiebreak = false;
            for (const [a, b] of sets) {
                if (Math.abs(a - b) === 1 && (a === 7 || b === 7)) {
                    hadTiebreak = true;
                    break;
                }
            }
            if (hadTiebreak && opponentSets > 0) {
                multiplier -= 0.10;
            }
            
            // Game margin bonus: max game margin / 6 = additional bonus (capped at +0.15)
            let maxMargin = 0;
            for (const [a, b] of sets) {
                if (a > b) maxMargin = Math.max(maxMargin, a - b);
            }
            multiplier += Math.min(0.15, maxMargin / 6 * 0.15);
        } else {
            // Loss - dominance reduces penalty
            // If opponent won only 1 set in 2-3 set match, it's competitive
            if (opponentSets === 1 && sets.length === 3) {
                multiplier += 0.15; // Close loss, reduce penalty by 15%
            } else if (opponentSets === 1 && sets.length === 2) {
                multiplier += 0.10; // Close loss in 2 setter
            }
            
            // Straight sets loss: heavier penalty
            if (playerSets === 0) {
                multiplier -= 0.20;
            }
        }
        
        return clamp(multiplier, 0.5, 1.5);
    }


    function adaptiveK(matchCount, category) {
        // Base points per match, decays gently as more matches are processed
        // Starts ~42, decays to ~27 by match 10 — much lower than old 300 base
        const matches = Math.max(0, toNumber(matchCount, 0));
        const base = 55 / Math.pow(matches + 2, 0.25);
        const key = String(category || '').trim().toLowerCase();
        const multiplier = CATEGORY_MULTIPLIERS[key] || 1.0;
        return base * multiplier;
    }

    function calculateFormChange(match, playerForm, opponentRanking) {
        // Calculate total form change for a match
        const isWin = match.result === 'W';
        const playerRanking = toNumber(match.playerRank, 1000);
        const opponentPts = toNumber(opponentRanking, playerRanking * 0.8);
        
        // 1. Rank factor (strength-based, rewards upsets)
        const rankFactor = calculateRankFactor(playerRanking, opponentPts, isWin);
        
        // 2. Dominance multiplier (match quality — straight sets, margins)
        const dominanceMultiplier = calculateDominanceMultiplier(match.score, match.result);
        
        // 3. Base points (lower base, tournament-weighted)
        const baseK = adaptiveK(toNumber(match.matchCount, 0), match.category);
        
        // Raw change = base × strength factor × dominance
        let formChange = baseK * rankFactor * dominanceMultiplier;
        
        // 4. Ceiling/floor dampening — players near extremes gain/lose less
        //    Prevents top players from perpetually sitting at 1500
        const currentForm = toNumber(playerForm, DEFAULT_FORM);
        if (isWin && currentForm > DEFAULT_FORM) {
            // Gradually reduce gains as form approaches ceiling
            const ceilingProximity = (currentForm - DEFAULT_FORM) / (FORM_CEILING - DEFAULT_FORM);
            const dampening = 1.0 - clamp(ceilingProximity, 0, 1) * 0.55;
            formChange *= dampening;
        } else if (!isWin && currentForm < DEFAULT_FORM) {
            // Gradually reduce losses as form approaches floor
            const floorProximity = (DEFAULT_FORM - currentForm) / (DEFAULT_FORM - FORM_FLOOR);
            const dampening = 1.0 - clamp(floorProximity, 0, 1) * 0.55;
            formChange *= dampening;
        }
        
        // Penalize retirements and walkovers
        if (match.isRetirement) {
            formChange *= 0.5;
        }
        if (match.isWalkover) {
            formChange *= 0.25;
        }
        
        // Tighter clamp: max ±80 per match for realistic progression
        return clamp(formChange, isWin ? 2 : -80, isWin ? 80 : -2);
    }

    function updateForm(currentForm, formChange) {
        // Update form rating with change
        const updated = currentForm + formChange;
        return clamp(updated, FORM_FLOOR, FORM_CEILING);
    }


    function computeMomentum(eloHistory) {
        const history = Array.isArray(eloHistory) ? eloHistory : [];
        if (!history.length) return 0;
        const sample = history.slice(-3);
        const avg = sample.reduce((acc, item) => acc + toNumber(item?.delta, 0), 0) / sample.length;
        return round2(avg);
    }

    function computeWeekDelta(eloHistory, initialElo) {
        const history = Array.isArray(eloHistory) ? eloHistory : [];
        if (!history.length) return 0;

        const latest = toNumber(history[history.length - 1]?.form, null);
        if (!Number.isFinite(latest)) return 0;

        const lookbackMatches = Math.min(3, history.length);
        const baselineIndex = history.length - 1 - lookbackMatches;
        const baseline = baselineIndex >= 0
            ? toNumber(history[baselineIndex]?.form, latest)
            : toNumber(initialElo, latest);
        return round2(latest - baseline);
    }

    function getTourRankings(tour) {
        const safeTour = String(tour || '').toLowerCase() === 'wta' ? 'wta' : 'atp';
        const rankings = global.TennisApp?.AppState?.rankings?.[safeTour];
        return Array.isArray(rankings) ? rankings : [];
    }

    function computeAllElo(tour) {
        const safeTour = String(tour || '').toLowerCase() === 'wta' ? 'wta' : 'atp';
        const rankings = getTourRankings(safeTour);
        const playerLookup = buildPlayerLookup(rankings);
        const eloMap = new Map();
        const playerStates = [];

        for (const player of rankings) {
            const playerName = String(player?.name || '').trim();
            if (!playerName) continue;

            const rank = toPositiveInt(player?.rank, null);
            const initialForm = seedInitialForm(rank, playerName, safeTour);
            eloMap.set(playerName, createEmptyEloData(initialForm));

            const lookupKey = normalizeName(playerName);
            const lookupEntry = playerLookup.get(lookupKey);
            if (lookupEntry) {
                lookupEntry.elo = initialForm;
                lookupEntry.rankPoints = toNumber(player?.points, 1000);
            }

            const normalizedMatches = normalizeMatches(player, safeTour)
                .filter((match) => (match.result === 'W' || match.result === 'L') && !match.isWalkover)
                .slice(-MAX_MATCHES);

            playerStates.push({
                name: playerName,
                lookupKey,
                initialForm,
                currentForm: initialForm,
                matchCount: 0,
                matches: normalizedMatches,
                formHistory: [],
                rankPoints: toNumber(player?.points, 1000)
            });
        }

        const maxDepth = playerStates.reduce((acc, state) => Math.max(acc, state.matches.length), 0);

        for (let depth = 0; depth < maxDepth; depth += 1) {
            for (const state of playerStates) {
                const match = state.matches[depth];
                if (!match) continue;

                const resolvedOpponent = resolveOpponentEntry(match.opponentName, playerLookup);
                const resolvedOpponentRank = toPositiveInt(
                    match.opponentRank ?? resolveOpponentRank(match.opponentName, playerLookup),
                    null
                );
                const opponentRankPoints = toNumber(resolvedOpponent?.player?.rankPoints, toNumber(match.opponentRank, 1000) * 0.8);

                // Calculate form change using new points-based system
                const matchData = {
                    ...match,
                    matchCount: state.matchCount,
                    playerRank: state.rankPoints,
                    opponentRank: opponentRankPoints
                };
                
                const formChange = calculateFormChange(matchData, state.currentForm, opponentRankPoints);
                const updated = updateForm(state.currentForm, formChange);

                state.currentForm = updated;
                state.matchCount += 1;

                // Store calculation details for transparency
                const rankFactor = calculateRankFactor(state.rankPoints, opponentRankPoints, match.result === 'W');
                const dominanceMult = calculateDominanceMultiplier(match.score, match.result);
                const baseTourn = adaptiveK(state.matchCount - 1, match.category);

                state.formHistory.push({
                    form: round2(state.currentForm),
                    delta: round2(formChange),
                    opponentName: match.opponentName || 'Unknown opponent',
                    opponentRank: resolvedOpponentRank,
                    opponentRankPoints: round2(opponentRankPoints),
                    result: match.result,
                    score: match.score || '-',
                    tournamentName: match.tournamentName,
                    category: match.category,
                    round: match.round,
                    strengthRatio: round2(Math.abs(rankFactor)), // Absolute value for display
                    dominanceMultiplier: round2(dominanceMult),
                    basePoints: round2(baseTourn),
                    isRetirement: !!match.isRetirement,
                    isWalkover: !!match.isWalkover
                });

                const selfEntry = playerLookup.get(state.lookupKey);
                if (selfEntry) {
                    selfEntry.elo = state.currentForm;
                }
            }
        }

        for (const state of playerStates) {
            const eloData = eloMap.get(state.name);
            if (!eloData) continue;

            eloData.elo = round2(state.currentForm);
            eloData.eloHistory = state.formHistory;
            eloData.matchCount = state.matchCount;
            eloData.momentum = computeMomentum(state.formHistory);
            eloData.weekDelta = computeWeekDelta(state.formHistory, state.initialForm);
        }

        return eloMap;
    }

    function init() {
        const tennisApp = global.TennisApp = global.TennisApp || {};
        const appState = tennisApp.AppState = tennisApp.AppState || {};
        const atp = computeAllElo('atp');
        const wta = computeAllElo('wta');

        appState.eloRatings = {
            atp,
            wta
        };
        
        // Load form cache asynchronously in background
        if (!formCacheData && !formCacheLoading) {
            loadFormCacheAsync();
        }

        return appState.eloRatings;
    }

    function extractEloValues(eloHistory) {
        const history = Array.isArray(eloHistory) ? eloHistory : [];
        return history
            .map((row) => toNumber(row?.form ?? row, null))
            .filter(Number.isFinite);
    }

    function createSparklineSVG(eloHistory, options = {}) {
        const values = extractEloValues(eloHistory);
        const width = Math.max(30, toNumber(options.width, 120));
        const height = Math.max(16, toNumber(options.height, 32));
        const color = String(options.color || 'var(--accent-green)');
        const negColor = String(options.negColor || 'var(--accent-red)');

        if (!values.length) return '';

        if (values.length === 1) {
            return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="Form sparkline"><circle cx="${width / 2}" cy="${height / 2}" r="2.5" fill="${color}" /></svg>`;
        }

        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = Math.max(1, max - min);
        const stroke = values[values.length - 1] >= values[0] ? color : negColor;

        const points = values.map((value, index) => {
            const x = (index / (values.length - 1)) * (width - 4) + 2;
            const y = height - 2 - ((value - min) / range) * (height - 4);
            return `${round2(x)},${round2(y)}`;
        }).join(' ');

        const [lastX, lastY] = points.split(' ').slice(-1)[0].split(',');

        return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" aria-label="Form sparkline"><polyline fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points}" /><circle cx="${lastX}" cy="${lastY}" r="2.25" fill="${stroke}" /></svg>`;
    }

    function abbreviateTournamentName(name) {
        const source = String(name || '').trim();
        if (!source) return 'Event';
        const words = source
            .replace(/[^A-Za-z0-9\s-]/g, ' ')
            .split(/\s+/)
            .filter(Boolean);
        if (!words.length) return 'Event';
        if (words.length === 1) return words[0].slice(0, 6).toUpperCase();
        return words.slice(0, 2).map((word) => word.charAt(0).toUpperCase()).join('');
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildDetailChart(eloData) {
        const history = Array.isArray(eloData?.eloHistory) ? eloData.eloHistory : [];
        if (!history.length) {
            return '<div class="elo-empty" style="padding:32px;text-align:center;color:#999;">No match data available for Form calculation.</div>';
        }

        const width = 900;
        const height = 320;
        const margin = { top: 24, right: 28, bottom: 52, left: 64 };
        const plotWidth = width - margin.left - margin.right;
        const plotHeight = height - margin.top - margin.bottom;

        const values = history.map((item) => toNumber(item?.form, DEFAULT_FORM));
        const rawMin = Math.min(...values);
        const rawMax = Math.max(...values);
        const padding = Math.max(5, (rawMax - rawMin) * 0.12);
        const minValue = rawMin - padding;
        const maxValue = rawMax + padding;
        const range = Math.max(1, maxValue - minValue);

        const xFor = (idx) => margin.left + (idx / Math.max(1, history.length - 1)) * plotWidth;
        const yFor = (value) => margin.top + (1 - ((value - minValue) / range)) * plotHeight;

        const polylinePoints = history.map((item, idx) => `${round2(xFor(idx))},${round2(yFor(item.form))}`).join(' ');
        const trendUp = values[values.length - 1] >= values[0];
        const strokeColor = trendUp ? '#22c55e' : '#ef4444';
        const fillColor = trendUp ? 'url(#formGradGreen)' : 'url(#formGradRed)';

        // Area fill polygon (line + bottom closure)
        const areaPoints = history.map((item, idx) => `${round2(xFor(idx))},${round2(yFor(item.form))}`).join(' ')
            + ` ${round2(xFor(history.length - 1))},${round2(yFor(minValue))} ${round2(xFor(0))},${round2(yFor(minValue))}`;

        // Gradient defs
        const gradients = `<defs>
            <linearGradient id="formGradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#22c55e" stop-opacity="0.25" />
                <stop offset="100%" stop-color="#22c55e" stop-opacity="0.02" />
            </linearGradient>
            <linearGradient id="formGradRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#ef4444" stop-opacity="0.25" />
                <stop offset="100%" stop-color="#ef4444" stop-opacity="0.02" />
            </linearGradient>
        </defs>`;

        const yTicks = 5;
        const yAxis = [];
        for (let i = 0; i < yTicks; i += 1) {
            const ratio = i / (yTicks - 1);
            const yVal = maxValue - ratio * range;
            const y = yFor(yVal);
            yAxis.push(`<line x1="${margin.left}" y1="${round2(y)}" x2="${width - margin.right}" y2="${round2(y)}" stroke="rgba(0,0,0,0.06)" stroke-dasharray="4,4" stroke-width="1" /><text x="${margin.left - 10}" y="${round2(y + 5)}" text-anchor="end" font-size="13" font-weight="600" fill="#888">${Math.round(yVal)}</text>`);
        }

        const labelStep = history.length > 8 ? Math.ceil(history.length / 6) : 1;
        const xAxis = history.map((item, idx) => {
            if (idx % labelStep !== 0 && idx !== history.length - 1) return '';
            const x = xFor(idx);
            const label = abbreviateTournamentName(item?.tournamentName || item?.opponentName);
            return `<text x="${round2(x)}" y="${height - 12}" text-anchor="middle" font-size="12" font-weight="500" fill="#888">${label}</text>`;
        }).join('');

        const points = history.map((item, idx) => {
            const x = xFor(idx);
            const y = yFor(item.form);
            const delta = toNumber(item?.delta, 0);
            const deltaText = `${delta >= 0 ? '+' : ''}${round2(delta)}`;
            const isWin = item?.result === 'W';
            const dotFill = isWin ? '#22c55e' : '#ef4444';
            return `<circle class="elo-point" data-match-index="${idx}" data-opponent="${escapeHtml(item?.opponentName || 'Unknown opponent')}" data-event="${escapeHtml(item?.tournamentName || 'Event')}" data-score="${escapeHtml(item?.score || '-')}" data-result="${escapeHtml(item?.result || '-')}" data-delta="${escapeHtml(deltaText)}" data-form="${escapeHtml(round2(item?.form || DEFAULT_FORM))}" cx="${round2(x)}" cy="${round2(y)}" r="7" fill="${dotFill}" stroke="#fff" stroke-width="2.5" style="cursor:pointer;filter:drop-shadow(0 1px 3px rgba(0,0,0,0.15));" />`;
        }).join('');

        return `<svg width="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-label="Form trajectory">${gradients}<rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" fill="none" rx="0" /><line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${height - margin.bottom}" stroke="#ddd" stroke-width="1.5" /><line x1="${margin.left}" y1="${height - margin.bottom}" x2="${width - margin.right}" y2="${height - margin.bottom}" stroke="#ddd" stroke-width="1.5" />${yAxis.join('')}<polygon points="${areaPoints}" fill="${fillColor}" /><polyline points="${polylinePoints}" fill="none" stroke="${strokeColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />${points}${xAxis}</svg>`;
    }

    function createEloDetailModalHTML(playerName, eloData) {
        const history = Array.isArray(eloData?.eloHistory) ? eloData.eloHistory : [];
        const current = toNumber(eloData?.elo, DEFAULT_FORM);
        const highest = history.length ? Math.max(...history.map((item) => toNumber(item.form, current)), current) : current;
        const lowest = history.length ? Math.min(...history.map((item) => toNumber(item.form, current)), current) : current;

        const historyRows = history.slice().reverse().map((match) => {
            const delta = toNumber(match.delta, 0);
            const deltaText = `${delta >= 0 ? '+' : ''}${round2(delta)}`;
            const deltaClass = delta > 0 ? 'pos' : (delta < 0 ? 'neg' : 'neut');
            const strengthRatio = round2(toNumber(match.strengthRatio, 1.0));
            const dominance = round2(toNumber(match.dominanceMultiplier, 1.0));
            const matchQuality = dominance > 1.1 ? 'Dominant' : (dominance < 0.9 ? 'Close' : 'Even');

            return `
                <tr>
                    <td>
                        <div style="font-weight:600;">${match.opponentName}</div>
                        <div style="font-size:0.85em;color:#666;">${match.tournamentName} (${match.round})</div>
                    </td>
                    <td><span class="badge-${match.result === 'W' ? 'win' : 'loss'}">${match.result}</span></td>
                    <td style="font-family:monospace;">${match.score}</td>
                    <td>${strengthRatio}x</td>
                    <td>${matchQuality}</td>
                    <td class="delta-${deltaClass}" style="font-weight:bold;">${deltaText}</td>
                </tr>
            `;
        }).join('');

        return `
            <div class="modal-content" style="max-width:920px;width:min(94vw,920px);max-height:90vh;overflow:auto;border-radius:20px;">
                <div class="modal-header" style="padding:18px 24px;">
                    <h3 style="font-size:1.2rem;font-weight:700;">${playerName} — Current Form</h3>
                    <button class="close-modal" data-elo-close>&times;</button>
                </div>
                <div class="modal-body" style="display:flex;flex-direction:column;gap:16px;padding:16px 24px 24px;">
                     <div class="elo-summary" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;">
                        <div class="form-stat-card"><div class="form-stat-label">Current Form</div><div class="form-stat-value">${Math.round(current)}</div></div>
                        <div class="form-stat-card"><div class="form-stat-label">Peak (10m)</div><div class="form-stat-value">${Math.round(highest)}</div></div>
                        <div class="form-stat-card"><div class="form-stat-label">Low (10m)</div><div class="form-stat-value">${Math.round(lowest)}</div></div>
                        <div class="form-stat-card"><div class="form-stat-label">Matches</div><div class="form-stat-value">${eloData?.matchCount || 0}</div></div>
                    </div>
                    
                    <div class="elo-chart-wrap" style="position:relative;padding:16px 12px 8px;background:var(--bg-card,#fff);border-radius:14px;border:1px solid rgba(0,0,0,0.08);width:100%;overflow:visible;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
                        ${buildDetailChart(eloData)}
                        <div class="elo-point-tooltip" data-elo-tooltip hidden></div>
                    </div>

                    <div class="elo-table-wrap">
                        <h4 style="margin-bottom:8px;font-size:1em;">Match Calculation History (Last 10)</h4>
                        <table class="elo-history-table" style="width:100%;font-size:0.9rem;border-collapse:collapse;">
                            <thead>
                                <tr style="border-bottom:2px solid #eee;text-align:left;color:#666;">
                                    <th style="padding:4px;">Opponent / Event</th>
                                    <th style="padding:4px;">Result</th>
                                    <th style="padding:4px;">Score</th>
                                    <th style="padding:4px;">Strength Ratio</th>
                                    <th style="padding:4px;">Match Quality</th>
                                    <th style="padding:4px;">Form Change</th>
                                </tr>

                            </thead>
                            <tbody>
                                ${historyRows}
                            </tbody>
                        </table>
                        <div style="margin-top:8px;font-size:0.8em;color:#777;">
                            <em>* Strength Ratio: Multiplicative factor based on ranking points gap. 
                            Match Quality: Quick assessment based on dominance (straight sets, game margins). 
                            Form Change: Adjustment multiplied by tournament importance.</em>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderFactorBreakdown(targetEl, match) {
        if (!targetEl || !match) return;
        const rankText = match.opponentRank ? ` (#${match.opponentRank})` : '';
        const delta = toNumber(match.delta, 0);
        const deltaText = `${delta >= 0 ? '+' : ''}${round2(delta)}`;
        const strengthRatio = round2(toNumber(match.strengthRatio, 1.0));
        const dominance = round2(toNumber(match.dominanceMultiplier, 1.0));
        const retirementNote = match.isRetirement ? 'Yes (halved)' : 'No';

        targetEl.innerHTML = `
            <div><strong>Result:</strong> ${match.result} ${match.score ? `(${match.score})` : ''}</div>
            <div><strong>Opponent:</strong> ${match.opponentName}${rankText}</div>
            <div><strong>Tournament:</strong> ${match.tournamentName} - ${match.category} (${match.round})</div>
            <div><strong>Strength Ratio:</strong> ${strengthRatio}x | <strong>Dominance:</strong> ${dominance}x</div>
            <div><strong>Retirement:</strong> ${retirementNote}</div>
            <div><strong>Form Change:</strong> ${deltaText} -> <strong>${round2(match.form)}</strong></div>
        `;
    }

    function ensureEloModalElement() {
        let modal = document.getElementById('eloDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'eloDetailModal';
            modal.className = 'modal-overlay';
            document.body.appendChild(modal);
        }
        return modal;
    }

    function openEloDetailModal(playerName, tour) {
        const safeTour = String(tour || '').toLowerCase() === 'wta' ? 'wta' : 'atp';
        const eloData = getPlayerElo(playerName, safeTour);
        if (!eloData) return;

        const modal = ensureEloModalElement();
        modal.innerHTML = createEloDetailModalHTML(playerName, eloData);
        modal.classList.add('active');

        const closeButton = modal.querySelector('[data-elo-close]');
        closeButton?.addEventListener('click', closeEloDetailModal);

        modal.onclick = (event) => {
            if (event.target === modal) {
                closeEloDetailModal();
            }
        };

        const chartWrap = modal.querySelector('.elo-chart-wrap');
        const tooltip = modal.querySelector('[data-elo-tooltip]');
        const svg = chartWrap?.querySelector('svg');
        const points = svg ? Array.from(svg.querySelectorAll('.elo-point')) : [];

        const hideTooltip = () => {
            if (!tooltip) return;
            tooltip.hidden = true;
            tooltip.innerHTML = '';
        };

        const moveTooltip = (event) => {
            if (!tooltip || !chartWrap) return;
            const wrapRect = chartWrap.getBoundingClientRect();
            const nextX = Math.min(Math.max(10, event.clientX - wrapRect.left + 12), Math.max(10, wrapRect.width - 230));
            const nextY = Math.max(10, event.clientY - wrapRect.top - 84);
            tooltip.style.left = `${round2(nextX)}px`;
            tooltip.style.top = `${round2(nextY)}px`;
        };

        points.forEach((point) => {
            point.addEventListener('mouseenter', (event) => {
                if (!tooltip) return;
                const opponent = point.getAttribute('data-opponent') || 'Unknown opponent';
                const eventName = point.getAttribute('data-event') || 'Event';
                const score = point.getAttribute('data-score') || '-';
                const result = point.getAttribute('data-result') || '-';
                const delta = point.getAttribute('data-delta') || '0';
                const form = point.getAttribute('data-form') || '-';

                tooltip.innerHTML = `
                    <div class="elo-tooltip-title">${opponent}</div>
                    <div class="elo-tooltip-meta">${eventName}</div>
                    <div class="elo-tooltip-row"><strong>Result:</strong> ${result} (${score})</div>
                    <div class="elo-tooltip-row"><strong>Change:</strong> ${delta}</div>
                    <div class="elo-tooltip-row"><strong>Form:</strong> ${form}</div>
                `;
                tooltip.hidden = false;
                moveTooltip(event);
            });

            point.addEventListener('mousemove', moveTooltip);
            point.addEventListener('mouseleave', hideTooltip);
        });

        chartWrap?.addEventListener('mouseleave', hideTooltip);

        // Deprecated: clicking points is no longer the primary way to see details, as the table shows them.
        // We can keep this if we want interactivity, but the new design creates a static table.
        // For now, we'll leave the event listeners but they might not target anything if points are not clicked.
        // Or we can just remove this block if we removed the popup HTML.
        // To be safe and clean, we remove the detailed popup logic since we have a table.
    }

    function closeEloDetailModal() {
        const modal = document.getElementById('eloDetailModal');
        if (!modal) return;
        modal.classList.remove('active');
    }

    function getPlayerElo(playerName, tour) {
        const safeTour = String(tour || '').toLowerCase() === 'wta' ? 'wta' : 'atp';
        const ratingsByTour = global.TennisApp?.AppState?.eloRatings?.[safeTour];
        if (!(ratingsByTour instanceof Map)) return null;

        const direct = ratingsByTour.get(playerName);
        if (direct) return direct;

        const target = normalizeName(playerName);
        if (!target) return null;

        for (const [name, data] of ratingsByTour.entries()) {
            if (normalizeName(name) === target) {
                return data;
            }
        }

        return null;
    }

    global.TennisApp = global.TennisApp || {};
    global.TennisApp.EloModule = {
        init,
        computeAllElo,
        createSparklineSVG,
        openEloDetailModal,
        closeEloDetailModal,
        getPlayerElo,
        normalizeMatches,
        buildPlayerLookup,
        resolveOpponentRank,
        seedInitialForm,
        loadFormCacheAsync,
        calculateRankFactor,
        calculateDominanceMultiplier,
        calculateFormChange,
        updateForm,
        adaptiveK,
        createEloDetailModalHTML,
        version: '2.0.0'
    };
})(window);
