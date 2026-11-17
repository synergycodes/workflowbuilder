import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { VariableType, VariableTypePrimitive } from '@workflow-builder/types/variables/variables';

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
  compatibleTypes?: VariableType[];
  onSave: (value: string) => void;
};

/** Mirrors VariableDynamicControl: `onChange` feeds `value` back, `onBlur` is the save. */
function Harness({ type, initialValue = '', compatibleTypes, onSave }: HarnessProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <DynamicTypedVariableOrInput
      type={type}
      value={value}
      compatibleTypes={compatibleTypes}
      onChange={setValue}
      onBlur={onSave}
      suggestionGroups={numberVariables}
    />
  );
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

  it('offers the variable picker only for the compatible types', () => {
    const { unmount } = render(<Harness type="string" onSave={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Pick variable' })).toBeNull();
    unmount();

    render(<Harness type="string" compatibleTypes={['string', 'number']} onSave={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Pick variable' })).not.toBeNull();
  });
});
