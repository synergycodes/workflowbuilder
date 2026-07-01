export const BACKEND_URL = import.meta.env['VITE_BACKEND_URL'] ?? 'http://127.0.0.1:3001';

// Public site key. Undefined = bot protection disabled (local dev).
export const TURNSTILE_SITE_KEY = import.meta.env['VITE_TURNSTILE_SITE_KEY'] as string | undefined;
