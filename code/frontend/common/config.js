/**
 * StudyMap - Application Configuration
 * This file contains all configuration needed for frontend-backend integration
 */

// ============================================
// SERVER CONFIGURATION
// ============================================

// Backend Server Configuration
const SERVER_CONFIG = {
    // Backend API Server (Flask)
    backend: {
        host: 'localhost',
        port: 5000,
        protocol: 'http',
        
        // Full URL for API calls
        get baseUrl() {
            return `${this.protocol}://${this.host}:${this.port}`;
        },
        get apiUrl() {
            return `${this.baseUrl}/api`;
        }
    },
    
    // Frontend Server (HTTP Server)
    frontend: {
        host: 'localhost',
        port: 8000,
        protocol: 'http',
        
        get baseUrl() {
            return `${this.protocol}://${this.host}:${this.port}`;
        }
    },
    
    // JWT Token Configuration
    jwt: {
        storageKey: 'studymap-token',
        userStorageKey: 'studymap-user',
        expirationMinutes: 43200  // 30 days
    },
    
    // File Upload Configuration
    upload: {
        maxFileSize: 16 * 1024 * 1024,  // 16MB
        allowedFormats: ['pdf', 'PDF'],
        uploadFolder: 'uploads'
    },
    
    // Application Configuration
    app: {
        name: 'StudyMap',
        version: '1.0.0',
        debug: true
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if backend server is accessible
 */
async function checkBackendConnection() {
    try {
        const response = await fetch(`${SERVER_CONFIG.backend.apiUrl}/auth/me`, {
            method: 'GET',
            timeout: 5000
        });
        return response.ok || response.status === 401;  // 401 means server is up but not authenticated
    } catch (error) {
        console.warn('Backend connection check failed:', error);
        return false;
    }
}

/**
 * Get API endpoint URL
 */
function getEndpoint(path) {
    return `${SERVER_CONFIG.backend.apiUrl}${path}`;
}

/**
 * Get stored JWT token
 */
function getToken() {
    return localStorage.getItem(SERVER_CONFIG.jwt.storageKey);
}

/**
 * Save JWT token
 */
function saveToken(token) {
    localStorage.setItem(SERVER_CONFIG.jwt.storageKey, token);
}

/**
 * Get stored user data
 */
function getUser() {
    const userJson = localStorage.getItem(SERVER_CONFIG.jwt.userStorageKey);
    return userJson ? JSON.parse(userJson) : null;
}

/**
 * Save user data
 */
function saveUser(user) {
    localStorage.setItem(SERVER_CONFIG.jwt.userStorageKey, JSON.stringify(user));
}

/**
 * Clear authentication (logout)
 */
function clearAuth() {
    localStorage.removeItem(SERVER_CONFIG.jwt.storageKey);
    localStorage.removeItem(SERVER_CONFIG.jwt.userStorageKey);
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
    return !!getToken();
}

// ============================================
// EXPORT FOR OTHER FILES
// ============================================

// If using modules, export the config
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SERVER_CONFIG;
}
