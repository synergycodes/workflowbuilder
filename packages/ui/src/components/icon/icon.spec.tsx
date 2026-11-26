import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Icon } from './icon';

function renderSvg(element: React.ReactElement): SVGSVGElement {
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(element);
  const svg = container.querySelector('svg');
  if (!svg) throw new Error('Icon rendered no <svg>');
  return svg;
}

describe('Icon', () => {
  it('uses the view box of the icon data', () => {
    const svg = renderSvg(<Icon icon={{ body: '<path d="M0 0h256v256z"/>', width: 256, height: 256 }} />);

    expect(svg.getAttribute('viewBox')).toBe('0 0 256 256');
    expect(svg.innerHTML).toBe('<path d="M0 0h256v256z"></path>');
  });

  it('falls back to the Iconify 16 unit view box when the data leaves the size out', () => {
    const svg = renderSvg(<Icon icon={{ body: '<path d="M0 0h16v16z"/>' }} />);

    expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
  });

  it('sizes to the surrounding font and paints with the text color unless the caller overrides it', () => {
    const svg = renderSvg(<Icon icon={{ body: '' }} />);
    const overridden = renderSvg(<Icon icon={{ body: '' }} width={24} fill="red" />);

    expect([svg.getAttribute('width'), svg.getAttribute('fill')]).toEqual(['1em', 'currentColor']);
    expect([overridden.getAttribute('width'), overridden.getAttribute('fill')]).toEqual(['24', 'red']);
  });
});
