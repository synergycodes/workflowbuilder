import type { Hono } from 'hono';

import type { BackendEnv } from '../routes/backend-env';

// Any future collection route belongs here too: the random id is a run's only secret on a public deployment.
const LISTING_PATHS = ['/api/workflows', '/api/executions'] as const;

/** Register before the routers: a handler that answers ends the chain, so the list handlers never run. */
export function refuseListing(app: Hono<BackendEnv>): void {
  for (const path of LISTING_PATHS) {
    app.get(path, (c) =>
      c.json(
        {
          code: 'listing_disabled',
          message: 'Listing is disabled on this deployment; ENABLE_WB_LISTING=true turns it on',
        },
        403,
      ),
    );
  }
}
