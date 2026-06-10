import { getConnInfo } from '@hono/node-server/conninfo';
import type { Context, MiddlewareHandler } from 'hono';

export type RateLimitOptions = {
  /** Max requests per IP per minute. 0 disables the minute window. */
  perMinute: number;
  /** Max requests per IP per day. 0 disables the day window. */
  perDay: number;
  /**
   * Read the client IP from X-Forwarded-For. Only enable when the backend is
   * reachable exclusively through a proxy that sets the header (the deploy
   * nginx does) — a directly-reachable backend would let clients spoof it.
   */
  trustProxy: boolean;
  /** Injectable clock for tests. */
  now?: () => number;
};

type WindowState = {
  windowStart: number;
  count: number;
};

type IpState = {
  minute: WindowState;
  day: WindowState;
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SWEEP_INTERVAL_MS = 10 * MINUTE_MS;

function clientIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const forwardedFor = c.req.header('x-forwarded-for');
    const first = forwardedFor?.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown';
  } catch {
    // No underlying socket (e.g. app.request() in tests)
    return 'unknown';
  }
}

function hitWindow(state: WindowState, limit: number, durationMs: number, now: number): number | null {
  if (limit <= 0) {
    return null;
  }
  if (now - state.windowStart >= durationMs) {
    state.windowStart = now;
    state.count = 0;
  }
  if (state.count >= limit) {
    return state.windowStart + durationMs - now;
  }
  return null;
}

/**
 * Fixed-window, in-memory, per-IP rate limiter for the execute route.
 *
 * Deliberately process-local (WB-229 lean MVP runs a single backend
 * replica): counters reset on restart and are not shared across replicas.
 * The OpenRouter account Guardrail is the independent hard spend cap; this
 * gate only stops a single IP from burning the daily budget.
 */
export function createRateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler {
  const { perMinute, perDay, trustProxy } = options;
  const now = options.now ?? Date.now;
  const states = new Map<string, IpState>();
  let lastSweep = now();

  return async (c, next) => {
    const timestamp = now();

    if (timestamp - lastSweep >= SWEEP_INTERVAL_MS) {
      lastSweep = timestamp;
      for (const [ip, state] of states) {
        if (timestamp - state.day.windowStart >= DAY_MS && timestamp - state.minute.windowStart >= MINUTE_MS) {
          states.delete(ip);
        }
      }
    }

    const ip = clientIp(c, trustProxy);
    let state = states.get(ip);
    if (!state) {
      state = {
        minute: { windowStart: timestamp, count: 0 },
        day: { windowStart: timestamp, count: 0 },
      };
      states.set(ip, state);
    }

    const minuteRetry = hitWindow(state.minute, perMinute, MINUTE_MS, timestamp);
    const dayRetry = hitWindow(state.day, perDay, DAY_MS, timestamp);
    const retryAfterMs = Math.max(minuteRetry ?? 0, dayRetry ?? 0);

    if (retryAfterMs > 0) {
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
      c.header('Retry-After', String(retryAfterSeconds));
      return c.json(
        {
          code: 'rate_limited',
          message: 'Too many workflow executions from this address — try again later',
          retryAfterSeconds,
        },
        429,
      );
    }

    state.minute.count += 1;
    state.day.count += 1;

    await next();
  };
}
