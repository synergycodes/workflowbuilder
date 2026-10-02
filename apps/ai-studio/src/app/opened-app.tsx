import { use } from 'react';

import { App } from './app';
import type { OpenedSource } from './open-from-url';

export function OpenedApp({ opening }: { opening: Promise<OpenedSource> }) {
  return <App opened={use(opening)} />;
}
