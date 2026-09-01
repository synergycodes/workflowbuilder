import { type ReactElement, act } from 'react';
import { createRoot } from 'react-dom/client';

import { Input } from '../../../components/input/input';
import { TextArea } from '../../../components/text-area/text-area';
import { Field } from './field';

declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Field', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  function renderField(label?: ReactElement | string | boolean, helperText?: ReactElement | string | boolean) {
    act(() => {
      root.render(
        <Field label={label} helperText={helperText} state="default">
          {({ controlId, describedBy }) => <input id={controlId} aria-describedby={describedBy} />}
        </Field>,
      );
    });
  }

  it('preserves the control when composition content changes', () => {
    renderField();
    const input = container.querySelector('input')!;
    input.focus();

    renderField('Label', 'Helper');

    expect(container.querySelector('input')).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(container.querySelector('label')?.htmlFor).toBe(input.id);
  });

  it('does not render or reference boolean label and helper values', () => {
    renderField(true, false);
    const input = container.querySelector('input')!;

    expect(container.querySelector('label')).toBeNull();
    expect(container.querySelector('span')).toBeNull();
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });
});

describe.each([
  ['Input', <Input key="input" />, 'input'],
  ['TextArea', <TextArea key="text-area" />, 'textarea'],
] as const)('%s pointer guard', (_name, control, selector) => {
  it('ignores interactive ancestors outside the field control', () => {
    const host = document.createElement('div');
    host.tabIndex = 0;
    document.body.append(host);
    const root = createRoot(host);

    act(() => root.render(control));
    const nativeControl = host.querySelector(selector)! as HTMLInputElement | HTMLTextAreaElement;
    const controlRoot = nativeControl.parentElement!;

    act(() => controlRoot.dispatchEvent(new Event('pointerdown', { bubbles: true })));

    expect(document.activeElement).toBe(nativeControl);

    act(() => root.unmount());
    host.remove();
  });
});
