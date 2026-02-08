/**
 * API Configuration
 * Update API_BASE_URL after deploying to production
 */

// For local development
// const API_BASE_URL = 'http://localhost:5001';

// For production (update this after deployment)
const API_BASE_URL = 'https://tennis-tour-dashboard.onrender.com';

// Make config globally available
window.TennisApp = window.TennisApp || {};
window.TennisApp.CONFIG = {
    API_BASE_URL: API_BASE_URL
};
