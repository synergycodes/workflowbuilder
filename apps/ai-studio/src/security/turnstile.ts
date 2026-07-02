import { TURNSTILE_SITE_KEY } from '../config';

interface TurnstileApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId: string, options?: Record<string, unknown>) => void;
  reset: (widgetId: string) => void;
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;
let widgetId: string | null = null;
let container: HTMLElement | null = null;
let resolveToken: ((token: string) => void) | null = null;
let rejectToken: ((error: Error) => void) | null = null;

function turnstileApi(): TurnstileApi | undefined {
  return (globalThis as typeof globalThis & { turnstile?: TurnstileApi }).turnstile;
}

function loadScript(): Promise<void> {
  if (scriptPromise) {
    return scriptPromise;
  }
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () => reject(new Error('Failed to load Turnstile')));
    document.head.append(script);
  });
  return scriptPromise;
}

async function waitForApi(): Promise<TurnstileApi> {
  await loadScript();
  for (let attempt = 0; attempt < 50 && !turnstileApi(); attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const api = turnstileApi();
  if (!api) {
    throw new Error('Turnstile is unavailable');
  }
  return api;
}

// Returns undefined when no site key is configured (local dev). One invisible widget re-executed per run, since tokens are single-use.
export function getTurnstileToken(): Promise<string | undefined> {
  // Serialized: the single widget and resolve/reject slots can't handle overlapping requests.
  const next = queue
    .catch(() => {
      // a failed predecessor must not poison the queue
    })
    .then(requestToken);
  queue = next;
  return next;
}

let queue: Promise<unknown> = Promise.resolve();

async function requestToken(): Promise<string | undefined> {
  const siteKey = TURNSTILE_SITE_KEY;
  if (!siteKey) {
    return undefined;
  }

  const turnstile = await waitForApi();

  return new Promise<string>((resolve, reject) => {
    resolveToken = resolve;
    rejectToken = reject;

    let id = widgetId;
    if (id === null) {
      container = document.createElement('div');
      container.style.display = 'none';
      document.body.append(container);
      id = turnstile.render(container, {
        sitekey: siteKey,
        size: 'invisible',
        callback: (token: string) => resolveToken?.(token),
        'error-callback': () => rejectToken?.(new Error('Turnstile error')),
        'timeout-callback': () => rejectToken?.(new Error('Turnstile timeout')),
      });
      widgetId = id;
    } else {
      turnstile.reset(id);
    }

    turnstile.execute(id, { sitekey: siteKey });
  });
}
