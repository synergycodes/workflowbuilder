import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VariableTypePrimitive } from '@workflow-builder/types/variables/variables';

import { useStore } from '../../../../store/store';
import '../../../i18n/index';
import type { VariableSuggestionGroup } from '../variable-text/variable-text.types';
import { DynamicTypedVariableOrInput } from './dynamic-typed-variable-or-input';

const numberVariables: VariableSuggestionGroup[] = [
  {
    label: 'Global variables',
    suggestions: [{ id: 'global.retries', display: 'Retries', label: 'Retries', type: 'number' }],
  },
];

type HarnessProps = {
  type: VariableTypePrimitive;
  initialValue?: string;
  suggestionGroupsForType?: VariableSuggestionGroup[];
  onSave: (value: string) => void;
};

/** Mirrors VariableDynamicControl: `onChange` feeds `value` back, `onBlur` is the save. */
function Harness({ type, initialValue = '', suggestionGroupsForType = numberVariables, onSave }: HarnessProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <DynamicTypedVariableOrInput
      type={type}
      value={value}
      onChange={setValue}
      onBlur={onSave}
      suggestionGroupsForType={suggestionGroupsForType}
    />
  );
}

function storeSourceNode() {
  useStore.setState({
    nodes: [{ id: 'decision', position: { x: 0, y: 0 }, data: { properties: { label: 'Recurring Customer?' } } }],
  } as never);
}

describe('DynamicTypedVariableOrInput', () => {
  it('clears the value when switching to a variable and restores the typed value when switching back', () => {
    const onSave = vi.fn();
    render(<Harness type="number" initialValue="7" onSave={onSave} />);

    fireEvent.click(screen.getByRole('button', { name: 'Pick variable' }));

    expect(onSave).toHaveBeenLastCalledWith('');
    expect(screen.getByPlaceholderText('Click to pick variable')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Type value' }));

    expect(onSave).toHaveBeenLastCalledWith('7');
    expect((screen.getByPlaceholderText('Type a numeric value') as HTMLInputElement).value).toBe('7');
  });

  it('offers the variable picker only when the caller passes suggestions for the type', () => {
    const { unmount } = render(<Harness type="string" suggestionGroupsForType={[]} onSave={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Pick variable' })).toBeNull();
    unmount();

    render(<Harness type="string" onSave={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Pick variable' })).not.toBeNull();
  });

  describe('a stored node variable the field no longer offers', () => {
    const missingReference = '{{nodes.decision.branchIndex}}';
    const allTypes: VariableTypePrimitive[] = ['string', 'number', 'boolean', 'date', 'datetime', 'time'];

    afterEach(() => {
      useStore.setState({ nodes: [] });
    });

    it.each(allTypes)('shows it as a missing variable in a %s field with no variable left', (type) => {
      storeSourceNode();
      render(<Harness type={type} initialValue={missingReference} suggestionGroupsForType={[]} onSave={vi.fn()} />);

      const field = screen.getByPlaceholderText('Click to pick variable') as HTMLInputElement;

      expect(field.value).toBe('{{ Recurring Customer? · Missing variable · branchIndex }}');
      expect(screen.getByRole('button', { name: 'Type value' })).not.toBeNull();
    });

    it('shows it as a missing node when the source node is gone', () => {
      render(<Harness type="number" initialValue={missingReference} suggestionGroupsForType={[]} onSave={vi.fn()} />);

      const field = screen.getByPlaceholderText('Click to pick variable') as HTMLInputElement;

      expect(field.value).toBe('{{ Missing node (deci...) · branchIndex }}');
    });

    it('lets the user leave it by switching back to typing a value', () => {
      storeSourceNode();
      const onSave = vi.fn();
      render(<Harness type="number" initialValue={missingReference} suggestionGroupsForType={[]} onSave={onSave} />);

      fireEvent.click(screen.getByRole('button', { name: 'Type value' }));

      expect(onSave).toHaveBeenLastCalledWith('');
      expect((screen.getByPlaceholderText('Type a numeric value') as HTMLInputElement).value).toBe('');
    });
  });
});
