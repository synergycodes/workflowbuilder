function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/, '');
}

/** Same-origin by default; set VITE_BACKEND_URL for a separately hosted backend. */
export const BACKEND_URL = normalizeBaseUrl(import.meta.env['VITE_BACKEND_URL'] as string | undefined);

export function backendUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath}`;
}
