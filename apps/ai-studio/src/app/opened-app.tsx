import { use } from 'react';

import type { OpenedSource } from '../utils/open-from-url/resolve-diagram-source';
import { App } from './app';

export function OpenedApp({ opening }: { opening: Promise<OpenedSource> }) {
  return <App opened={use(opening)} />;
}
