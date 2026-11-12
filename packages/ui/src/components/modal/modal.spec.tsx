import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import { Modal } from './modal';

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

const titleOf = (style: string) => document.querySelector(`[role="dialog"] .${style}`)?.textContent;

it('uses Title M for a regular modal and Title L for a large one', () => {
  act(() =>
    root.render(
      <Modal open title="Regular" onClose={() => {}}>
        Body
      </Modal>,
    ),
  );
  expect(titleOf('wb-text-title-m-emphasized')).toBe('Regular');

  act(() =>
    root.render(
      <Modal open size="large" title="Large" onClose={() => {}}>
        Body
      </Modal>,
    ),
  );
  expect(titleOf('wb-text-title-l-emphasized')).toBe('Large');
});
