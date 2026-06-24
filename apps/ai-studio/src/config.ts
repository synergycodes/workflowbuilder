export const BACKEND_URL = import.meta.env['VITE_BACKEND_URL'] ?? 'http://127.0.0.1:3001';

// Cloudflare Turnstile site key (public). Undefined = bot protection disabled
// (local dev); when set, the Run button attaches a token the backend verifies.
export const TURNSTILE_SITE_KEY = import.meta.env['VITE_TURNSTILE_SITE_KEY'] as string | undefined;
