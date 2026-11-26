import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { Button } from './button';

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

it('marks the button busy and swallows clicks while loading', () => {
  const onClick = vi.fn();
  act(() =>
    root.render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    ),
  );
  const button = container.querySelector('button')!;

  act(() => button.click());

  expect(button.getAttribute('aria-busy')).toBe('true');
  expect(button.getAttribute('aria-disabled')).toBe('true');
  expect(onClick).not.toHaveBeenCalled();
});

it('clicks through when not loading', () => {
  const onClick = vi.fn();
  act(() => root.render(<Button onClick={onClick}>Save</Button>));
  const button = container.querySelector('button')!;

  act(() => button.click());

  expect(button.hasAttribute('aria-busy')).toBe(false);
  expect(onClick).toHaveBeenCalledOnce();
});
