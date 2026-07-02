import { env } from '../env';
import { logger as backendLogger } from '../logger';

const logger = backendLogger.child({ component: 'turnstile' });

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export function isTurnstileEnabled(): boolean {
  return Boolean(env.TURNSTILE_SECRET_KEY);
}

// Returns true when disabled (no secret); fails closed on a verifier/network error, since this gates a paid LLM run.
export async function verifyTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return true;
  }

  const form = new URLSearchParams();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteIp) {
    form.set('remoteip', remoteIp);
  }

  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const result = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (!result.success) {
      logger.warn('turnstile verification rejected', { errorCodes: result['error-codes'] ?? [] });
    }
    return result.success === true;
  } catch (error) {
    logger.error('turnstile verification error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
