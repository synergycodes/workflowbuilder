import { defineMiddleware } from 'astro:middleware';

import swaConfig from '../staticwebapp.config.json';

/**
 * Applies the production response headers in `astro dev`.
 *
 * The site builds to static files, so it cannot set its own headers. Azure
 * Static Web Apps sends them in production, and this reads the same config, so
 * one file owns the routes and the values.
 *
 * What needs them today: cross-origin isolation on the page that embeds
 * StackBlitz. Without it the embed shows "Unable to run Embedded Project".
 * **Do not** widen the route to the whole site - COEP blocks the YouTube embeds on
 * other pages.
 */
const routes = swaConfig.routes.map(({ route, headers }) => ({
  prefix: route.replace(/\*$/, ''),
  headers: Object.entries(headers),
}));

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  for (const { prefix, headers } of routes) {
    if (!context.url.pathname.startsWith(prefix)) {
      continue;
    }
    for (const [name, value] of headers) {
      response.headers.set(name, value);
    }
  }

  return response;
});
