import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type CSSProperties, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss, { type Rule } from 'postcss';

import { type UseEdgeStyleParams, useEdgeStyle } from './use-edge-styles';

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

function styleFor(params: UseEdgeStyleParams) {
  let result: CSSProperties = {};
  function Probe() {
    result = useEdgeStyle(params);
    return null;
  }
  act(() => root.render(<Probe />));
  return result;
}

const DASH_RUNNING = 'var(--wb-public-edge-dash-running)';
const DASH_DASHED = 'var(--wb-public-edge-dash-dashed)';
const ANIMATION = 'var(--wb-public-edge-animation-running)';

const ROWS: [string, UseEdgeStyleParams, string, string | undefined, string | undefined][] = [
  ['default', {}, 'var(--wb-public-edge-color)', undefined, undefined],
  ['hover', { isHovered: true }, 'var(--wb-public-edge-color-hover)', undefined, undefined],
  ['selected', { state: 'selected' }, 'var(--wb-public-edge-color-select)', undefined, undefined],
  [
    'selected + hover',
    { state: 'selected', isHovered: true },
    'var(--wb-public-edge-color-select)',
    undefined,
    undefined,
  ],
  ['disabled', { state: 'disabled' }, 'var(--wb-public-edge-color-disabled)', undefined, undefined],
  [
    'disabled + running',
    { state: 'disabled', runState: 'running' },
    'var(--wb-public-edge-color-disabled)',
    DASH_RUNNING,
    ANIMATION,
  ],
  ['temporary', { state: 'temporary' }, 'var(--wb-public-edge-color-select)', undefined, undefined],
  ['pending', { runState: 'pending' }, 'var(--wb-public-edge-color-pending)', undefined, undefined],
  ['running', { runState: 'running' }, 'var(--wb-public-edge-color-running)', DASH_RUNNING, ANIMATION],
  [
    'running + dashed',
    { runState: 'running', lineType: 'dashed' },
    'var(--wb-public-edge-color-running)',
    DASH_RUNNING,
    ANIMATION,
  ],
  ['completed', { runState: 'completed' }, 'var(--wb-public-edge-color-completed)', undefined, undefined],
  [
    'completed + hover',
    { runState: 'completed', isHovered: true },
    'var(--wb-public-edge-color-completed)',
    undefined,
    undefined,
  ],
  [
    'completed + selected',
    { runState: 'completed', state: 'selected' },
    'var(--wb-public-edge-color-completed)',
    undefined,
    undefined,
  ],
  ['outOfRun', { runState: 'outOfRun' }, 'var(--wb-public-edge-color-out-of-run)', undefined, undefined],
  [
    'outOfRun + dashed',
    { runState: 'outOfRun', lineType: 'dashed' },
    'var(--wb-public-edge-color-out-of-run)',
    DASH_DASHED,
    undefined,
  ],
  ['dashed without run', { lineType: 'dashed' }, 'var(--wb-public-edge-color)', DASH_DASHED, undefined],
  [
    'pending + hover',
    { runState: 'pending', isHovered: true },
    'var(--wb-public-edge-color-pending)',
    undefined,
    undefined,
  ],
];

describe('useEdgeStyle', () => {
  it.each(ROWS)('%s', (_, params, stroke, strokeDasharray, animation) => {
    const style = styleFor(params);

    expect(style.stroke).toBe(stroke);
    expect(style.strokeDasharray).toBe(strokeDasharray);
    expect(style.animation).toBe(animation);
  });

  it.each(ROWS)('keeps one stroke width when %s', (_, params) => {
    expect(styleFor(params).strokeWidth).toBe('var(--wb-public-edge-stroke-width)');
  });

  it('drops the colour transition on hover and keeps it once a run state is set', () => {
    expect(styleFor({ isHovered: true }).transition).toBe('none');
    expect(styleFor({}).transition).toBe('stroke var(--wb-public-transition)');
    expect(styleFor({ runState: 'completed', isHovered: true }).transition).toBe('stroke var(--wb-public-transition)');
  });
});

describe('use-edge-styles.css', () => {
  const file = path.join(import.meta.dirname, 'use-edge-styles.css');
  const stylesheet = postcss.parse(readFileSync(file, 'utf8'), { from: file });

  function rootDeclarations(inReducedMotion: boolean) {
    const found = new Map<string, string>();
    stylesheet.walkRules(':root', (rule: Rule) => {
      const reduced = rule.parent?.type === 'atrule' && rule.parent.params.includes('prefers-reduced-motion');
      if (reduced !== inReducedMotion) return;
      rule.walkDecls((declaration) => {
        found.set(declaration.prop, declaration.value);
      });
    });
    return found;
  }

  const defaults = rootDeclarations(false);

  it.each([
    ['--wb-public-edge-color', 'var(--wb-ds-canvas-edge-stroke-default)'],
    ['--wb-public-edge-color-hover', 'var(--wb-ds-canvas-edge-stroke-hover)'],
    ['--wb-public-edge-color-select', 'var(--wb-ds-canvas-edge-stroke-active)'],
    ['--wb-public-edge-color-disabled', 'var(--wb-ds-canvas-edge-stroke-disabled)'],
    ['--wb-public-edge-color-pending', 'var(--wb-ds-canvas-edge-stroke-default)'],
    ['--wb-public-edge-color-running', 'var(--wb-ds-canvas-edge-stroke-active)'],
    ['--wb-public-edge-color-completed', 'var(--wb-ds-canvas-edge-stroke-success)'],
    ['--wb-public-edge-color-out-of-run', 'var(--wb-ds-canvas-edge-stroke-disabled)'],
  ])('maps %s to a DS edge stroke token', (variable, value) => {
    expect(defaults.get(variable)).toBe(value);
  });

  it('defines no edge colour variable outside the DS edge stroke tokens', () => {
    const colours = [...defaults].filter(([name]) => name.startsWith('--wb-public-edge-color'));
    expect(colours).toHaveLength(8);
    for (const [, value] of colours) expect(value).toMatch(/^var\(--wb-ds-canvas-edge-stroke-[a-z]+\)$/);
  });

  it('draws every edge 1 px through the DS regular stroke', () => {
    expect(defaults.get('--wb-public-edge-stroke-width')).toBe('var(--wb-ds-canvas-edge-stroke-regular)');
    expect([...defaults.keys()].filter((name) => name.includes('stroke-width'))).toEqual([
      '--wb-public-edge-stroke-width',
    ]);
  });

  it('stops the running dash under reduced motion', () => {
    expect(defaults.get('--wb-public-edge-animation-running')).toBe('wb-edge-dash-flow 0.5s linear infinite');
    expect(rootDeclarations(true).get('--wb-public-edge-animation-running')).toBe('none');
  });

  it('defines the dash-flow keyframes the running animation names', () => {
    const keyframes: string[] = [];
    stylesheet.walkAtRules('keyframes', (rule) => {
      keyframes.push(rule.params);
    });
    expect(keyframes).toEqual(['wb-edge-dash-flow']);
  });
});
