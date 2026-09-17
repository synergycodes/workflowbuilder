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

  return copied;
}
