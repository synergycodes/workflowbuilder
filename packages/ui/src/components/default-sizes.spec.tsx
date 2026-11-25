import { type ReactElement, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { Avatar } from './avatar/avatar';
import { Checkbox } from './checkbox/checkbox';
import { DatePicker } from './date-picker/date-picker';
import { EdgeLabel } from './edge/edge-label/edge-label';
import { Radio } from './radio-button/radio';
import { SegmentPicker } from './segment-picker/segment-picker';
import { Select } from './select/select';
import { Switch } from './switch/switch';

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

function classesOf(element: ReactElement, selector: string) {
  act(() => root.render(element));

  return container
    .querySelector(selector)!
    .className.split(/\s+/)
    .map((name) => name.replace(/^_(.+)_[^_]+$/, '$1'));
}

it.each([
  ['Checkbox', <Checkbox key="checkbox" />, 'input', 'm'],
  ['Radio', <Radio key="radio" name="r" value="a" />, 'input', 'm'],
  ['Switch', <Switch key="switch" />, '[role="switch"]', 'm'],
  ['Select', <Select key="select" items={[]} />, 'button', 'm'],
  ['DatePicker', <DatePicker key="date-picker" />, 'button', 'm'],
  ['EdgeLabel', <EdgeLabel key="edge-label">Label</EdgeLabel>, 'div', 'm'],
  ['Avatar', <Avatar key="avatar" username="Ada" />, 'div', 'xl'],
])('%s defaults to the %s size class', (_name, element, selector, expected) => {
  expect(classesOf(element, selector)).toContain(expected);
});

it('passes its size to the segment buttons unchanged', () => {
  const classes = classesOf(
    <SegmentPicker defaultValue="a" size="xxs">
      <SegmentPicker.Item value="a">First</SegmentPicker.Item>
      <SegmentPicker.Item value="b">Second</SegmentPicker.Item>
    </SegmentPicker>,
    'button',
  );

  expect(classes).toContain('xxs');
});
