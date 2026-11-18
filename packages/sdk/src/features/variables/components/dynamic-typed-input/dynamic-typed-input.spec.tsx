import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { VariableTypePrimitive } from '@workflow-builder/types/variables/variables';

import { DynamicTypedInput } from './dynamic-typed-input';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type HarnessProps = {
  type: VariableTypePrimitive;
  initialValue?: string;
  timeForRawDates?: '00:00' | '23:59';
  onSave: (value: string) => void;
};

/** Mirrors VariableDynamicControl: `onChange` feeds `value` back, `onBlur` is the save. */
function Harness({ type, initialValue = '', timeForRawDates, onSave }: HarnessProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <DynamicTypedInput
      type={type}
      value={value}
      onChange={setValue}
      onBlur={onSave}
      timeForRawDates={timeForRawDates}
      suggestionGroups={[]}
    />
  );
}

function renderHarness(props: Omit<HarnessProps, 'onSave'>) {
  const onSave = vi.fn();
  const utils = render(<Harness {...props} onSave={onSave} />);
  const input = utils.getByPlaceholderText('HH:mm') as HTMLInputElement;

  return { ...utils, input, onSave };
}

describe('DynamicTypedInput time', () => {
  it('saves a full HH:mm as typed and keeps focus', () => {
    const { input, onSave } = renderHarness({ type: 'time' });

    input.focus();
    fireEvent.change(input, { target: { value: '12:3' } });

    expect(onSave).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '12:30' } });

    expect(onSave).toHaveBeenCalledWith('12:30:00+00:00');
    expect(input.value).toBe('12:30');
    expect(document.activeElement).toBe(input);
  });

  it('shows the saved clock and clears it when the field is emptied', () => {
    const { input, onSave } = renderHarness({ type: 'time', initialValue: '12:30:00+00:00' });

    expect(input.value).toBe('12:30');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith('');
    expect(input.value).toBe('');
  });

  it('clears a saved clock when the field is left with a partial time', () => {
    const { input, onSave } = renderHarness({ type: 'time', initialValue: '12:30:00+00:00' });

    fireEvent.change(input, { target: { value: '12:3' } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith('');
    expect(input.value).toBe('');
  });

  it('does not save when a partial time is left in an empty field', () => {
    const { input, onSave } = renderHarness({ type: 'time' });

    fireEvent.change(input, { target: { value: '12:3' } });
    fireEvent.blur(input);

    expect(onSave).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('shows a value changed from outside in the same element', () => {
    const onChange = vi.fn();
    const { getByPlaceholderText, rerender } = render(
      <DynamicTypedInput type="time" value="12:30:00+00:00" onChange={onChange} suggestionGroups={[]} />,
    );
    const input = getByPlaceholderText('HH:mm') as HTMLInputElement;

    rerender(<DynamicTypedInput type="time" value="08:00:00+00:00" onChange={onChange} suggestionGroups={[]} />);

    expect(getByPlaceholderText('HH:mm')).toBe(input);
    expect(input.value).toBe('08:00');
  });
});

describe('DynamicTypedInput datetime', () => {
  it('saves the day with the typed clock', () => {
    const { input, onSave } = renderHarness({ type: 'datetime', initialValue: '2024-01-15T12:30' });

    expect(input.value).toBe('12:30');

    fireEvent.change(input, { target: { value: '09:15' } });

    expect(onSave).toHaveBeenCalledWith('2024-01-15T09:15');
    expect(input.value).toBe('09:15');
  });

  it('snaps an emptied clock to the raw-date time', () => {
    const { input, onSave } = renderHarness({
      type: 'datetime',
      initialValue: '2024-01-15T12:30',
      timeForRawDates: '23:59',
    });

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(onSave).toHaveBeenCalledWith('2024-01-15T23:59');
    expect(input.value).toBe('23:59');
  });

  it('keeps the clock editable until a day is picked', () => {
    const { input } = renderHarness({ type: 'datetime' });

    expect(input.disabled).toBe(true);
  });
});
