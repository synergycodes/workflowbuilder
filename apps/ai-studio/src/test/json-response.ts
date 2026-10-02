export const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// A proxy's HTML error page: a real body that json() rejects on.
export const unparsableResponse = (status: number): Response =>
  new Response('<html>Not Found</html>', { status, headers: { 'content-type': 'text/html' } });
