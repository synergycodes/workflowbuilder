import fs from 'node:fs';
import path from 'node:path';

// When a plugin folder is missing (deleted / excluded from a custom build),
// redirect the import to the SDK's stub module so the app still compiles.
// The stub exports `plugin = () => {}` and a default `{}`, which keeps
// `import { plugin }` / `import * as X` / `X.plugin` call sites happy.
const stubPath = path.resolve(
  import.meta.dirname,
  '../../packages/sdk/src/features/plugins-core/utils/missing-plugin.stub.ts',
);

export function fallbackForMissingPlugin(): {
  name: string;
  resolveId(source: string, importer: string | undefined): Promise<string | null>;
} {
  return {
    name: 'fallback-for-missing-plugin',
    async resolveId(source, importer) {
      // Match relative imports targeting `src/app/plugins/...` from any file
      // under the demo tree — covers `./plugins/foo`, `../plugins/foo`, etc.
      if (!importer || !/\/plugins\//.test(source)) return null;

      const resolved = path.resolve(path.dirname(importer), source);
      const normalized = resolved.replaceAll('\\', '/');
      if (!normalized.includes('/src/app/plugins/')) return null;

      const fileExists = [`${resolved}.ts`, `${resolved}.tsx`].some((candidate) => fs.existsSync(candidate));
      if (fileExists) return null;

      console.log(`Fallback used for missing plugin ${resolved.replace(import.meta.dirname, '')}`);
      return stubPath;
    },
  };
}
