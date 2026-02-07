/**
 * Tennis Live Dashboard - Live Scores Module
 * Handles rendering and updating of live and recent match scores
 */

const ScoresModule = {
    /**
     * Demo live matches data (used when API is unavailable)
     */
    demoLiveMatches: {
        atp: [
            {
                id: 'demo_atp_1',
                tour: 'ATP',
                tournament: 'Australian Open',
                tournament_category: 'grand_slam',
                location: 'Melbourne, Australia',
                round: 'SF',
                court: 'Rod Laver Arena',
                player1: { id: 1, name: 'Novak Djokovic', country: 'SRB', rank: 1 },
                player2: { id: 2, name: 'Carlos Alcaraz', country: 'ESP', rank: 2 },
                score: {
                    sets: [{ p1: 6, p2: 4 }, { p1: 4, p2: 6 }, { p1: 5, p2: 4 }],
                    current_game: { p1: '30', p2: '15' },
                    p1_sets: 1,
                    p2_sets: 1
                },
                status: 'live',
                serving: 1
            },
            {
                id: 'demo_atp_2',
                tour: 'ATP',
                tournament: 'Qatar Open',
                tournament_category: 'masters_1000',
                location: 'Doha, Qatar',
                round: 'SF',
                court: 'Margaret Court Arena',
                player1: { id: 3, name: 'Jannik Sinner', country: 'ITA', rank: 3 },
                player2: { id: 4, name: 'Daniil Medvedev', country: 'RUS', rank: 4 },
                score: {
                    sets: [{ p1: 7, p2: 5 }, { p1: 3, p2: 2 }],
                    current_game: { p1: '40', p2: '30' },
                    p1_sets: 1,
                    p2_sets: 0
                },
                status: 'live',
                serving: 2
            },
            {
                id: 'demo_atp_3',
                tour: 'ATP',
                tournament: 'Rotterdam Open',
                tournament_category: 'atp_500',
                location: 'Rotterdam, Netherlands',
                round: 'QF',
                court: 'Centre Court',
                player1: { id: 5, name: 'Andrey Rublev', country: 'RUS', rank: 5 },
                player2: { id: 6, name: 'Alexander Zverev', country: 'GER', rank: 6 },
                score: {
                    sets: [{ p1: 6, p2: 3 }, { p1: 4, p2: 5 }],
                    current_game: { p1: '15', p2: '40' },
                    p1_sets: 1,
                    p2_sets: 0
                },
                status: 'live',
                serving: 1
            }
        ],
        wta: [
            {
                id: 'demo_wta_1',
                tour: 'WTA',
                tournament: 'Australian Open',
                tournament_category: 'grand_slam',
                location: 'Melbourne, Australia',
                round: 'F',
                court: 'Rod Laver Arena',
                player1: { id: 101, name: 'Iga Swiatek', country: 'POL', rank: 1 },
                player2: { id: 102, name: 'Aryna Sabalenka', country: 'BLR', rank: 2 },
                score: {
                    sets: [{ p1: 4, p2: 6 }, { p1: 6, p2: 3 }, { p1: 3, p2: 2 }],
                    current_game: { p1: 'AD', p2: '40' },
                    p1_sets: 1,
                    p2_sets: 1
                },
                status: 'live',
                serving: 1
            },
            {
                id: 'demo_wta_2',
                tour: 'WTA',
                tournament: 'Australian Open',
                tournament_category: 'grand_slam',
                location: 'Dubai, UAE',
                round: 'R16',
                court: 'Centre Court',
                player1: { id: 103, name: 'Coco Gauff', country: 'USA', rank: 3 },
                player2: { id: 104, name: 'Elena Rybakina', country: 'KAZ', rank: 4 },
                score: {
                    sets: [{ p1: 2, p2: 3 }],
                    current_game: { p1: '0', p2: '30' },
                    p1_sets: 0,
                    p2_sets: 0
                },
                status: 'live',
                serving: 2
            }
        ]
    },

    /**
     * Demo recent matches data
     */
    demoRecentMatches: {
        atp: [
            {
                id: 'recent_atp_1',
                tour: 'ATP',
                tournament: 'Qatar Open',
                tournament_category: 'masters_1000',
                round: 'QF',
                player1: { id: 1, name: 'Novak Djokovic', country: 'SRB', rank: 1 },
                player2: { id: 7, name: 'Holger Rune', country: 'DEN', rank: 7 },
                winner: 1,
                final_score: { sets: [{ p1: 6, p2: 4 }, { p1: 6, p2: 2 }, { p1: 6, p2: 3 }] },
                status: 'finished'
            },
            {
                id: 'recent_atp_2',
                tour: 'ATP',
                tournament: 'Dubai Championships',
                tournament_category: 'masters_1000',
                round: 'QF',
                player1: { id: 2, name: 'Carlos Alcaraz', country: 'ESP', rank: 2 },
                player2: { id: 8, name: 'Stefanos Tsitsipas', country: 'GRE', rank: 8 },
                winner: 1,
                final_score: { sets: [{ p1: 7, p2: 6, tiebreak: { p1: 7, p2: 5 } }, { p1: 6, p2: 4 }, { p1: 6, p2: 2 }] },
                status: 'finished'
            },
            {
                id: 'recent_atp_3',
                tour: 'ATP',
                tournament: 'Rotterdam Open',
                tournament_category: 'atp_500',
                round: 'R16',
                player1: { id: 9, name: 'Hubert Hurkacz', country: 'POL', rank: 9 },
                player2: { id: 15, name: 'Felix Auger-Aliassime', country: 'CAN', rank: 15 },
                winner: 2,
                final_score: { sets: [{ p1: 4, p2: 6 }, { p1: 6, p2: 7, tiebreak: { p1: 5, p2: 7 } }] },
                status: 'finished'
            }
        ],
        wta: [
            {
                id: 'recent_wta_1',
                tour: 'WTA',
                tournament: 'Qatar Open',
                tournament_category: 'masters_1000',
                round: 'SF',
                player1: { id: 101, name: 'Iga Swiatek', country: 'POL', rank: 1 },
                player2: { id: 105, name: 'Jessica Pegula', country: 'USA', rank: 5 },
                winner: 1,
                final_score: { sets: [{ p1: 6, p2: 2 }, { p1: 6, p2: 3 }] },
                status: 'finished'
            },
            {
                id: 'recent_wta_2',
                tour: 'WTA',
                tournament: 'Australian Open',
                tournament_category: 'grand_slam',
                round: 'SF',
                player1: { id: 102, name: 'Aryna Sabalenka', country: 'BLR', rank: 2 },
                player2: { id: 103, name: 'Coco Gauff', country: 'USA', rank: 3 },
                winner: 1,
                final_score: { sets: [{ p1: 6, p2: 4 }, { p1: 7, p2: 5 }] },
                status: 'finished'
            }
        ]
    },

    /**
     * Demo upcoming matches data
     */
    demoUpcomingMatches: {
        atp: [
            {
                id: 'upcoming_atp_1',
                tour: 'ATP',
                tournament: 'Australian Open',
                tournament_category: 'grand_slam',
                round: 'SF',
                player1: { id: 1, name: 'Novak Djokovic', country: 'SRB', rank: 1 },
                player2: { id: 2, name: 'Carlos Alcaraz', country: 'ESP', rank: 2 },
                scheduled_time: '2026-02-02T14:00:00Z'
            },
            {
                id: 'upcoming_atp_2',
                tour: 'ATP',
                tournament: 'Australian Open',
                tournament_category: 'grand_slam',
                round: 'SF',
                player1: { id: 3, name: 'Jannik Sinner', country: 'ITA', rank: 3 },
                player2: { id: 4, name: 'Daniil Medvedev', country: 'RUS', rank: 4 },
                scheduled_time: '2026-02-02T10:00:00Z'
            },
            {
                id: 'upcoming_atp_3',
                tour: 'ATP',
                tournament: 'Rotterdam Open',
                tournament_category: 'atp_500',
                round: 'QF',
                player1: { id: 5, name: 'Andrey Rublev', country: 'RUS', rank: 5 },
                player2: { id: 6, name: 'Alexander Zverev', country: 'GER', rank: 6 },
                scheduled_time: '2026-02-03T15:30:00Z'
            },
            {
                id: 'upcoming_atp_4',
                tour: 'ATP',
                tournament: 'Rotterdam Open',
                tournament_category: 'atp_500',
                round: 'QF',
                player1: { id: 7, name: 'Holger Rune', country: 'DEN', rank: 7 },
                player2: { id: 8, name: 'Stefanos Tsitsipas', country: 'GRE', rank: 8 },
                scheduled_time: '2026-02-03T19:00:00Z'
            }
        ],
        wta: [
            {
                id: 'upcoming_wta_1',
                tour: 'WTA',
                tournament: 'Australian Open',
                tournament_category: 'grand_slam',
                round: 'F',
                player1: { id: 101, name: 'Iga Swiatek', country: 'POL', rank: 1 },
                player2: { id: 102, name: 'Aryna Sabalenka', country: 'BLR', rank: 2 },
                scheduled_time: '2026-02-02T08:30:00Z'
            },
            {
                id: 'upcoming_wta_2',
                tour: 'WTA',
                tournament: 'Abu Dhabi Open',
                tournament_category: 'atp_500',
                round: 'R16',
                player1: { id: 103, name: 'Coco Gauff', country: 'USA', rank: 3 },
                player2: { id: 104, name: 'Elena Rybakina', country: 'KAZ', rank: 4 },
                scheduled_time: '2026-02-02T16:00:00Z'
            },
            {
                id: 'upcoming_wta_3',
                tour: 'WTA',
                tournament: 'Dubai Championships',
                tournament_category: 'masters_1000',
                round: 'QF',
                player1: { id: 105, name: 'Jessica Pegula', country: 'USA', rank: 5 },
                player2: { id: 106, name: 'Karolina Muchova', country: 'CZE', rank: 6 },
                scheduled_time: '2026-02-03T14:00:00Z'
            },
            {
                id: 'upcoming_wta_4',
                tour: 'WTA',
                tournament: 'Dubai Championships',
                tournament_category: 'masters_1000',
                round: 'QF',
                player1: { id: 107, name: 'Marketa Vondrousova', country: 'CZE', rank: 7 },
                player2: { id: 108, name: 'Madison Keys', country: 'USA', rank: 8 },
                scheduled_time: '2026-02-03T18:30:00Z'
            }
        ]
    },

    formatRelativeMinutes(isoText) {
        if (!isoText) return 'Updated --';
        const then = new Date(isoText);
        if (Number.isNaN(then.getTime())) return 'Updated --';
        const diffMs = Date.now() - then.getTime();
        if (diffMs < 0 || diffMs < 45000) return 'Updated just now';
        const mins = Math.max(1, Math.floor(diffMs / 60000));
        return `Updated ${mins}m ago`;
    },

    updateRecentUpdatedAgo() {
        const { AppState, DOM } = window.TennisApp;
        if (!DOM.recentUpdatedAgo) return;
        DOM.recentUpdatedAgo.textContent = this.formatRelativeMinutes(AppState.recentMatchesUpdatedAt);
    },

    updateUpcomingUpdatedAgo() {
        const { AppState } = window.TennisApp;
        const label = document.getElementById('upcomingUpdatedAgo');
        if (!label) return;
        label.textContent = this.formatRelativeMinutes(AppState.upcomingMatchesUpdatedAt);
    },

    refreshSectionUpdatedAgo() {
        this.updateRecentUpdatedAgo();
        this.updateUpcomingUpdatedAgo();
    },

    /**
     * Render live scores
     */
    renderLiveScores() {
        const { AppState, DOM } = window.TennisApp;
        const tour = AppState.currentTour;
        const matches = AppState.liveScores[tour] || [];

        if (matches.length === 0) {
            DOM.liveScoresWrapper.innerHTML = `
                <div class="no-live-card">
                    <div class="no-live-icon">🎾</div>
                    <div class="no-live-title">No Live Matches Right Now</div>
                    <div class="no-live-subtitle">All courts are quiet at the moment. Check back soon for live scores.</div>
                </div>
            `;
            return;
        }

        const grouped = this.groupMatchesByTournament(matches);
        DOM.liveScoresWrapper.innerHTML = grouped
            .map(group => this.renderTournamentGroup(group, true))
            .join('');
    },

    /**
     * Render recent matches
     */
    renderRecentMatches() {
        const { AppState, DOM } = window.TennisApp;
        const tour = AppState.currentTour;
        
        // Get data (use demo if empty)
        let matches = AppState.recentMatches[tour];
        if (!matches || matches.length === 0) {
            matches = this.demoRecentMatches[tour] || [];
        }

        if (matches.length === 0) {
            DOM.recentMatchesWrapper.innerHTML = `
                <div class="no-matches-message">
                    <p>No recent matches</p>
                </div>
            `;
            this.updateRecentUpdatedAgo();
            return;
        }

        const grouped = this.groupMatchesByTournament(matches);
        DOM.recentMatchesWrapper.innerHTML = grouped
            .map(group => this.renderTournamentGroup(group, false))
            .join('');
        this.updateRecentUpdatedAgo();
    },

    /**
     * Group matches by tournament and sort by category priority
     */
    groupMatchesByTournament(matches) {
        const grouped = new Map();
        matches.forEach(match => {
            const tournament = this.sanitizeTournamentName(match.tournament || 'Tournament');
            const category = match.tournament_category || 'other';
            const key = `${tournament}__${category}`;
            if (!grouped.has(key)) {
                grouped.set(key, {
                    tournament,
                    category,
                    matches: []
                });
            }
            grouped.get(key).matches.push(match);
        });

        return Array.from(grouped.values()).sort((a, b) => {
            const aRank = this.getCategoryPriority(a.category);
            const bRank = this.getCategoryPriority(b.category);
            if (aRank !== bRank) return aRank - bRank;
            return a.tournament.localeCompare(b.tournament);
        });
    },

    sanitizeTournamentName(name) {
        if (!name) return 'Tournament';
        return String(name)
            .replace(/\s+(presented|powered)\s+by\s+.*$/i, '')
            // Remove trailing season year variants: " 2026", "(2026)", "- 2026", ", 2026"
            .replace(/\s*[\-,]?\s*\(\s*(?:19|20)\d{2}\s*\)\s*$/i, '')
            .replace(/\s*[\-,]?\s*(?:19|20)\d{2}\s*$/i, '')
            .trim();
    },

    getCategoryPriority(category) {
        const key = (category || '').toLowerCase();
        const priorities = {
            grand_slam: 0,
            masters_1000: 1,
            wta_1000: 1,
            atp_500: 2,
            wta_500: 2,
            atp_250: 3,
            wta_250: 3,
            atp_125: 4,
            wta_125: 4,
            finals: 5,
            other: 6
        };
        return priorities[key] ?? 6;
    },

    renderTournamentGroup(group, isLive, renderFn = null) {
        const { Utils } = window.TennisApp;
        const categoryClass = Utils.getCategoryClass(group.category);
        const categoryLabel = this.getCategoryLabel(group.category);
        const sampleMatch = Array.isArray(group.matches) && group.matches.length > 0 ? group.matches[0] : null;
        const surfaceClass = sampleMatch ? this.getSurfaceClass(sampleMatch) : '';
        const surfaceLabel = sampleMatch ? this.getSurfaceLabel(sampleMatch) : '';
        const cardRenderer = renderFn || ((match) => this.createMatchCard(match, isLive));

        return `
            <div class="tournament-group ${categoryClass}">
                <div class="tournament-group-header">
                    <div class="tournament-group-title">
                        <span class="tournament-group-name">${group.tournament}</span>
                        <span class="category-badge ${categoryClass}">${categoryLabel}</span>
                        ${surfaceLabel ? `<span class="match-surface-pill ${surfaceClass}">${surfaceLabel}</span>` : ''}
                    </div>
                </div>
                <div class="tournament-group-row">
                    ${group.matches.map(match => cardRenderer(match)).join('')}
                </div>
            </div>
        `;
    },

    /**
     * Expand round codes to full labels
     */
    getRoundLabel(round) {
        if (!round) return '';
        const raw = String(round).trim();
        const upper = raw.toUpperCase();
        const map = {
            F: 'Final',
            SF: 'Semi Final',
            QF: 'Quarter Final',
            R128: 'Round of 128',
            R64: 'Round of 64',
            R32: 'Round of 32',
            R16: 'Round of 16',
            RR: 'Round Robin'
        };
        if (map[upper]) return map[upper];
        if (upper.startsWith('R') && /^[0-9]+$/.test(upper.slice(1))) {
            return `Round of ${upper.slice(1)}`;
        }
        return raw;
    },

    getRoundCode(round) {
        if (!round) return '';
        const upper = String(round).trim().toUpperCase();
        if (upper === 'Q') return 'QF';
        if (upper === 'S') return 'SF';
        if (upper === 'F') return 'F';
        if (upper.startsWith('R') && /^[0-9]+$/.test(upper.slice(1))) return upper;
        if (upper === 'SF' || upper === 'QF' || upper === 'RR') return upper;
        return upper;
    },

    getPointsLevel(match) {
        const category = String(match?.tournament_category || '').toLowerCase();
        if (category.includes('grand_slam')) return 'grand_slam';
        if (category.includes('1000')) return '1000';
        if (category.includes('500')) return '500';
        if (category.includes('250')) return '250';
        if (category.includes('125')) return '125';
        return '';
    },

    getRoundPoints(match) {
        const roundCode = this.getRoundCode(match?.round);
        const pointsLevel = this.getPointsLevel(match);
        if (!roundCode || !pointsLevel) return null;

        const tour = String(match?.tour || '').toUpperCase();
        const atpTable = {
            W: { grand_slam: 2000, '1000': 1000, '500': 500, '250': 250, '125': 125 },
            F: { grand_slam: 1200, '1000': 600, '500': 300, '250': 150, '125': 75 },
            SF: { grand_slam: 720, '1000': 360, '500': 180, '250': 90, '125': 45 },
            QF: { grand_slam: 360, '1000': 180, '500': 90, '250': 45, '125': 25 },
            R16: { grand_slam: 180, '1000': 90, '500': 45, '250': 20, '125': 13 },
            R32: { grand_slam: 90, '1000': 45, '500': 20, '250': 10, '125': 7 },
            R64: { grand_slam: 45, '1000': 25 },
            R128: { grand_slam: 10 }
        };
        const wtaTable = {
            W: { grand_slam: 2000, '1000': 1000, '500': 500, '250': 250, '125': 160 },
            F: { grand_slam: 1200, '1000': 650, '500': 325, '250': 163, '125': 95 },
            SF: { grand_slam: 720, '1000': 390, '500': 195, '250': 98, '125': 57 },
            QF: { grand_slam: 360, '1000': 215, '500': 108, '250': 54, '125': 30 },
            R16: { grand_slam: 180, '1000': 120, '500': 60, '250': 30, '125': 18 },
            R32: { grand_slam: 90, '1000': 65, '500': 30, '250': 18, '125': 1 },
            R64: { grand_slam: 45, '1000': 35 },
            R128: { grand_slam: 10 }
        };

        const table = tour === 'WTA' ? wtaTable : atpTable;
        return table?.[roundCode]?.[pointsLevel] ?? null;
    },

    getRoundLabelWithPoints(match) {
        const label = this.getRoundLabel(match?.round);
        if (!label) return '';
        const pts = this.getRoundPoints(match);
        return pts !== null ? `${label} (${pts} pts)` : label;
    },

    /**
     * Render upcoming matches
     */
    renderUpcomingMatches() {
        const { AppState, Utils } = window.TennisApp;
        const tour = AppState.currentTour;
        
        // Get data (use demo if empty)
        let matches = AppState.upcomingMatches[tour];
        if (!matches || matches.length === 0) {
            matches = this.demoUpcomingMatches[tour] || [];
        }

        // Find or create upcoming matches section after live scores
        let upcomingSection = document.getElementById('upcomingMatchesSection');
        if (!upcomingSection) {
            // Insert after live scores section
            const liveScoresSection = document.querySelector('.live-scores-section');
            if (liveScoresSection) {
                const newSection = document.createElement('section');
                newSection.className = 'upcoming-matches-section';
                newSection.id = 'upcomingMatchesSection';
                liveScoresSection.insertAdjacentElement('afterend', newSection);
                upcomingSection = newSection;
            }
        }

        if (!upcomingSection) return;

        if (matches.length === 0) {
            upcomingSection.innerHTML = `
                <div class="section-header">
                    <div class="section-title-stack">
                        <h2><i class="fas fa-calendar"></i> Upcoming Matches</h2>
                        <span class="section-updated-ago" id="upcomingUpdatedAgo">Updated --</span>
                    </div>
                </div>
                <div class="no-matches-message">
                    <p>No upcoming matches in the next 2 days</p>
                </div>
            `;
            this.updateUpcomingUpdatedAgo();
            return;
        }

        const grouped = this.groupMatchesByTournament(matches);
        const upcomingHTML = `
            <div class="section-header">
                <div class="section-title-stack">
                    <h2><i class="fas fa-calendar"></i> Upcoming Matches (Next 2 Days)</h2>
                    <span class="section-updated-ago" id="upcomingUpdatedAgo">Updated --</span>
                </div>
            </div>
            <div class="upcoming-matches-container">
                ${grouped.map(group => this.renderTournamentGroup(group, false, (match) => this.createUpcomingMatchCard(match))).join('')}
            </div>
        `;

        upcomingSection.innerHTML = upcomingHTML;
        this.updateUpcomingUpdatedAgo();
        this.attachUpcomingInsights(matches);
    },

    attachUpcomingInsights(matches) {
        const cards = document.querySelectorAll('.upcoming-match-card');
        cards.forEach(card => {
            const matchId = card.dataset.matchId;
            const match = matches.find(m => m.id === matchId);
            if (!match) return;
            const edgeBar = card.querySelector('.edge-bar');
            if (!edgeBar) return;
            edgeBar.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEdgeInsights(match);
            });
        });
    },

    showUpcomingInsights(matchId) {
        const { AppState } = window.TennisApp;
        const tour = AppState.currentTour;
        const match = AppState.upcomingMatches[tour]?.find(m => m.id === matchId)
            || this.demoUpcomingMatches[tour]?.find(m => m.id === matchId);
        if (!match) return;

        const winEdge = this.calculateWinEdge(match);
        const p1Fav = winEdge.p1 >= winEdge.p2;
        const favorite = p1Fav ? match.player1 : match.player2;
        const underdog = p1Fav ? match.player2 : match.player1;
        const favPct = p1Fav ? winEdge.p1 : winEdge.p2;
        const dogPct = 100 - favPct;
        const categoryLabel = this.getCategoryLabel(match.tournament_category);
        const categoryClass = window.TennisApp.Utils.getCategoryClass(match.tournament_category);

        let modal = document.getElementById('upcomingInsightsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'upcomingInsightsModal';
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content edge-insights-modal">
                    <div class="modal-header">
                        <h3>Match Preview</h3>
                        <button class="close-modal" id="upcomingInsightsClose">&times;</button>
                    </div>
                    <div class="modal-body" id="upcomingInsightsContent"></div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'upcomingInsightsModal') {
                    modal.classList.remove('active');
                }
            });
            modal.querySelector('#upcomingInsightsClose').addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        const content = document.getElementById('upcomingInsightsContent');
        content.innerHTML = `
            <div class="match-stats-title">
                <div class="match-stats-tournament">
                    ${match.tournament}
                    ${categoryLabel ? `<span class="category-badge ${categoryClass}">${categoryLabel}</span>` : ''}
                    ${match.round ? `<span class="match-stats-round-tag">${match.round}</span>` : ''}
                </div>
            </div>
            <div class="upcoming-preview-hero">
                <div class="upcoming-preview-scoreline">
                    <span class="pct left">${winEdge.p1}%</span>
                    <span class="dash">-</span>
                    <span class="pct right">${winEdge.p2}%</span>
                </div>
                <div class="edge-bar">
                    <span class="edge-pct left">${winEdge.p1}%</span>
                    <div class="edge-track">
                        <div class="edge-fill left" style="width:${winEdge.p1}%"></div>
                        <div class="edge-fill right" style="width:${winEdge.p2}%"></div>
                    </div>
                    <span class="edge-pct right">${winEdge.p2}%</span>
                </div>
                <div class="edge-names">
                    <span class="edge-name left">${window.TennisApp.Utils.formatPlayerName(match.player1.name)}</span>
                    <span class="edge-name right">${window.TennisApp.Utils.formatPlayerName(match.player2.name)}</span>
                </div>
            </div>
            <p><strong>Prediction:</strong> ${favorite.name} is favored (${favPct}%) over ${underdog.name} (${dogPct}%).</p>
            <ul class="edge-insights-list">
                <li>Current form: ${winEdge.formNote}</li>
                <li>H2H snapshot: ${winEdge.h2hText}</li>
                <li>Ranking edge: #${match.player1.rank} vs #${match.player2.rank}</li>
                <li>Momentum note: ${winEdge.reason}</li>
            </ul>
        `;

        modal.classList.add('active');
    },

    showEdgeInsights(match) {
        const winEdge = this.calculateWinEdge(match);
        let modal = document.getElementById('edgeInsightsModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edgeInsightsModal';
            modal.className = 'modal-overlay active';
            modal.innerHTML = `
                <div class="modal-content edge-insights-modal">
                    <div class="modal-header">
                        <h3>Win Edge Insights</h3>
                        <button class="close-modal" id="edgeInsightsClose">&times;</button>
                    </div>
                    <div class="modal-body" id="edgeInsightsContent"></div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'edgeInsightsModal') {
                    modal.classList.remove('active');
                }
            });
            modal.querySelector('#edgeInsightsClose').addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        const content = document.getElementById('edgeInsightsContent');
        content.innerHTML = `
            <div class="edge-insights-hero">
                <div class="edge-player">
                    <img src="${window.TennisApp.Utils.getPlayerImage(match.player1)}" alt="${match.player1.name}">
                    <div>${match.player1.name}</div>
                    <div class="edge-pct">${winEdge.p1}%</div>
                </div>
                <div class="edge-vs">VS</div>
                <div class="edge-player">
                    <img src="${window.TennisApp.Utils.getPlayerImage(match.player2)}" alt="${match.player2.name}">
                    <div>${match.player2.name}</div>
                    <div class="edge-pct">${winEdge.p2}%</div>
                </div>
            </div>
            <ul class="edge-insights-list">
                <li>${winEdge.reason}</li>
                <li>H2H record: ${winEdge.h2hText}</li>
                <li>Recent form: ${winEdge.formNote}</li>
                <li>Rank edge: #${match.player1.rank} vs #${match.player2.rank}</li>
                <li>Surface trend: ${match.tournament_category?.replace('_',' ')} (demo)</li>
            </ul>
        `;

        modal.classList.add('active');
    },

    /**
     * Create an upcoming match card (simplified - only player names)
     */
    createUpcomingMatchCard(match) {
        const { Utils } = window.TennisApp;
        const categoryClass = Utils.getCategoryClass(match.tournament_category);
        const categoryLabel = this.getCategoryLabel(match.tournament_category);
        const surfaceClass = this.getSurfaceClass(match);
        const tournamentName = this.sanitizeTournamentName(match.tournament);
        const roundLabel = this.getRoundLabelWithPoints(match);
        const courtLabel = match.court || match.court_name || match.stadium || 'Stadium TBA';
        const scheduledTime = new Date(match.scheduled_time);
        const timeStr = scheduledTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const dateStr = scheduledTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const winEdge = this.calculateWinEdge(match);

        return `
            <div class="upcoming-match-card ${categoryClass} ${surfaceClass}" data-match-id="${match.id}">
                <div class="match-header">
                    <div class="tournament-info">
                        <div class="tournament-name compact-inline">
                            <span class="tournament-title-text">${tournamentName}</span>
                            <span class="category-badge ${categoryClass}">${categoryLabel}</span>
                        </div>
                        <div class="match-round-row">
                            ${roundLabel ? `<span class="match-stage-pill">${roundLabel}</span>` : ''}
                            ${courtLabel ? `<span class="match-court">${courtLabel}</span>` : ''}
                        </div>
                    </div>
                    <div class="scheduled-pill-group">
                        <span class="scheduled-pill">${dateStr}</span>
                        <span class="scheduled-connector"></span>
                        <span class="scheduled-pill">${timeStr}</span>
                    </div>
                </div>
                <div class="match-players">
                    <div class="player-row">
                        <img class="player-img" src="${Utils.getPlayerImage(match.player1)}" alt="${match.player1.name}">
                        <div class="player-info">
                            <div class="player-name">
                                ${match.player1.rank ? `<span class="player-rank-badge">[${match.player1.rank}]</span>` : ''}
                                <span class="country-flag">${Utils.getFlag(match.player1.country)}</span>
                                ${Utils.formatPlayerName(match.player1.name)}
                            </div>
                        </div>
                    </div>
                    <div class="player-row">
                        <img class="player-img" src="${Utils.getPlayerImage(match.player2)}" alt="${match.player2.name}">
                        <div class="player-info">
                            <div class="player-name">
                                ${match.player2.rank ? `<span class="player-rank-badge">[${match.player2.rank}]</span>` : ''}
                                <span class="country-flag">${Utils.getFlag(match.player2.country)}</span>
                                ${Utils.formatPlayerName(match.player2.name)}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="edge-row" data-edge-id="${match.id}">
                    <div class="h2h-chip" aria-label="Head to head">
                        <span class="h2h-label">H2H</span>
                        <span class="h2h-value">${winEdge.h2hText}</span>
                    </div>
                    <div class="edge-block">
                        <div class="edge-bar" data-edge-id="${match.id}">
                            <span class="edge-pct left">${winEdge.p1}%</span>
                            <div class="edge-track">
                                <div class="edge-fill left" style="width:${winEdge.p1}%"></div>
                                <div class="edge-fill right" style="width:${winEdge.p2}%"></div>
                            </div>
                            <span class="edge-pct right">${winEdge.p2}%</span>
                        </div>
                        <div class="edge-names">
                            <span class="edge-name left">${Utils.formatPlayerName(match.player1.name)}</span>
                            <span class="edge-name right">${Utils.formatPlayerName(match.player2.name)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Calculate a lightweight win edge metric using rank and recent form (demo)
     */
    calculateWinEdge(match) {
        const p1 = match?.player1 || {};
        const p2 = match?.player2 || {};
        // Lower rank number is stronger; add tiny randomness
        const baseP1 = (p2.rank || 50) / (p1.rank || 50);
        const noise = 0.05 * (Math.random() - 0.5);
        let p1Prob = Math.min(0.85, Math.max(0.15, baseP1 + noise));
        // Convert to percentage and balance
        const p1Pct = Math.round((p1Prob / (p1Prob + 1)) * 100);
        const p2Pct = 100 - p1Pct;

        const reason = p1Pct > 55 ? 'Better recent form & rank' : p2Pct > 55 ? 'Edge on momentum' : 'Too close to call';
        const h2hText = (typeof match?.h2h_text === 'string' && match.h2h_text.trim()) ? match.h2h_text : 'N/A';
        const formNote = p1Pct > 55 ? 'Won 4 of last 5' : p2Pct > 55 ? 'On 6-match streak' : 'Evenly matched';

        return {
            p1: p1Pct,
            p2: p2Pct,
            reason,
            h2hText,
            formNote
        };
    },

    /**
     * Create a match card HTML
     */
    createMatchCard(match, isLive) {
        const { Utils } = window.TennisApp;
        const categoryClass = Utils.getCategoryClass(match.tournament_category);
        const categoryLabel = this.getCategoryLabel(match.tournament_category);
        const surfaceClass = this.getSurfaceClass(match);
        const matchKey = this.getMatchKey(match);
        const tournamentName = this.sanitizeTournamentName(match.tournament);
        const roundLabel = this.getRoundLabelWithPoints(match);
        const courtLabel = match.court || match.court_name || '';
        const finishedDuration = !isLive ? (match.match_duration || match.duration || '') : '';
        
        const player1Score = this.formatPlayerScore(match, 1, isLive);
        const player2Score = this.formatPlayerScore(match, 2, isLive);
        const resolvedWinner = !isLive ? this.getWinnerFromScore(match, match.final_score || match.score) : null;
        
        const p1IsWinner = !isLive && resolvedWinner === 1;
        const p2IsWinner = !isLive && resolvedWinner === 2;
        const p1Serving = isLive && match.serving === 1;
        const p2Serving = isLive && match.serving === 2;
        const p1RankBadge = match.player1.rank ? `<span class="player-rank-badge">[${match.player1.rank}]</span>` : '';
        const p2RankBadge = match.player2.rank ? `<span class="player-rank-badge">[${match.player2.rank}]</span>` : '';

        return `
            <div class="match-card ${categoryClass} ${surfaceClass}" data-match-id="${match.id}" data-match-key="${matchKey}">
                <div class="match-header">
                    <div class="tournament-info">
                        <div class="tournament-name">
                            ${tournamentName}
                            <span class="category-badge ${categoryClass}">${categoryLabel}</span>
                        </div>
                        <div class="match-round-row">
                            ${roundLabel ? `<span class="match-stage-pill">${roundLabel}</span>` : ''}
                            ${courtLabel ? `<span class="match-court">${courtLabel}</span>` : ''}
                        </div>
                    </div>
                    ${isLive ? `
                        <div class="live-badge">
                            <span class="live-label"><span class="live-dot"></span>LIVE</span>
                            ${match.match_time ? `<span class="live-time">${match.match_time}</span>` : ''}
                        </div>
                    ` : `
                        <div class="finished-stack">
                            <div class="finished-badge">Completed</div>
                            ${finishedDuration ? `<div class="finished-duration-pill">${finishedDuration}</div>` : ''}
                        </div>
                    `}
                </div>
                <div class="match-players">
                    <div class="player-row ${p1IsWinner ? 'winner' : ''} ${p1Serving ? 'serving' : ''}">
                        <img class="player-img" src="${Utils.getPlayerImage(match.player1)}" alt="${match.player1.name}">
                        <div class="player-info">
                            <div class="player-name">
                                ${p1RankBadge}
                                <span class="country-flag">${Utils.getFlag(match.player1.country)}</span>
                                ${Utils.formatPlayerName(match.player1.name)}
                                ${p1Serving ? '<span class="serve-ball" title="Serving"></span>' : ''}
                            </div>
                        </div>
                        <div class="player-score">${player1Score}</div>
                    </div>
                    <div class="player-row ${p2IsWinner ? 'winner' : ''} ${p2Serving ? 'serving' : ''}">
                        <img class="player-img" src="${Utils.getPlayerImage(match.player2)}" alt="${match.player2.name}">
                        <div class="player-info">
                            <div class="player-name">
                                ${p2RankBadge}
                                <span class="country-flag">${Utils.getFlag(match.player2.country)}</span>
                                ${Utils.formatPlayerName(match.player2.name)}
                                ${p2Serving ? '<span class="serve-ball" title="Serving"></span>' : ''}
                            </div>
                        </div>
                        <div class="player-score">${player2Score}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Get tournament category label
     */
    getCategoryLabel(category) {
        const labels = {
            'grand_slam': 'Grand Slam',
            'masters_1000': '1000',
            'atp_500': '500',
            'atp_250': '250',
            'atp_125': '125',
            'finals': 'Finals',
            'other': 'Other'
        };
        return labels[category] || category;
    },

    getSurfaceClass(match) {
        const surface = (match.surface || match.tournament_surface || '').toLowerCase();
        const name = (match.tournament || '').toLowerCase();
        if (surface.includes('clay') || name.includes('roland') || name.includes('monte-carlo') || name.includes('madrid') || name.includes('rome')) {
            return 'surface-clay';
        }
        if (surface.includes('grass') || name.includes('wimbledon') || name.includes('halle') || name.includes('queen')) {
            return 'surface-grass';
        }
        if (surface.includes('indoor')) {
            return 'surface-indoor';
        }
        return 'surface-hard';
    },

    getSurfaceLabel(match) {
        const surfaceClass = this.getSurfaceClass(match);
        const labels = {
            'surface-hard': 'Hard',
            'surface-clay': 'Clay',
            'surface-grass': 'Grass',
            'surface-indoor': 'Indoor'
        };
        return labels[surfaceClass] || 'Hard';
    },

    /**
     * Best-of format based on tour/category
     */
    getBestOfForMatch(match) {
        const category = (match?.tournament_category || '').toLowerCase();
        const tour = (match?.tour || '').toLowerCase();
        if (category === 'grand_slam' && tour === 'atp') {
            return 5;
        }
        return 3;
    },

    /**
     * Determine winner from score (if possible)
     */
    getWinnerFromScore(match, score) {
        if (!score || !Array.isArray(score.sets)) {
            return match?.winner ?? null;
        }
        const bestOf = this.getBestOfForMatch(match);
        const winSets = Math.floor(bestOf / 2) + 1;
        let p1Sets = 0;
        let p2Sets = 0;

        for (const set of score.sets) {
            if (set.p1 > set.p2) {
                p1Sets += 1;
            } else if (set.p2 > set.p1) {
                p2Sets += 1;
            }
            if (p1Sets >= winSets || p2Sets >= winSets) {
                break;
            }
        }

        if (p1Sets >= winSets && p1Sets > p2Sets) return 1;
        if (p2Sets >= winSets && p2Sets > p1Sets) return 2;
        return match?.winner ?? null;
    },

    /**
     * Format player score display
     */
    formatPlayerScore(match, playerNum, isLive) {
        const score = isLive ? match.score : (match.final_score || match.score);
        if (!score || !score.sets) return '';

        let html = '';
        
        // Set scores
        score.sets.forEach((set, idx) => {
            const games = playerNum === 1 ? set.p1 : set.p2;
            const opponentGames = playerNum === 1 ? set.p2 : set.p1;
            const isCurrentSet = isLive && idx === score.sets.length - 1;
            
            // Check for tiebreak (7-6 or 6-7)
            const isTiebreak = (games === 7 && opponentGames === 6) || (games === 6 && opponentGames === 7);
            
            const isSetWinner = games > opponentGames;

            if (isTiebreak && set.tiebreak) {
                const tiebreakScore = playerNum === 1 ? set.tiebreak.p1 : set.tiebreak.p2;
                html += `<span class="set-score ${isSetWinner ? 'set-win' : ''} ${isCurrentSet ? 'current' : ''}">${games}<sup class="tb">(${tiebreakScore})</sup></span>`;
            } else if (isTiebreak) {
                const fallbackTb = games === 7 ? 7 : 6;
                html += `<span class="set-score ${isSetWinner ? 'set-win' : ''} ${isCurrentSet ? 'current' : ''}">${games}<sup class="tb">(${fallbackTb})</sup></span>`;
            } else {
                html += `<span class="set-score ${isSetWinner ? 'set-win' : ''} ${isCurrentSet ? 'current' : ''}">${games}</span>`;
            }
        });

        // Current game score (only for live matches)
        if (isLive && score.current_game) {
            const gameScore = playerNum === 1 ? score.current_game.p1 : score.current_game.p2;
            html += `<span class="game-score">${gameScore}</span>`;
        }

        return html;
    },

    /**
     * Update a single match score (for real-time updates)
     */
    updateMatchScore(matchId, newScore) {
        const matchCard = document.querySelector(`[data-match-id="${matchId}"]`);
        if (!matchCard) return;

        // Update player scores
        const playerRows = matchCard.querySelectorAll('.player-row');
        if (playerRows.length >= 2) {
            playerRows[0].querySelector('.player-score').innerHTML = this.formatPlayerScore({ score: newScore }, 1, true);
            playerRows[1].querySelector('.player-score').innerHTML = this.formatPlayerScore({ score: newScore }, 2, true);
        }

        // Update serving indicator
        if (newScore.serving) {
            playerRows.forEach((row, idx) => {
                row.classList.toggle('serving', newScore.serving === idx + 1);
            });
        }
    },

    /**
     * Show match statistics modal
     */
    showMatchStats(matchId, matchOverride = null, context = {}) {
        const { AppState, Utils } = window.TennisApp;
        const tour = AppState.currentTour;
        
        // Find match in live or recent matches, unless an override is provided
        let match = matchOverride;
        if (!match) {
            const live = AppState.liveScores[tour] || [];
            const recent = AppState.recentMatches[tour] || [];
            const upcoming = AppState.upcomingMatches[tour] || [];
            const demoLive = this.demoLiveMatches[tour] || [];
            const demoRecent = this.demoRecentMatches[tour] || [];
            const demoUpcoming = this.demoUpcomingMatches[tour] || [];
            const allMatches = [...live, ...recent, ...upcoming, ...demoLive, ...demoRecent, ...demoUpcoming];
            const source = String(context?.source || '').trim().toLowerCase();
            const sourceMap = {
                live: [...live, ...demoLive],
                recent: [...recent, ...demoRecent],
                upcoming: [...upcoming, ...demoUpcoming],
            };

            const key = String(context?.matchKey || '').trim();
            if (key) {
                if (sourceMap[source]) {
                    match = sourceMap[source].find((m) => this.getMatchKey(m) === key);
                }
                if (!match) {
                    match = allMatches.find((m) => this.getMatchKey(m) === key);
                }
            }

            if (!match) {
                const sourceList = sourceMap[source] || [];
                match = sourceList.find((m) => String(m.id) === String(matchId))
                    || live.find((m) => String(m.id) === String(matchId))
                    || recent.find((m) => String(m.id) === String(matchId))
                    || upcoming.find((m) => String(m.id) === String(matchId))
                    || demoLive.find((m) => String(m.id) === String(matchId))
                    || demoRecent.find((m) => String(m.id) === String(matchId))
                    || demoUpcoming.find((m) => String(m.id) === String(matchId));
            }
        }
        
        if (!match) return;
        
        // Generate match statistics (demo data for metrics only)
        const stats = this.generateMatchStats(match);
        
        const modal = document.getElementById('matchStatsModal');
        const content = document.getElementById('matchStatsContent');
        
        const isLive = match.status === 'live';
        const score = isLive ? match.score : (match.final_score || match.score);
        stats.duration = this.resolveMatchTimeLabel(match, isLive);
        const resolvedWinner = !isLive ? this.getWinnerFromScore(match, score) : null;
        const tournamentName = context.tournament || match.tournament || 'Match Statistics';
        const roundName = match.round || context.round || '';
        const categoryLabel = this.getCategoryLabel(match.tournament_category);
        const categoryClass = window.TennisApp.Utils.getCategoryClass(match.tournament_category);
        const setLines = this.formatSetLines(score);
        const player1ModalId = this.resolvePlayerModalId(match.player1);
        const player2ModalId = this.resolvePlayerModalId(match.player2);
        const radarP1Label = Utils?.formatPlayerName
            ? Utils.formatPlayerName(match.player1?.name || 'Player 1')
            : (match.player1?.name || 'Player 1');
        const radarP2Label = Utils?.formatPlayerName
            ? Utils.formatPlayerName(match.player2?.name || 'Player 2')
            : (match.player2?.name || 'Player 2');
        
        content.innerHTML = `
            <div class="match-stats-title">
                <div class="match-stats-tournament">
                    ${tournamentName}
                    ${categoryLabel ? `<span class="category-badge ${categoryClass}">${categoryLabel}</span>` : ''}
                    ${roundName ? `<span class="match-stats-round-tag">${roundName}</span>` : ''}
                </div>
            </div>
            <div class="match-stats-hero">
                <div class="match-stats-player-card ${resolvedWinner === 1 ? 'winner' : ''} ${player1ModalId ? 'clickable' : ''}" ${player1ModalId ? `data-player-id="${player1ModalId}" role="button" tabindex="0" title="Open player details"` : ''}>
                    <img class="player-hero-img" src="${Utils.getPlayerImage(match.player1)}" alt="${match.player1.name}">
                    <div class="player-hero-name">${match.player1.name}</div>
                    <div class="player-hero-meta">${Utils.getFlag(match.player1.country)} ${match.player1.country} • Rank ${match.player1.rank || '-'}</div>
                </div>
                <div class="match-stats-scoreboard">
                    <div class="set-lines">
                        ${setLines}
                    </div>
                    ${stats.duration ? `<div class="duration">${stats.duration}</div>` : ''}
                </div>
                <div class="match-stats-player-card ${resolvedWinner === 2 ? 'winner' : ''} ${player2ModalId ? 'clickable' : ''}" ${player2ModalId ? `data-player-id="${player2ModalId}" role="button" tabindex="0" title="Open player details"` : ''}>
                    <img class="player-hero-img" src="${Utils.getPlayerImage(match.player2)}" alt="${match.player2.name}">
                    <div class="player-hero-name">${match.player2.name}</div>
                    <div class="player-hero-meta">${Utils.getFlag(match.player2.country)} ${match.player2.country} • Rank ${match.player2.rank || '-'}</div>
                </div>
            </div>
            
            <div class="match-stats-section">
                <h4>Serve</h4>
                <div class="stats-grid">
                    ${this.createStatRow('Aces', stats.aces.p1, stats.aces.p2, stats.aces.p1, stats.aces.p2, 'higher')}
                    ${this.createStatRow('Double Faults', stats.doubleFaults.p1, stats.doubleFaults.p2, stats.doubleFaults.p1, stats.doubleFaults.p2, 'lower')}
                    ${this.createStatRow('1st Serve %', stats.firstServe.p1 + '%', stats.firstServe.p2 + '%', stats.firstServe.p1, stats.firstServe.p2, 'higher')}
                    ${this.createStatRow('1st Serve Points Won', stats.firstServeWon.p1 + '%', stats.firstServeWon.p2 + '%', stats.firstServeWon.p1, stats.firstServeWon.p2, 'higher')}
                    ${this.createStatRow('2nd Serve Points Won', stats.secondServeWon.p1 + '%', stats.secondServeWon.p2 + '%', stats.secondServeWon.p1, stats.secondServeWon.p2, 'higher')}
                </div>
            </div>

            <div class="match-stats-section">
                <h4>Return & Pressure</h4>
                <div class="stats-grid">
                    ${this.createStatRow('Break Points Converted', `${stats.breakPointsWon.p1}/${stats.breakPointsTotal.p1} (${stats.breakPointsRate.p1}%)`, `${stats.breakPointsWon.p2}/${stats.breakPointsTotal.p2} (${stats.breakPointsRate.p2}%)`, stats.breakPointsRate.p1, stats.breakPointsRate.p2, 'higher')}
                    ${this.createStatRow('Winners', stats.winners.p1, stats.winners.p2, stats.winners.p1, stats.winners.p2, 'higher')}
                    ${this.createStatRow('Unforced Errors', stats.unforcedErrors.p1, stats.unforcedErrors.p2, stats.unforcedErrors.p1, stats.unforcedErrors.p2, 'lower')}
                    ${this.createStatRow('Total Points Won', stats.totalPoints.p1, stats.totalPoints.p2, stats.totalPoints.p1, stats.totalPoints.p2, 'higher')}
                </div>
            </div>

            <div class="match-stats-section match-radar-section">
                <h4>Visual Comparison</h4>
                <div class="match-radar-grid">
                    <div class="match-radar-card">
                        <div class="match-radar-head">
                            <div class="match-radar-heading">Serve Radar</div>
                            <div class="match-radar-legend">
                                <span class="match-radar-legend-item p1"><span class="swatch"></span>${radarP1Label}</span>
                                <span class="match-radar-legend-item p2"><span class="swatch"></span>${radarP2Label}</span>
                            </div>
                        </div>
                        <div id="matchServeRadar" class="match-radar-canvas">
                            <div class="match-radar-fallback">Loading radar...</div>
                        </div>
                    </div>
                    <div class="match-radar-card">
                        <div class="match-radar-head">
                            <div class="match-radar-heading">Return Radar</div>
                            <div class="match-radar-legend">
                                <span class="match-radar-legend-item p1"><span class="swatch"></span>${radarP1Label}</span>
                                <span class="match-radar-legend-item p2"><span class="swatch"></span>${radarP2Label}</span>
                            </div>
                        </div>
                        <div id="matchReturnRadar" class="match-radar-canvas">
                            <div class="match-radar-fallback">Loading radar...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        content.querySelectorAll('.match-stats-player-card.clickable').forEach((card) => {
            const openPlayer = () => {
                const playerId = card.dataset.playerId;
                const playerModule = window.TennisApp?.PlayerModule || window.PlayerModule;
                if (playerId && playerModule?.showPlayerStats) {
                    playerModule.showPlayerStats(playerId);
                }
            };
            card.addEventListener('click', openPlayer);
            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openPlayer();
                }
            });
        });
        
        modal.classList.add('active');
        this.renderMatchStatsRadars(match, stats);
    },

    /**
     * Create a statistics row
     */
    createStatRow(label, val1, val2, num1 = null, num2 = null, better = 'higher') {
        // If num1 and num2 are provided, show bar graph
        if (num1 !== null && num2 !== null) {
            const total = num1 + num2;
            const percent1 = total > 0 ? (num1 / total * 100).toFixed(1) : 50;
            const percent2 = total > 0 ? (num2 / total * 100).toFixed(1) : 50;
            const p1Wins = better === 'lower' ? num1 < num2 : num1 > num2;
            const p2Wins = better === 'lower' ? num2 < num1 : num2 > num1;
            
            return `
                <div class="stat-row">
                    <div class="stat-value left ${p1Wins ? 'winner' : ''}">${val1}</div>
                    <div class="stat-label">${label}</div>
                    <div class="stat-value right ${p2Wins ? 'winner' : ''}">${val2}</div>
                    <div class="stat-bar dual">
                        <div class="stat-bar-track">
                            <div class="stat-bar-left" style="width: ${percent1}%"></div>
                            <div class="stat-bar-right" style="width: ${percent2}%"></div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="stat-row">
                    <div class="stat-value left">${val1}</div>
                    <div class="stat-label">${label}</div>
                    <div class="stat-value right">${val2}</div>
                </div>
            `;
        }
    },

    resolvePlayerModalId(player) {
        const directId = player?.id
            ?? player?.player_id
            ?? player?.playerId
            ?? player?.profile_id
            ?? player?.profileId;
        if (directId !== null && directId !== undefined && directId !== '') {
            return String(directId);
        }
        const { AppState } = window.TennisApp || {};
        const list = AppState?.rankings?.[AppState?.currentTour] || [];
        if (!Array.isArray(list) || !player?.name) return '';
        const normalize = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const targetName = normalize(player.name);
        const targetCountry = normalize(player.country);
        const exact = list.find((row) => normalize(row.name) === targetName && (!targetCountry || normalize(row.country) === targetCountry));
        if (exact?.id !== undefined && exact?.id !== null) return String(exact.id);
        const nameOnly = list.find((row) => normalize(row.name) === targetName);
        if (nameOnly?.id !== undefined && nameOnly?.id !== null) return String(nameOnly.id);
        return '';
    },

    getMatchKey(match) {
        const normalize = (value) => String(value ?? '').trim().toLowerCase();
        return [
            normalize(match?.id),
            normalize(match?.status),
            normalize(this.sanitizeTournamentName(match?.tournament || '')),
            normalize(match?.round),
            normalize(match?.player1?.name),
            normalize(match?.player2?.name),
            normalize(match?.player1?.rank),
            normalize(match?.player2?.rank),
            normalize(match?.scheduled_time || match?.match_time || '')
        ].join('|');
    },

    async ensurePlotly() {
        if (window.Plotly) {
            return window.Plotly;
        }
        if (this.plotlyLoadPromise) {
            return this.plotlyLoadPromise;
        }
        this.plotlyLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.plot.ly/plotly-2.35.2.min.js';
            script.async = true;
            script.onload = () => resolve(window.Plotly);
            script.onerror = () => reject(new Error('Failed to load Plotly'));
            document.head.appendChild(script);
        });
        return this.plotlyLoadPromise;
    },

    async renderMatchStatsRadars(match, stats) {
        const { Utils } = window.TennisApp || {};
        const p1NameRaw = match.player1?.name || 'Player 1';
        const p2NameRaw = match.player2?.name || 'Player 2';
        const p1Label = Utils?.formatPlayerName ? Utils.formatPlayerName(p1NameRaw) : p1NameRaw;
        const p2Label = Utils?.formatPlayerName ? Utils.formatPlayerName(p2NameRaw) : p2NameRaw;

        const serveMetrics = [
            { label: 'Aces', p1: stats.aces.p1, p2: stats.aces.p2, better: 'higher', suffix: '' },
            { label: 'Double Faults', p1: stats.doubleFaults.p1, p2: stats.doubleFaults.p2, better: 'lower', suffix: '' },
            { label: '1st Serve %', p1: stats.firstServe.p1, p2: stats.firstServe.p2, better: 'higher', suffix: '%' },
            { label: '1st Serve Pts Won', p1: stats.firstServeWon.p1, p2: stats.firstServeWon.p2, better: 'higher', suffix: '%' },
            { label: '2nd Serve Pts Won', p1: stats.secondServeWon.p1, p2: stats.secondServeWon.p2, better: 'higher', suffix: '%' }
        ];
        const returnMetrics = [
            { label: 'Break Pts Conv %', p1: stats.breakPointsRate.p1, p2: stats.breakPointsRate.p2, better: 'higher', suffix: '%' },
            { label: 'Break Pts Won', p1: stats.breakPointsWon.p1, p2: stats.breakPointsWon.p2, better: 'higher', suffix: '' },
            { label: 'Winners', p1: stats.winners.p1, p2: stats.winners.p2, better: 'higher', suffix: '' },
            { label: 'Unforced Errors', p1: stats.unforcedErrors.p1, p2: stats.unforcedErrors.p2, better: 'lower', suffix: '' },
            { label: 'Total Points', p1: stats.totalPoints.p1, p2: stats.totalPoints.p2, better: 'higher', suffix: '' }
        ];

        try {
            const plotly = await this.ensurePlotly();
            this.renderMatchRadarChart(plotly, 'matchServeRadar', serveMetrics, p1Label, p2Label);
            this.renderMatchRadarChart(plotly, 'matchReturnRadar', returnMetrics, p1Label, p2Label);
        } catch (error) {
            console.error('Match radar rendering failed:', error);
            ['matchServeRadar', 'matchReturnRadar'].forEach((id) => {
                const container = document.getElementById(id);
                if (container) {
                    container.innerHTML = '<div class="match-radar-fallback">Radar unavailable</div>';
                }
            });
        }
    },

    renderMatchRadarChart(plotly, containerId, metrics, player1Name, player2Name) {
        const container = document.getElementById(containerId);
        if (!container || !Array.isArray(metrics) || metrics.length === 0) {
            return;
        }
        container.innerHTML = '';

        const normalizePair = (aRaw, bRaw, better) => {
            const a = Number(aRaw);
            const b = Number(bRaw);
            if (!Number.isFinite(a) || !Number.isFinite(b)) return [50, 50];
            if (better === 'lower') {
                const invA = 1 / (a + 1);
                const invB = 1 / (b + 1);
                const invTotal = invA + invB;
                if (invTotal <= 0) return [50, 50];
                return [
                    Number(((invA / invTotal) * 100).toFixed(1)),
                    Number(((invB / invTotal) * 100).toFixed(1))
                ];
            }
            const total = a + b;
            if (total <= 0) return [50, 50];
            return [
                Number(((a / total) * 100).toFixed(1)),
                Number(((b / total) * 100).toFixed(1))
            ];
        };

        const labels = metrics.map((metric) => metric.label);
        const p1Display = metrics.map((metric) => `${metric.p1}${metric.suffix || ''}`);
        const p2Display = metrics.map((metric) => `${metric.p2}${metric.suffix || ''}`);
        const p1Norm = [];
        const p2Norm = [];
        metrics.forEach((metric) => {
            const [n1, n2] = normalizePair(metric.p1, metric.p2, metric.better);
            p1Norm.push(n1);
            p2Norm.push(n2);
        });

        const closedLabels = labels.concat(labels[0]);
        const p1Closed = p1Norm.concat(p1Norm[0]);
        const p2Closed = p2Norm.concat(p2Norm[0]);
        const p1DisplayClosed = p1Display.concat(p1Display[0]);
        const p2DisplayClosed = p2Display.concat(p2Display[0]);

        const traces = [
            {
                type: 'scatterpolar',
                r: p1Closed,
                theta: closedLabels,
                name: player1Name,
                line: { color: '#1E78C3', width: 3 },
                marker: { color: '#1E78C3', size: 6 },
                fill: 'toself',
                fillcolor: 'rgba(30, 120, 195, 0.16)',
                customdata: p1DisplayClosed,
                hovertemplate: '%{theta}: %{customdata}<extra>' + player1Name + '</extra>'
            },
            {
                type: 'scatterpolar',
                r: p2Closed,
                theta: closedLabels,
                name: player2Name,
                line: { color: '#15B294', width: 3 },
                marker: { color: '#15B294', size: 6 },
                fill: 'toself',
                fillcolor: 'rgba(21, 178, 148, 0.15)',
                customdata: p2DisplayClosed,
                hovertemplate: '%{theta}: %{customdata}<extra>' + player2Name + '</extra>'
            }
        ];

        const layout = {
            autosize: true,
            height: 370,
            margin: { l: 36, r: 36, t: 4, b: 10 },
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)',
            showlegend: false,
            polar: {
                domain: { x: [0.08, 0.92], y: [0.04, 0.96] },
                bgcolor: 'rgba(0,0,0,0)',
                radialaxis: {
                    visible: true,
                    range: [0, 100],
                    showticklabels: false,
                    gridcolor: 'rgba(141, 199, 223, 0.38)',
                    gridwidth: 1
                },
                angularaxis: {
                    tickfont: { size: 9, color: '#ECF6FC' },
                    gridcolor: 'rgba(141, 199, 223, 0.32)',
                    linecolor: 'rgba(141, 199, 223, 0.32)'
                }
            }
        };

        plotly.react(container, traces, layout, { responsive: true, displayModeBar: false });
        if (plotly.Plots && typeof plotly.Plots.resize === 'function') {
            requestAnimationFrame(() => plotly.Plots.resize(container));
        }
    },

    /**
     * Generate demo match statistics
     */
    generateMatchStats(match) {
        // Generate realistic demo statistics
        const breakP1Total = Math.floor(Math.random() * 8) + 4;
        const breakP2Total = Math.floor(Math.random() * 8) + 4;
        const breakP1Won = Math.floor(Math.random() * Math.max(2, breakP1Total - 1)) + 1;
        const breakP2Won = Math.floor(Math.random() * Math.max(2, breakP2Total - 1)) + 1;
        return {
            duration: '',
            aces: { p1: Math.floor(Math.random() * 12) + 3, p2: Math.floor(Math.random() * 12) + 3 },
            doubleFaults: { p1: Math.floor(Math.random() * 5), p2: Math.floor(Math.random() * 5) },
            firstServe: { p1: Math.floor(Math.random() * 15) + 55, p2: Math.floor(Math.random() * 15) + 55 },
            firstServeWon: { p1: Math.floor(Math.random() * 15) + 65, p2: Math.floor(Math.random() * 15) + 65 },
            secondServeWon: { p1: Math.floor(Math.random() * 20) + 40, p2: Math.floor(Math.random() * 20) + 40 },
            breakPointsWon: { p1: breakP1Won, p2: breakP2Won },
            breakPointsTotal: { p1: breakP1Total, p2: breakP2Total },
            breakPointsRate: {
                p1: Math.round((breakP1Won / breakP1Total) * 100),
                p2: Math.round((breakP2Won / breakP2Total) * 100)
            },
            winners: { p1: Math.floor(Math.random() * 20) + 20, p2: Math.floor(Math.random() * 20) + 20 },
            unforcedErrors: { p1: Math.floor(Math.random() * 15) + 15, p2: Math.floor(Math.random() * 15) + 15 },
            totalPoints: { p1: Math.floor(Math.random() * 30) + 80, p2: Math.floor(Math.random() * 30) + 80 }
        };
    },

    resolveMatchTimeLabel(match, isLive) {
        const readText = (...values) => {
            for (const value of values) {
                if (value === null || value === undefined) continue;
                const text = String(value).trim();
                if (text) return text;
            }
            return '';
        };

        if (isLive) {
            return readText(
                match.match_time,
                match.live_time,
                match.elapsed_time,
                match.time
            );
        }

        return readText(
            match.match_duration,
            match.duration,
            match.duration_text,
            match.time
        );
    },

    formatSetLines(score) {
        if (!score || !score.sets) return '';
        return score.sets.map(set => {
            const p1 = set.p1;
            const p2 = set.p2;
            const p1Win = p1 > p2;
            const p2Win = p2 > p1;
            const isTiebreak = (p1 === 7 && p2 === 6) || (p1 === 6 && p2 === 7);
            const tbP1 = isTiebreak ? (set.tiebreak ? set.tiebreak.p1 : (p1 === 7 ? 7 : 6)) : null;
            const tbP2 = isTiebreak ? (set.tiebreak ? set.tiebreak.p2 : (p2 === 7 ? 7 : 6)) : null;
            return `
                <div class="set-line">
                    <span class="${p1Win ? 'winner' : ''}">${p1}${tbP1 !== null ? `<sup class="tb">(${tbP1})</sup>` : ''}</span>
                    <span class="dash">-</span>
                    <span class="${p2Win ? 'winner' : ''}">${p2}${tbP2 !== null ? `<sup class="tb">(${tbP2})</sup>` : ''}</span>
                </div>
            `;
        }).join('');
    },

    /**
     * Close match statistics modal
     */
    closeMatchStats() {
        const modal = document.getElementById('matchStatsModal');
        modal.classList.remove('active');
    }
};

// Export module
window.ScoresModule = ScoresModule;
