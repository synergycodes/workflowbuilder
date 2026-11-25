import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { TextArea } from '../text-area/text-area';
import { Input } from './input';

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

it.each([
  ['Input', 'input', <Input key="input" label="Name" required />],
  ['TextArea', 'textarea', <TextArea key="text-area" label="Name" required />],
])('%s with required marks the label and the native control', (_name, selector, element) => {
  act(() => root.render(element));

  expect(container.querySelector('label')?.textContent).toBe('Name*');
  expect(container.querySelector<HTMLInputElement>(selector)?.required).toBe(true);
});

it.each([
  ['Input', 'input', <Input key="input" label="Name" />],
  ['TextArea', 'textarea', <TextArea key="text-area" label="Name" />],
])('%s without required leaves both unmarked', (_name, selector, element) => {
  act(() => root.render(element));

  expect(container.querySelector('label')?.textContent).toBe('Name');
  expect(container.querySelector<HTMLInputElement>(selector)?.required).toBe(false);
});
