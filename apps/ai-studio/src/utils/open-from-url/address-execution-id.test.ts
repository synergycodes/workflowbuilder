import { afterEach, describe, expect, it, vi } from 'vitest';

import { leaveRunView, syncExecutionIdToAddress, withExecutionId } from './address-execution-id';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const NEXT_RUN = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';
const WORKFLOW = '11111111-2222-4333-8444-555555555555';

describe('withExecutionId', () => {
  it('adds the run to an address without one', () => {
    expect(withExecutionId('https://studio.test/', RUN)).toBe(`https://studio.test/?executionId=${RUN}`);
  });

  it('replaces the run and keeps the workflow and any other parameter', () => {
    expect(withExecutionId(`https://studio.test/?workflowId=${WORKFLOW}&executionId=${RUN}&tab=log`, NEXT_RUN)).toBe(
      `https://studio.test/?workflowId=${WORKFLOW}&executionId=${NEXT_RUN}&tab=log`,
    );
  });

  it('removes the run and keeps the workflow', () => {
    expect(withExecutionId(`https://studio.test/?workflowId=${WORKFLOW}&executionId=${RUN}`, null)).toBe(
      `https://studio.test/?workflowId=${WORKFLOW}`,
    );
  });

  it('leaves an address unchanged when it already says the same', () => {
    const href = `https://studio.test/?executionId=${RUN}`;

    expect(withExecutionId(href, RUN)).toBe(href);
    expect(withExecutionId('https://studio.test/', null)).toBe('https://studio.test/');
  });
});

describe('syncExecutionIdToAddress', () => {
  afterEach(() => {
    globalThis.history.replaceState(null, '', '/');
    vi.restoreAllMocks();
  });

  it('rewrites the address in place, without a new history entry', () => {
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');
    const pushState = vi.spyOn(globalThis.history, 'pushState');

    syncExecutionIdToAddress(RUN);

    expect(globalThis.location.search).toBe(`?executionId=${RUN}`);
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(pushState).not.toHaveBeenCalled();
  });

  it('does not touch history when the address already names the run', () => {
    globalThis.history.replaceState(null, '', `/?executionId=${RUN}`);
    const replaceState = vi.spyOn(globalThis.history, 'replaceState');

    syncExecutionIdToAddress(RUN);

    expect(replaceState).not.toHaveBeenCalled();
  });
});

describe('leaveRunView', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // Assigning the current URL again loads nothing when it carries a fragment.
  it('drops the run from the address and reloads, a fragment included', () => {
    const replaceState = vi.spyOn(globalThis.history, 'replaceState').mockImplementation(() => {});
    const reload = vi.fn();
    vi.stubGlobal('location', { href: `https://studio.test/?workflowId=${WORKFLOW}&executionId=${RUN}#log`, reload });

    leaveRunView();

    expect(replaceState).toHaveBeenCalledWith(null, '', `https://studio.test/?workflowId=${WORKFLOW}#log`);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
