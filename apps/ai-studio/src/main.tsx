import { StrictMode, Suspense } from 'react';
import * as ReactDOM from 'react-dom/client';

import { openFromUrl } from './app/open-from-url';
import { OpenedApp } from './app/opened-app';
import { AppBoundary } from './components/open-from-url/app-boundary';
import { LoadingScreen } from './components/open-from-url/loading-screen';

// Started once, outside render: the editor fixes its diagram at mount, and StrictMode would repeat an effect.
const opening = openFromUrl(globalThis.location.search);

ReactDOM.createRoot(document.querySelector('#root') as HTMLElement).render(
  <StrictMode>
    <AppBoundary>
      <Suspense fallback={<LoadingScreen />}>
        <OpenedApp opening={opening} />
      </Suspense>
    </AppBoundary>
  </StrictMode>,
);
