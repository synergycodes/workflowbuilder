import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { WorkflowBuilderEdge } from '../../../../node/node-data';
import { resetWorkflowStore, useStore } from '../../../../store/store';
import { trackFutureChange } from '../../../changes-tracker/stores/use-changes-tracker-store';
import '../../../i18n/index';
import { EdgeProperties } from './edge-properties';

vi.mock('../../../changes-tracker/stores/use-changes-tracker-store', () => ({
  trackFutureChange: vi.fn(),
}));

const edge = { id: 'e1', source: 'a', target: 'b', data: { label: 'Old' } } as WorkflowBuilderEdge;

describe('EdgeProperties label', () => {
  beforeEach(() => {
    resetWorkflowStore();
    useStore.setState({ edges: [edge] });
    vi.mocked(trackFutureChange).mockClear();
  });

  it('tracks one change per focus session, so undo takes the whole edit back', () => {
    render(<EdgeProperties edge={edge} />);
    const input = screen.getByRole('textbox');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'A' } });
    fireEvent.change(input, { target: { value: 'Ap' } });
    fireEvent.change(input, { target: { value: 'App' } });

    expect(trackFutureChange).toHaveBeenCalledTimes(1);
    expect(useStore.getState().edges[0].data?.label).toBe('App');

    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: 'Appr' } });

    expect(trackFutureChange).toHaveBeenCalledTimes(2);
  });
});
