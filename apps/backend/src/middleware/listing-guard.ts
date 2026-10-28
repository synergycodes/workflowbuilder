import type { Hono } from 'hono';

import { AllowAllAuthPort, type AuthPort } from '../auth';
import type { BackendEnv } from '../routes/backend-env';

// Any future collection route belongs here too: the random id is a run's only secret on a public deployment.
const LISTING_PATHS = ['/api/workflows', '/api/executions'] as const;

/** Under the permissive port the random id is the only secret; any other port authorizes listing by itself. */
export function isListingRefused(authPort: AuthPort, enableListing: boolean): boolean {
  return authPort instanceof AllowAllAuthPort && !enableListing;
}

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
