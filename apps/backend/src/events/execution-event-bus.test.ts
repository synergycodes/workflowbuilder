import { expect, test, vi } from 'vitest';

import { subscribe } from './execution-event-bus';

const listener = vi.hoisted(() => ({ notify: (() => {}) as (executionId: string) => void }));

vi.mock('../env', () => ({ env: { DATABASE_URL: 'postgresql://unused' } }));
vi.mock('postgres', () => ({
  default: () => ({
    listen: async (_channel: string, onNotify: (executionId: string) => void) => {
      listener.notify = onNotify;
    },
  }),
}));

test('a late second unsubscribe of a closed stream leaves a newer stream on the same run subscribed', async () => {
  const unsubscribeClosed = await subscribe('run-1', () => {});
  unsubscribeClosed();
  const reopened = vi.fn();
  await subscribe('run-1', reopened);

  unsubscribeClosed();
  listener.notify('run-1');

  expect(reopened).toHaveBeenCalledWith('run-1');
});
