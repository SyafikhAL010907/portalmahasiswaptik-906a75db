/**
 * Central API Configuration for Portal Mahasiswa PTIK
 * Handles environment-aware URL with robust fallback for production deployments (Koyeb/etc.)
 */

const getApiBaseUrl = () => {
    // 1. Try environment variable first (Vite/Koyeb env)
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl;
  
    // 2. Fallback Logic: Detect if running on a production-like domain
    if (typeof window !== 'undefined' && 
        !window.location.hostname.includes('localhost') && 
        !window.location.hostname.includes('127.0.0.1')) {
      // If we are on production but VITE_API_URL is missing, use current origin + /api
      // This prevents "Failed to Fetch" (localhost:9000) errors in production
      return `${window.location.origin}/api`;
    }
  
    // 3. Local Development Fallback
    return "http://localhost:9000/api";
};

export const API_BASE_URL = getApiBaseUrl();
