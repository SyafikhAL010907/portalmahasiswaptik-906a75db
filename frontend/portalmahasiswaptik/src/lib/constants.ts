/**
 * Central API Configuration for Portal Mahasiswa PTIK
 * Handles environment-aware URL with robust fallback for production deployments (Koyeb/etc.)
 */

const getApiBaseUrl = () => {
    // 1. Prioritas Utama: Environment Variable (Vite/Koyeb/Produksi)
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  
    // 2. Deteksi Lingkungan Browser / APK
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        const origin = window.location.origin;

        // Jika di hosting (bukan localhost)
        if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
            return `${origin}/api`;
        }

        // Jika di APK (biasanya localhost tapi tanpa port 5173 atau via Capacitor)
        // Kita tetap butuh VITE_API_URL di sini, tapi kita kasih fallback ke produksi jika ada
    }
  
    // 3. Local Development (PC)
    return "http://localhost:9000/api";
};

export const API_BASE_URL = getApiBaseUrl();
