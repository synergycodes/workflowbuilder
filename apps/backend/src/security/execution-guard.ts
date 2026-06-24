import type { Context } from 'hono';

import { env } from '../env';
import { isTurnstileEnabled, verifyTurnstileToken } from './turnstile';

type Bucket = { count: number; resetAt: number };

// In-memory per-IP fixed-window counter. Fine for a single-instance demo; a
// multi-instance deployment would back this with a shared store (e.g. Redis).
const buckets = new Map<string, Bucket>();
const MAX_TRACKED_IPS = 10_000;

function clientIp(c: Context): string {
  const forwarded = c.req.header('x-forwarded-for');
  return (
    c.req.header('cf-connecting-ip') ??
    (forwarded ? forwarded.split(',')[0].trim() : undefined) ??
    c.req.header('x-real-ip') ??
    'unknown'
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();

  // Cheap memory bound: a single window never holds enough distinct demo IPs
  // for clearing to lose useful state.
  if (buckets.size > MAX_TRACKED_IPS) {
    buckets.clear();
  }

  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + env.EXECUTE_RATE_WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  bucket.count += 1;
  if (bucket.count > env.EXECUTE_RATE_LIMIT) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSec: 0 };
}

/**
 * Abuse control for the single workflow-execution choke point: a per-IP rate
 * limit plus an optional Cloudflare Turnstile check. Returns a Response to
 * short-circuit the request, or null when the run may proceed. Both controls
 * are no-ops when unconfigured, so local dev runs without any keys.
 */
export async function guardExecution(c: Context): Promise<Response | null> {
  const ip = clientIp(c);

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    c.header('Retry-After', String(rate.retryAfterSec));
    return c.json(
      { code: 'rate_limited', message: 'Too many runs from this session. Please wait a moment and try again.' },
      429,
    );
  }

  if (isTurnstileEnabled()) {
    const token = c.req.header('cf-turnstile-token');
    if (!token) {
      return c.json({ code: 'verification_required', message: 'Bot verification is required to run a workflow.' }, 403);
    }
    const ok = await verifyTurnstileToken(token, ip === 'unknown' ? undefined : ip);
    if (!ok) {
      return c.json(
        { code: 'verification_failed', message: 'Bot verification failed. Please reload the page and try again.' },
        403,
      );
    }
  }

  return null;
}
