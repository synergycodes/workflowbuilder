import { describe, expect, it } from 'vitest';

import type { ExecutionStatus } from '@workflow-builder/types/workflow-execution/execution-events';

import { statusesNotReplacedBy } from './database';

const TERMINAL = ['completed', 'incomplete', 'failed', 'cancelled'];

describe('statusesNotReplacedBy', () => {
  it.each<ExecutionStatus>(['completed', 'incomplete', 'failed', 'cancelled'])(
    'lets a terminal %s replace cancelling, never another terminal status',
    (status) => {
      expect(statusesNotReplacedBy(status)).toEqual(TERMINAL);
    },
  );

  it.each<ExecutionStatus>(['waiting', 'running', 'pending', 'cancelling'])(
    'keeps cancelling and every terminal status out of reach of %s',
    (status) => {
      expect(statusesNotReplacedBy(status)).toEqual([...TERMINAL, 'cancelling']);
    },
  );
});
