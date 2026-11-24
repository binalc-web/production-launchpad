/**
 * ============================================================
 * FRONTEND CONFIGURATION
 * ============================================================
 *
 * This is the SINGLE SOURCE OF TRUTH for all frontend config.
 *
 * HOW TO SWITCH ENVIRONMENTS:
 * ---------------------------
 * Option 1: Edit the default values below
 * Option 2: Set environment variables (recommended)
 *           Copy frontend/.env.example to frontend/.env and set:
 *           VITE_API_URL=http://localhost:5000
 *           (Vite loads frontend/.env when you run npm run dev from frontend/)
 *
 * ENVIRONMENT VALUES:
 * -------------------
 * Local Development: http://localhost:5000
 * EC2 Production:    http://43.205.121.85:5000
 *
 * ============================================================
 */

const config = {
  // Backend API URL - where the frontend sends all API requests
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:5000",
  FRONTEND_URL: import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173",

  // Hub (Anhto) API URL - for Google OAuth flow (redirect + callback exchange)
  HUB_API_URL: (import.meta.env.VITE_HUB_API_URL || "https://api.uat-hub.yorkdevs.link").replace(
    /\/$/,
    "",
  ),

  /** Hub OAuth return URL — set VITE_HUB_OAUTH_REDIRECT_URL or defaults to FRONTEND_URL/auth/callback */
  HUB_OAUTH_REDIRECT_URL: (
    import.meta.env.VITE_HUB_OAUTH_REDIRECT_URL ||
    `${(import.meta.env.VITE_FRONTEND_URL || "http://localhost:5173").trim().replace(/\/$/, "")}/auth/callback`
  ).replace(/\/$/, ""),

  /**
   * Base URL for GET …/get-profile-pic/:email only.
   * When unset, uses HUB_API_URL. Set VITE_HUB_PROFILE_PIC_API_URL if pic host differs from OAuth Hub.
   */
  HUB_PROFILE_PIC_API_URL: import.meta.env.VITE_HUB_PROFILE_PIC_API_URL,

  /** Figma plugin ZIP — set VITE_FIGMA_PLUGIN_DOWNLOAD_URL or repo-root FIGMA_PLUGIN_DOWNLOAD_URL (Docker build). */
  FIGMA_PLUGIN_DOWNLOAD_URL: import.meta.env.VITE_FIGMA_PLUGIN_DOWNLOAD_URL,
  // Current environment (development/production)
  NODE_ENV: import.meta.env.VITE_MODE || "development",

  // Helper to check if running in production
  isProduction: import.meta.env.VITE_MODE === "production",
};

export default config;
