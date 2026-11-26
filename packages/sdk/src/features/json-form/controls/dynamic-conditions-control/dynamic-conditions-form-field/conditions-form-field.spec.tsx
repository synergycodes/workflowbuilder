import { act, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import type { DynamicCondition } from '../../../../../types/controls';
import '../../../../i18n/index';
import { ConditionsFormField } from './conditions-form-field';

vi.mock('../../../../../icon/icon', () => ({ Icon: () => null }));
vi.mock('../../../../../features/variables/components/variable-text/variable-text', () => ({
  VariableText: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label="left operand" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));
vi.mock(
  '../../../../../features/variables/components/dynamic-typed-variable-or-input/dynamic-typed-variable-or-input',
  () => ({ DynamicTypedVariableOrInput: () => null }),
);

function EditableCondition({ initial }: { initial: Partial<DynamicCondition> }) {
  const [condition, setCondition] = useState(initial);
  return (
    <>
      <ConditionsFormField condition={condition} onChange={setCondition} onRemove={() => {}} suggestionGroups={[]} />
      <output>{String(condition.comparisonOperator)}</output>
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('keeps the equality operator it sets when the left operand changes type', async () => {
  const view = render(<EditableCondition initial={{ x: 'text', comparisonOperator: 'isContaining', y: 'value' }} />);
  // Base UI compares the selected operator against its options only once the trigger was focused.
  act(() => view.getByRole('combobox').focus());
  await act(() => vi.advanceTimersByTimeAsync(100));

  fireEvent.change(view.getByLabelText('left operand'), { target: { value: '5' } });
  await act(() => vi.advanceTimersByTimeAsync(100));

  expect(view.container.querySelector('output')!.textContent).toBe('isEqual');
});
