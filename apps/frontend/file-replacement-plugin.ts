/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'node:path';

export function replaceFiles(replacements: FileReplacement[]): {
  name: string;
  enforce: 'pre' | 'post' | undefined;
  resolveId(source: any, importer: any, options: any): Promise<string | null>;
} | null {
  if (!replacements?.length) {
    return null;
  }

  return {
    name: 'rollup-plugin-replace-files',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      // @ts-expect-error
      const resolved = await this.resolve(source, importer, {
        ...options,
      });

      const foundReplace = replacements.find((replacement) => resolved?.id?.endsWith(replacement.replace));

      if (foundReplace) {
        console.info(`Replace "${foundReplace.replace}" with "${foundReplace.with}"`);

        try {
          // return new file content
          return path.resolve(foundReplace.with);
        } catch (error) {
          console.error(error);
          return null;
        }
      }
      return null;
    },
  };
}

export type FileReplacement = {
  replace: string;
  with: string;
};
