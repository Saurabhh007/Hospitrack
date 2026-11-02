/**
 * Hospitrack — Runtime Client Environment Configuration
 * This file provides runtime configuration when running on static hosts (Vercel, Netlify, Cloudflare).
 * When running with Node.js server.js, /env-config.js is served dynamically from environment variables.
 *
 * In decoupled production deployments, configure API_BASE_URL to point to your deployed Spring Boot
 * backend domain (e.g. Railway: "https://hospitrack-backend.up.railway.app").
 * When empty or omitted, the client defaults to same-origin relative requests.
 */
window.__ENV__ = window.__ENV__ || {};

// Optional runtime override if specified in global namespace
if (typeof window.__HOSPITRACK_API_URL__ !== 'undefined' && window.__HOSPITRACK_API_URL__) {
  window.__ENV__.API_BASE_URL = window.__HOSPITRACK_API_URL__;
}
