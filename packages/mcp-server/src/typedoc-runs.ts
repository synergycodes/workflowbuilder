export interface TypedocRun {
  readonly packageName: 'sdk' | 'ui' | 'temporal';
  readonly entryPoints: readonly string[];
  readonly tsconfig: string;
}

export const TYPEDOC_RUNS: readonly TypedocRun[] = [
  { packageName: 'sdk', entryPoints: ['packages/sdk/src/index.ts'], tsconfig: 'packages/sdk/tsconfig.json' },
  { packageName: 'ui', entryPoints: ['packages/ui/src/index.ts'], tsconfig: 'packages/ui/tsconfig.json' },
  {
    packageName: 'temporal',
    entryPoints: [
      'packages/temporal/src/index.ts',
      'packages/temporal/src/client/index.ts',
      'packages/temporal/src/workflow/index.ts',
    ],
    tsconfig: 'packages/temporal/tsconfig.json',
  },
];

export const TYPEDOC_FLAGS = [
  '--excludeExternals',
  '--excludePrivate',
  '--excludeProtected',
  '--excludeInternal',
  '--skipErrorChecking',
  '--logLevel',
  'Error',
] as const;
