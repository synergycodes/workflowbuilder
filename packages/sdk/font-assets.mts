import fs from 'node:fs';
import path from 'node:path';

/**
 * Copies the font files and their licences from the built `@workflowbuilder/ui`
 * assets into the SDK distribution, so the SDK stylesheet can resolve
 * `./assets/*.woff2` without the consumer installing the UI package.
 *
 * @returns the names of the copied files.
 */
export function copyUiFontAssets(uiAssetsDirectory: string, assetsDirectory: string): string[] {
  fs.mkdirSync(assetsDirectory, { recursive: true });

  const copied = fs
    .readdirSync(uiAssetsDirectory)
    .filter((file) => file.endsWith('.woff2') || file.startsWith('OFL-'));

  for (const file of copied) {
    fs.copyFileSync(path.resolve(uiAssetsDirectory, file), path.resolve(assetsDirectory, file));
  }

  // The `OFL-` prefix is a second copy of a convention `packages/ui` owns; a rename
  // there would otherwise republish the fonts with no licence beside them.
  if (!copied.some((file) => file.startsWith('OFL-'))) {
    throw new Error(`wb-sdk:emit-ui-font-assets: no OFL-* licence file found in ${uiAssetsDirectory}`);
  }

  return copied;
}
