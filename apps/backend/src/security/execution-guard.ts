import type { Context } from 'hono';

import { isTurnstileEnabled, verifyTurnstileToken } from './turnstile';

function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  return (
    c.req.header('cf-connecting-ip') ??
    (forwarded ? forwarded.split(',')[0].trim() : undefined) ??
    c.req.header('x-real-ip') ??
    'unknown'
  );
}

// Optional Turnstile bot verification; no-op when unconfigured. Returns a
// Response to short-circuit the request, or null to proceed. Rate limiting is
// handled by the execute rate-limit middleware in server.ts.
export async function guardExecution(c: Context): Promise<Response | null> {
  if (!isTurnstileEnabled()) {
    return null;
  }

  const token = c.req.header('cf-turnstile-token');
  if (!token) {
    return c.json({ code: 'verification_required', message: 'Bot verification is required to run a workflow.' }, 403);
  }

  const ip = clientIp(c);
  const ok = await verifyTurnstileToken(token, ip === 'unknown' ? undefined : ip);
  if (!ok) {
    return c.json(
      { code: 'verification_failed', message: 'Bot verification failed. Please reload the page and try again.' },
      403,
    );
  }

  return null;
}
