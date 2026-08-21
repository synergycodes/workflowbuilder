/**
 * Detects token names that become the same CSS custom property after the
 * Style Dictionary kebab transform — e.g. the Figma-side duplicate
 * 'ax/colors/acc7- 100' (stray space) vs 'ax/colors/acc7-100', which both
 * emit `--ax-colors-acc7-100` and silently overwrite each other in the
 * built CSS.
 *
 * Same-value collisions warn; different-value collisions throw, because the
 * emitted value would then depend on object iteration order.
 */
import StyleDictionary, { TransformedToken } from 'style-dictionary';

type TokenLeaf = { value: unknown; type: string };
type TokenNode = TokenLeaf | { [key: string]: TokenNode };
type TokenEntry = { path: string; value: unknown };

type CssNameCollision = {
  cssName: string;
  entries: { path: string; value: unknown }[];
  sameValue: boolean;
};

function isLeaf(node: TokenNode): node is TokenLeaf {
  return typeof node === 'object' && node !== null && 'value' in node && 'type' in node;
}

function collectLeaves(node: TokenNode, path: string[], out: TokenEntry[]) {
  if (isLeaf(node)) {
    out.push({ path: path.join('/'), value: node.value });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    collectLeaves(child as TokenNode, [...path, key], out);
  }
}

const kebabName = StyleDictionary.hooks.transforms['name/kebab'].transform;

/** Must match Style Dictionary's `name/kebab` output — it IS that transform,
 * invoked directly, so the two cannot drift. */
function toCssName(tokenPath: string): string {
  return `--${kebabName({ path: tokenPath.split('/') } as TransformedToken, {}, {})}`;
}

function getLeaves(tokenSet: Record<string, TokenNode>): TokenEntry[] {
  const leaves: TokenEntry[] = [];
  for (const [key, node] of Object.entries(tokenSet)) {
    collectLeaves(node, [key], leaves);
  }
  return leaves;
}

export function findCssNameCollisions(tokenSet: Record<string, TokenNode>): CssNameCollision[] {
  const byCssName = new Map<string, TokenEntry[]>();
  for (const leaf of getLeaves(tokenSet)) {
    const cssName = toCssName(leaf.path);
    byCssName.set(cssName, [...(byCssName.get(cssName) ?? []), leaf]);
  }

  return [...byCssName.entries()]
    .filter(([, entries]) => entries.length > 1)
    .map(([cssName, entries]) => ({
      cssName,
      entries,
      sameValue: new Set(entries.map((entry) => JSON.stringify(entry.value))).size === 1,
    }));
}

/**
 * Validates every configured set in the raw tokens.json export. Different
 * values behind one CSS name fail the build; identical values only warn so
 * the known Figma-side duplicates don't block builds until design removes
 * them at the source.
 */
export function assertNoValueCollisions(
  tokens: Record<string, unknown>,
  setKeys: string[],
  cssScopeGroups: string[][] = [],
): void {
  for (const setKey of setKeys) {
    const tokenSet = tokens[setKey];
    if (!tokenSet) {
      throw new Error(`tokens.json does not export a '${setKey}' set`);
    }
    const collisions = findCssNameCollisions(tokenSet as Record<string, TokenNode>);
    const conflicting = collisions.filter((collision) => !collision.sameValue);

    for (const collision of collisions.filter((c) => c.sameValue)) {
      console.warn(
        `tokens: '${setKey}' exports duplicate names for ${collision.cssName} ` +
          `(${collision.entries.map((entry) => `'${entry.path}'`).join(', ')}) — same value, ` +
          'the built CSS keeps one copy; remove the duplicate in Figma.',
      );
    }

    if (conflicting.length > 0) {
      throw new Error(
        conflicting
          .map(
            (collision) =>
              `'${setKey}': ${collision.entries.map((entry) => `'${entry.path}' (${JSON.stringify(entry.value)})`).join(' and ')} ` +
              `all emit ${collision.cssName} with different values — the winner would depend on iteration order`,
          )
          .join('\n'),
      );
    }
  }

  for (const setKeysInScope of cssScopeGroups) {
    const setsByCssName = new Map<string, string[]>();
    for (const setKey of setKeysInScope) {
      const tokenSet = tokens[setKey];
      if (!tokenSet) {
        throw new Error(`tokens.json does not export a '${setKey}' set`);
      }
      const cssNames = new Set(getLeaves(tokenSet as Record<string, TokenNode>).map((entry) => toCssName(entry.path)));
      for (const cssName of cssNames) {
        setsByCssName.set(cssName, [...(setsByCssName.get(cssName) ?? []), setKey]);
      }
    }

    const collisions = [...setsByCssName.entries()].filter(([, owners]) => owners.length > 1);
    if (collisions.length > 0) {
      throw new Error(
        collisions
          .map(
            ([cssName, owners]) =>
              `${owners.map((owner) => `'${owner}'`).join(' and ')} both emit ${cssName} under one CSS selector — the winner would depend on bundle order`,
          )
          .join('\n'),
      );
    }
  }
}
