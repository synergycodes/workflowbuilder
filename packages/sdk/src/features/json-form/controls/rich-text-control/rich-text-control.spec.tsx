import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { RichTextElement } from '../../../../types/labels';
import { richTextRenderer } from './rich-text-control';

const RichText = richTextRenderer.renderer as unknown as React.ComponentType<{ uischema: RichTextElement }>;

function renderHtml(text: string) {
  const { container } = render(<RichText uischema={{ type: 'RichText', text }} />);
  return container.querySelector('span')!.innerHTML;
}

describe('RichText renderer', () => {
  it('strips script tags and event handlers', () => {
    const html = renderHtml(
      '<script>alert(1)</script><img src="x" onerror="alert(1)"><b onclick="alert(1)" data-x="1" aria-label="y">bold</b>',
    );

    expect(html).toBe('<b>bold</b>');
  });

  it('strips javascript: links', () => {
    expect(renderHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
  });

  it('keeps inline formatting and http links', () => {
    const text = '<strong>Note:</strong> see <a href="https://example.com" target="_blank">docs</a>';

    expect(renderHtml(text)).toBe(text);
  });
});
