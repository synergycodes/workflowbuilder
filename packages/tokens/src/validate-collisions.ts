/**
 * Detects token names that become the same CSS custom property after the
 * Style Dictionary kebab transform — e.g. the Figma-side duplicate
 * 'ax/colors/acc7- 100' (stray space) vs 'ax/colors/acc7-100', which both
 * emit `--ax-colors-acc7-100` and silently overwrite each other in the
 * built CSS.
 *
 * Same-value collisions warn (today's export carries ten of them, all
 * benign); different-value collisions throw, because the emitted value
 * would then depend on object iteration order.
 */
import { kebabCase } from 'change-case';

type TokenLeaf = { value: unknown; type: string };
type TokenNode = TokenLeaf | { [key: string]: TokenNode };

type CssNameCollision = {
  cssName: string;
  entries: { path: string; value: unknown }[];
  sameValue: boolean;
};

function isLeaf(node: TokenNode): node is TokenLeaf {
  return typeof node === 'object' && node !== null && 'value' in node && 'type' in node;
}

function collectLeaves(node: TokenNode, path: string[], out: { path: string; value: unknown }[]) {
  if (isLeaf(node)) {
    out.push({ path: path.join('/'), value: node.value });
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    collectLeaves(child as TokenNode, [...path, key], out);
  }
}

/** The emitted CSS name: Style Dictionary's `name/kebab` transform runs
 * change-case's kebabCase over the space-joined token path — use the same
 * function so the two can never drift. */
function toCssName(tokenPath: string): string {
  return `--${kebabCase(tokenPath.split('/').join(' '))}`;
}

export function findCssNameCollisions(tokenSet: Record<string, TokenNode>): CssNameCollision[] {
  const leaves: { path: string; value: unknown }[] = [];
  for (const [key, node] of Object.entries(tokenSet)) {
    collectLeaves(node, [key], leaves);
  }

  const byCssName = new Map<string, { path: string; value: unknown }[]>();
  for (const leaf of leaves) {
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
export function assertNoValueCollisions(tokens: Record<string, unknown>, setKeys: string[]): void {
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
}
