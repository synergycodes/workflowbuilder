import type { WorkflowBuilderLoadContext } from '@workflowbuilder/sdk';
import { beforeEach, describe, expect, it } from 'vitest';

import { onLinkLoad, onLocalLoad } from './open-on-load';
import { markWelcomeSeen, useTemplatePickerStore } from './template-picker-store';

const load = (overrides: Partial<WorkflowBuilderLoadContext> = {}) =>
  ({ isEmpty: false, loadFailed: false, ...overrides }) as WorkflowBuilderLoadContext;

const picker = () => useTemplatePickerStore.getState();

describe('onLoad', () => {
  beforeEach(() => {
    localStorage.clear();
    useTemplatePickerStore.setState({ open: false, variant: 'welcome' });
  });

  it('opens Welcome on the first open of the local editor', () => {
    onLocalLoad(load());

    expect(picker()).toEqual({ open: true, variant: 'welcome' });
  });

  it('opens nothing on later opens, even over an empty canvas', () => {
    markWelcomeSeen();

    onLocalLoad(load({ isEmpty: true }));

    expect(picker().open).toBe(false);
  });

  it('opens nothing for a run or workflow link, even over an empty draft', () => {
    onLinkLoad();

    expect(picker().open).toBe(false);
  });

  it('opens nothing after a failed load', () => {
    onLocalLoad(load({ loadFailed: true }));

    expect(picker().open).toBe(false);
  });
});
