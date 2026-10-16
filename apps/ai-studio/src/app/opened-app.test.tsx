import { Suspense, act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';

import { AppBoundary } from '../components/open-from-url/app-boundary';
import { LoadingScreen } from '../components/open-from-url/loading-screen';
import { deferred } from '../test/deferred';
import { OpenError } from './open-error';
import type { OpenedSource } from './open-from-url';
import { OpenedApp } from './opened-app';

vi.mock('./app', () => ({
  App: ({ opened }: { opened: OpenedSource }) => <p data-opened={opened.kind} />,
}));

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// A render that suspends inside a synchronous act() never retries, so the mount is awaited.
async function mount(opening: Promise<OpenedSource>) {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () =>
    root.render(
      <AppBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <OpenedApp opening={opening} />
        </Suspense>
      </AppBoundary>,
    ),
  );
  return { container, unmount: () => act(() => root.unmount()) };
}

describe('OpenedApp', () => {
  it('shows the loading screen until the link is resolved, then mounts the app on what it opened', async () => {
    const opening = deferred<OpenedSource>();
    const { container, unmount } = await mount(opening.promise);

    expect(container.textContent).toBe('Loading...');
    expect(container.querySelector('[data-opened]')).toBeNull();

    await act(async () => {
      opening.resolve({ kind: 'workflow', workflowId: 'w', name: 'n', diagram: { nodes: [], edges: [] } });
      await opening.promise;
    });

    expect(container.querySelector('[data-opened]')?.getAttribute('data-opened')).toBe('workflow');
    unmount();
  });

  it('a link that will not open ends on the error screen, not a blank page', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const opening = deferred<OpenedSource>();
    const { container, unmount } = await mount(opening.promise);

    await act(async () => {
      opening.reject(new OpenError('run', 'the server answered 404'));
      await opening.promise.catch(() => {});
    });

    expect(container.querySelector('[role="alert"]')?.textContent).toContain('the server answered 404');
    unmount();
  });
});
