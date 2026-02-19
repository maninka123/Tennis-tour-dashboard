/**
 * API Configuration
 * Automatically detects local vs production environment
 */

// Auto-detect environment
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname === '';

const LOCAL_API_BASE_CANDIDATES = [
    'http://localhost:5001/api',
    'http://127.0.0.1:5001/api',
    'http://localhost:5002/api',
    'http://127.0.0.1:5002/api'
];

const readPersistedApiBase = () => {
    try {
        return localStorage.getItem('tennisApp_apiBaseResolved');
    } catch (error) {
        return null;
    }
};

const persistedApiBase = readPersistedApiBase();
const productionApiBase = `${window.location.origin}/api`;
const API_BASE_CANDIDATES = isLocal ? LOCAL_API_BASE_CANDIDATES : [productionApiBase];

// Set API base URL based on environment
const API_BASE_URL = isLocal
    ? (persistedApiBase || LOCAL_API_BASE_CANDIDATES[0])
    : productionApiBase;

// Make config globally available
window.TennisApp = window.TennisApp || {};
window.TennisApp.CONFIG = {
    API_BASE_URL: API_BASE_URL,
    API_BASE_CANDIDATES: API_BASE_CANDIDATES,
    IS_LOCAL: isLocal
};
