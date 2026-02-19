/**
 * Intro GIF collage loader
 * Builds a full-screen random mosaic while app data initializes.
 * Dynamically loads gif filenames from backend to support easy gif additions.
 */
(function () {
    let GIF_FILES = [];
    let gifsLoaded = false;
    const DEFAULT_GIF_COUNT = 36;

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
        // Get the API base from config if available, otherwise build it
        const apiBase = window.TennisApp?.CONFIG?.API_BASE_URL || 'http://localhost:5001/api';
        const baseUrl = apiBase.replace('/api', '');  // Get base URL without /api
        return `${baseUrl}/Images/intro gifs/${encodeURIComponent(file)}`;
    };

    const buildDefaultGifList = () => {
        const files = [];
        for (let i = 1; i <= DEFAULT_GIF_COUNT; i += 1) {
            files.push(`tennis_${String(i).padStart(2, '0')}.gif`);
        }
        return files;
    };

    /**
     * Fetch available gif files from backend
     */
    async function fetchGifFiles() {
        const apiBase = window.TennisApp?.CONFIG?.API_BASE_URL || 'http://localhost:5001/api';
        const urlCandidates = [
            `${apiBase.replace('/api', '')}/api/intro-gifs`,
            '/api/intro-gifs'
        ];

        try {
            for (const url of urlCandidates) {
                const response = await fetch(url);
                const result = await response.json();
                if (result.success && result.data && result.data.length > 0) {
                    GIF_FILES = result.data;
                    gifsLoaded = true;
                    console.log(`Loaded ${GIF_FILES.length} gifs from backend`);
                    return true;
                }
            }
        } catch (error) {
            console.warn('Could not fetch gif list from backend:', error);
        }
        // Fallback: use the known local filename set if API lookup fails
        GIF_FILES = buildDefaultGifList();
        gifsLoaded = true;
        return false;
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
            };

            img.onerror = () => {
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
        
        // Build the collage with all available gifs
        await buildCollage();
        
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
