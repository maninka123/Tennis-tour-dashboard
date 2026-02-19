/**
 * Intro GIF collage loader
 * Builds a full-screen random mosaic while app data initializes.
 * Dynamically loads gif filenames from backend to support easy gif additions.
 */
(function () {
    let GIF_FILES = [];
    let gifsLoaded = false;
    const DEFAULT_GIF_COUNT = 36;
    let gifSourceStatus = 'unknown';
    let gifHostOrigin = null;

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    const shuffle = (arr) => {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    };

    const buildGifUrl = (file) => {
        const apiBase = window.TennisApp?.CONFIG?.API_BASE_URL || 'http://localhost:5001/api';
        const baseUrl = gifHostOrigin || apiBase.replace('/api', '');
        return `${baseUrl}/Images/intro gifs/${encodeURIComponent(file)}`;
    };

    const buildDefaultGifList = () => {
        const files = [];
        for (let i = 1; i <= DEFAULT_GIF_COUNT; i += 1) {
            files.push(`tennis_${String(i).padStart(2, '0')}.gif`);
        }
        return files;
    };

    const normalizeBase = (value) => String(value || '').trim().replace(/\/+$/, '');

    const originFromApiBase = (apiBase) => normalizeBase(apiBase).replace(/\/api\/?$/, '');

    const buildApiBaseCandidates = () => {
        const cfgCandidates = Array.isArray(window.TennisApp?.CONFIG?.API_BASE_CANDIDATES)
            ? window.TennisApp.CONFIG.API_BASE_CANDIDATES
            : [];
        const raw = [
            window.TennisApp?.AppState?.apiBaseResolved,
            window.TennisApp?.CONFIG?.API_BASE_URL,
            ...cfgCandidates,
            `${window.location.origin}/api`,
            'http://localhost:5001/api',
            'http://127.0.0.1:5001/api',
            'http://localhost:5002/api',
            'http://127.0.0.1:5002/api'
        ];
        const unique = [];
        raw.forEach((item) => {
            const clean = normalizeBase(item);
            if (!clean || unique.includes(clean)) return;
            unique.push(clean);
        });
        return unique;
    };

    async function verifyGifServing(origins, probeFile) {
        for (const origin of origins) {
            const url = `${origin}/Images/intro gifs/${encodeURIComponent(probeFile)}`;
            try {
                const response = await fetch(url, { cache: 'no-store' });
                if (response.ok) {
                    gifHostOrigin = origin;
                    return true;
                }
            } catch (error) {
                console.warn(`GIF image probe failed (${url}):`, error);
            }
        }
        return false;
    }

    /**
     * Fetch available gif files from backend
     */
    async function fetchGifFiles() {
        const apiBaseCandidates = buildApiBaseCandidates();

        for (const apiBase of apiBaseCandidates) {
            const origin = originFromApiBase(apiBase);
            const url = `${origin}/api/intro-gifs`;
            try {
                const response = await fetch(url);
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    GIF_FILES = result.data;
                    gifsLoaded = true;
                    gifSourceStatus = 'backend';
                    gifHostOrigin = origin;
                    console.log(`Loaded ${GIF_FILES.length} gifs from backend`);
                    return true;
                }
            } catch (error) {
                console.warn(`GIF API candidate failed (${url}):`, error);
            }
        }
        // Fallback: use the known local filename set if API lookup fails
        GIF_FILES = buildDefaultGifList();
        gifsLoaded = true;
        const origins = apiBaseCandidates.map(originFromApiBase).filter(Boolean);
        const backendGifServing = await verifyGifServing(origins, GIF_FILES[0]);
        gifSourceStatus = backendGifServing ? 'backend' : 'fallback';
        return false;
    }

    function updateGifSourceIndicator() {
        const led = document.getElementById('gifSourceLed');
        const text = document.getElementById('gifSourceText');
        const progressBar = document.getElementById('introLoadProgressBar');
        if (!led || !text) return;

        led.classList.remove('is-green', 'is-red', 'is-unknown');

        if (gifSourceStatus === 'backend') {
            led.classList.add('is-green');
            text.textContent = 'Loading live tennis data...';
            if (progressBar) {
                progressBar.style.background = 'linear-gradient(90deg, #79a8ff, #9ce0ff)';
            }
            return;
        }
        if (gifSourceStatus === 'fallback') {
            led.classList.add('is-red');
            text.textContent = 'Loading live tennis data...';
            if (progressBar) {
                progressBar.style.background = 'linear-gradient(90deg, #ff7a7a, #ef4444)';
            }
            return;
        }

        led.classList.add('is-unknown');
        text.textContent = 'Loading live tennis data...';
        if (progressBar) {
            progressBar.style.background = 'linear-gradient(90deg, #79a8ff, #9ce0ff)';
        }
    }

    function setLoadProgress(ratio) {
        const progressBar = document.getElementById('introLoadProgressBar');
        if (!progressBar) return;
        const pct = Math.max(0, Math.min(100, Math.round(Number(ratio || 0) * 100)));
        progressBar.style.width = `${pct}%`;
    }

    function getTileCount() {
        const width = window.innerWidth || 1440;
        const height = window.innerHeight || 900;
        // Use all available gifs to ensure screen is fully covered
        return GIF_FILES.length;
    }

    async function buildCollage() {
        const grid = document.getElementById('introGifGrid');
        if (!grid) return;

        // Wait for gifs to be loaded if not already
        if (!gifsLoaded) {
            await fetchGifFiles();
        }

        if (GIF_FILES.length === 0) {
            console.error('No gif files available');
            return;
        }

        setLoadProgress(0);
        grid.innerHTML = '';
        // Determine how many tiles to fill (based on grid width/height and CSS columns)
        const gridStyles = window.getComputedStyle(grid);
        const colCount = parseInt(gridStyles.columnCount, 10) || 6;
        const tileWidth = 88 + 8; // min tile width + gap
        const tileHeight = 88 + 8; // estimate
        const gridWidth = grid.offsetWidth || window.innerWidth;
        const gridHeight = grid.offsetHeight || window.innerHeight;
        const estRows = Math.ceil(gridHeight / tileHeight);
        const tileCount = clamp(colCount * estRows, colCount * 2, colCount * 8);

        // Fill with all unique gifs first, then repeat only if needed, reshuffling each round
        let needed = tileCount;
        let gifPool = [];
        let round = 0;
        while (needed > 0) {
            let roundGifs = shuffle(GIF_FILES);
            if (roundGifs.length > needed) roundGifs = roundGifs.slice(0, needed);
            gifPool = gifPool.concat(roundGifs);
            needed -= roundGifs.length;
            round++;
        }

        const total = gifPool.length;
        let loaded = 0;
        let successCount = 0;
        const markTileReady = () => {
            loaded += 1;
            setLoadProgress(total > 0 ? loaded / total : 1);
        };

        for (let i = 0; i < gifPool.length; i += 1) {
            const tile = document.createElement('div');
            tile.className = 'intro-gif-tile';

            const img = document.createElement('img');
            const file = gifPool[i];
            img.src = buildGifUrl(file);
            img.alt = 'Tennis intro animation';
            img.loading = 'eager';
            img.decoding = 'async';

            img.onload = () => {
                img.width = img.naturalWidth * 0.8;
                successCount += 1;
                if (successCount === 1 && gifSourceStatus !== 'backend') {
                    // Real image bytes are loading, so treat source as healthy.
                    gifSourceStatus = 'backend';
                    updateGifSourceIndicator();
                }
                markTileReady();
            };

            img.onerror = () => {
                markTileReady();
                tile.style.background = 'linear-gradient(140deg, rgba(18,28,43,0.95), rgba(12,20,33,0.88))';
                img.remove();
            };

            tile.appendChild(img);
            grid.appendChild(tile);
        }
    }

    function watchOverlayLifecycle() {
        const overlay = document.getElementById('loadingOverlay');
        const grid = document.getElementById('introGifGrid');
        if (!overlay || !grid) return;

        const observer = new MutationObserver(() => {
            if (!overlay.classList.contains('hidden')) return;
            window.setTimeout(() => {
                grid.innerHTML = '';
                overlay.remove();
            }, 700);
            observer.disconnect();
        });
        observer.observe(overlay, { attributes: true, attributeFilter: ['class'] });
    }

    async function init() {
        if (!document.getElementById('loadingOverlay')) return;
        
        // Fetch and load gifs first
        await fetchGifFiles();
        updateGifSourceIndicator();
        
        // Build the collage with all available gifs
        await buildCollage();
        setLoadProgress(1);
        
        watchOverlayLifecycle();
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            if (resizeTimer) window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(() => buildCollage(), 200);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
