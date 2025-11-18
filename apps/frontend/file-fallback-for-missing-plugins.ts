import path from 'node:path';
import fs from 'node:fs';

export function fallbackForMissingPlugin(): {
  name: string;
  resolveId(source: string): Promise<string | null>;
} | null {
  return {
    name: 'fallback-for-missing-plugin',
    async resolveId(source) {
      const match = source.match(/app\/plugins\/(.*)?$/);

      if (match) {
        const realPath = path.resolve(import.meta.dirname, 'src', source);

        const doesFileExist = [`${realPath}.ts`, `${realPath}.tsx`].some((path) => fs.existsSync(path));

        if (doesFileExist) {
          // Skip stub and return real
          return null;
        } else {
          console.log(`Fallback used for missing plugin ${realPath.replace(import.meta.dirname, '')}`);
          return path.resolve(import.meta.dirname, 'src/app/features/plugins-core/utils/missing-plugin.stub.ts');
        }
      }
      return null;
    },
  };
}
