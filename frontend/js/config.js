/**
 * API Configuration
 * Automatically detects local vs production environment
 */

// Auto-detect environment
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname === '';

// Set API base URL based on environment
const API_BASE_URL = isLocal 
    ? 'http://localhost:5001'  // Local development
    : window.location.origin;   // Production (same domain as frontend)

// Make config globally available
window.TennisApp = window.TennisApp || {};
window.TennisApp.CONFIG = {
    API_BASE_URL: API_BASE_URL,
    IS_LOCAL: isLocal
};
