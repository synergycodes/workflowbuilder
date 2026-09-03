function fallbackGenerateId(): `${string}-${string}-${string}-${string}-${string}` {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  array[6] = (array[6] & 0x0F) | 0x40; // Set version to 4
  array[8] = (array[8] & 0x3F) | 0x80; // Set variant to RFC4122

  const hexArray = Array.from(array, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hexArray.slice(0, 4).join('')}-${hexArray.slice(4, 6).join('')}-${hexArray.slice(6, 8).join('')}-${hexArray.slice(8, 10).join('')}-${hexArray.slice(10, 16).join('')}`;
}

// `crypto.randomUUID()` exists only in secure contexts (HTTPS or localhost).
// Opening the dev server from another device over the LAN IP, e.g.
// http://192.168.1.10:4200 on a phone, is an insecure context: `crypto` is
// there but `randomUUID` is undefined and the call throws. The fallback builds
// the same v4 UUID from `crypto.getRandomValues()`, which insecure contexts
// still provide.
export function generateId() {
  try {
    return crypto?.randomUUID();
  } catch {
    console.warn('crypto.randomUUID() is not available in this environment. Falling back to a custom UUID generator.');
    return fallbackGenerateId();
  }
}
