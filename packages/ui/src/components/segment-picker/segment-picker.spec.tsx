import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { SegmentPicker } from './segment-picker';

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

it('preserves element children inside the label', () => {
  act(() => {
    root.render(
      <SegmentPicker defaultValue="a">
        <SegmentPicker.Item value="a">First</SegmentPicker.Item>
        <SegmentPicker.Item value="b">
          Count <strong>important</strong> items
        </SegmentPicker.Item>
      </SegmentPicker>,
    );
  });

  expect(container.querySelector('strong')?.textContent).toBe('important');
  expect(container.querySelectorAll('button')[1]?.textContent).toBe('Count important items');
});

it('keeps selection internal while composing the consumer click handler', () => {
  const onChange = vi.fn();
  const onSelectedClick = vi.fn();
  const onNextClick = vi.fn();

  act(() => {
    root.render(
      <SegmentPicker defaultValue="a" onChange={onChange}>
        <SegmentPicker.Item value="a" onClick={onSelectedClick}>
          First
        </SegmentPicker.Item>
        <SegmentPicker.Item value="b" onClick={onNextClick}>
          Second
        </SegmentPicker.Item>
      </SegmentPicker>,
    );
  });

  const buttons = container.querySelectorAll('button');
  act(() => buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

  expect(onSelectedClick).toHaveBeenCalledOnce();
  expect(onChange).not.toHaveBeenCalled();

  act(() => buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true })));

  expect(onNextClick).toHaveBeenCalledOnce();
  expect(onChange).toHaveBeenCalledOnce();
  expect(onChange.mock.calls[0]?.[1]).toBe('b');
});

it('marks the container and items with the secondary variant', () => {
  act(() => {
    root.render(
      <SegmentPicker defaultValue="a" size="extra-small" variant="secondary">
        <SegmentPicker.Item value="a">First</SegmentPicker.Item>
        <SegmentPicker.Item value="b">Second</SegmentPicker.Item>
      </SegmentPicker>,
    );
  });

  const picker = container.firstElementChild;
  const buttons = container.querySelectorAll('button');

  expect(picker?.className).toMatch(/secondary/);
  expect(buttons[0]?.className).toMatch(/secondary/);
  expect(buttons[1]?.className).toMatch(/secondary/);
  expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true');
});

it('renders the primary variant by default', () => {
  act(() => {
    root.render(
      <SegmentPicker defaultValue="a">
        <SegmentPicker.Item value="a">First</SegmentPicker.Item>
        <SegmentPicker.Item value="b">Second</SegmentPicker.Item>
      </SegmentPicker>,
    );
  });

  expect(container.firstElementChild?.className).not.toMatch(/secondary/);
  expect(container.querySelector('button')?.className).not.toMatch(/secondary/);
});
