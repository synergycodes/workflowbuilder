import { describe, expect, it } from 'vitest';

import { parseOpenTarget } from './parse-open-target';

const RUN = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const WORKFLOW = '0b6e7d9c-4b1a-4c2e-9a3f-2f7a1d8e5c11';

describe('parseOpenTarget', () => {
  it('reads nothing from an address without either id', () => {
    expect(parseOpenTarget('')).toEqual({ notices: [] });
    expect(parseOpenTarget('?tab=log')).toEqual({ notices: [] });
  });

  it('keeps both ids when both are valid', () => {
    expect(parseOpenTarget(`?executionId=${RUN}&workflowId=${WORKFLOW}`)).toEqual({
      executionId: RUN,
      workflowId: WORKFLOW,
      notices: [],
    });
  });

  it('lowercases an uppercase id', () => {
    expect(parseOpenTarget(`?executionId=${RUN.toUpperCase()}`).executionId).toBe(RUN);
  });

  it('trims whitespace around an id', () => {
    expect(parseOpenTarget(`?workflowId=%20${WORKFLOW}%20`).workflowId).toBe(WORKFLOW);
  });

  it('treats an empty value as absent, without a notice', () => {
    expect(parseOpenTarget('?executionId=&workflowId=')).toEqual({ notices: [] });
  });

  it('ignores an id that is not a UUID and says so, keeping the other one', () => {
    const target = parseOpenTarget(`?executionId=not-a-uuid&workflowId=${WORKFLOW}`);

    expect(target.executionId).toBeUndefined();
    expect(target.workflowId).toBe(WORKFLOW);
    expect(target.notices).toHaveLength(1);
    expect(target.notices[0]).toContain('executionId');
  });
});
