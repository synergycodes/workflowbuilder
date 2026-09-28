import { aiStudioNodeTypes } from './node-types';

export const knownNodeTypes: ReadonlySet<string> = new Set(
  aiStudioNodeTypes.flatMap((entry) => ('groupItems' in entry ? entry.groupItems : [entry])).map((item) => item.type),
);
