import { readFileSync } from 'node:fs';
import path from 'node:path';
import { type CSSProperties, act } from 'react';
import { type Root, createRoot } from 'react-dom/client';

import postcss, { type Rule } from 'postcss';

import { EDGE_RUN_TONES } from '../types';
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
  ['pending', { runState: 'pending' }, 'var(--wb-public-edge-run-status-stroke-default)', undefined, undefined],
  ['running', { runState: 'running' }, 'var(--wb-public-edge-run-status-stroke-active)', DASH_RUNNING, ANIMATION],
  [
    'running + dashed',
    { runState: 'running', lineType: 'dashed' },
    'var(--wb-public-edge-run-status-stroke-active)',
    DASH_RUNNING,
    ANIMATION,
  ],
  ['completed', { runState: 'completed' }, 'var(--wb-public-edge-run-status-stroke-success)', undefined, undefined],
  [
    'completed + hover',
    { runState: 'completed', isHovered: true },
    'var(--wb-public-edge-run-status-stroke-success)',
    undefined,
    undefined,
  ],
  [
    'completed + selected',
    { runState: 'completed', state: 'selected' },
    'var(--wb-public-edge-run-status-stroke-success)',
    undefined,
    undefined,
  ],
  ['outOfRun', { runState: 'outOfRun' }, 'var(--wb-public-edge-run-status-stroke-disabled)', undefined, undefined],
  [
    'outOfRun + dashed',
    { runState: 'outOfRun', lineType: 'dashed' },
    'var(--wb-public-edge-run-status-stroke-disabled)',
    DASH_DASHED,
    undefined,
  ],
  ['dashed without run', { lineType: 'dashed' }, 'var(--wb-public-edge-color)', DASH_DASHED, undefined],
  [
    'pending + hover',
    { runState: 'pending', isHovered: true },
    'var(--wb-public-edge-run-status-stroke-default)',
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

const runStroke = (tone: string) => `var(--wb-public-edge-run-status-stroke-${tone})`;
const toneStroke = (tone: string, fallback: string) =>
  `var(--wb-public-edge-run-status-stroke-${tone}, ${runStroke(fallback)})`;

describe('useEdgeStyle tone', () => {
  it.each([
    ['completed', 'warning', 'success'],
    ['running', 'default', 'active'],
    ['outOfRun', 'success', 'disabled'],
  ] as const)('an explicit tone replaces the colour of %s: %s', (runState, tone, stateTone) => {
    expect(styleFor({ runState, tone }).stroke).toBe(toneStroke(tone, stateTone));
  });

  it('a custom tone falls back to the tone of the run state', () => {
    expect(styleFor({ runState: 'completed', tone: 'error' }).stroke).toBe(toneStroke('error', 'success'));
  });

  it.each(['Error', 'my tone', 'a)b'])('an invalid tone name %j draws the tone of the run state', (tone) => {
    expect(styleFor({ runState: 'completed', tone }).stroke).toBe(runStroke('success'));
  });

  it.each([
    ['default', {}, 'var(--wb-public-edge-color)'],
    ['selected', { state: 'selected' }, 'var(--wb-public-edge-color-select)'],
    ['hover', { isHovered: true }, 'var(--wb-public-edge-color-hover)'],
  ] as const)('a tone without a run state keeps the %s colour', (_, params, stroke) => {
    expect(styleFor({ ...params, tone: 'warning' }).stroke).toBe(stroke);
  });

  it('disabled wins over a tone', () => {
    expect(styleFor({ state: 'disabled', runState: 'completed', tone: 'warning' }).stroke).toBe(
      'var(--wb-public-edge-color-disabled)',
    );
  });

  it('animates only a running edge, whatever its tone', () => {
    const running = styleFor({ runState: 'running', tone: 'success' });
    expect(running.strokeDasharray).toBe(DASH_RUNNING);
    expect(running.animation).toBe(ANIMATION);

    const pending = styleFor({ runState: 'pending', tone: 'active' });
    expect(pending.strokeDasharray).toBeUndefined();
    expect(pending.animation).toBeUndefined();
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

  it('maps every edge colour variable to a DS edge stroke token', () => {
    const colours = [...defaults].filter(([name]) => name.startsWith('--wb-public-edge-color'));

    expect(Object.fromEntries(colours)).toEqual({
      '--wb-public-edge-color': 'var(--wb-ds-canvas-edge-stroke-default)',
      '--wb-public-edge-color-hover': 'var(--wb-ds-canvas-edge-stroke-hover)',
      '--wb-public-edge-color-select': 'var(--wb-ds-canvas-edge-stroke-active)',
      '--wb-public-edge-color-disabled': 'var(--wb-ds-canvas-edge-stroke-disabled)',
    });
  });

  it('defines one run status stroke per built-in tone, each on the DS edge token of the same name', () => {
    const strokes = [...defaults].filter(([name]) => name.startsWith('--wb-public-edge-run-status-stroke-'));

    expect(Object.fromEntries(strokes)).toEqual(
      Object.fromEntries(
        EDGE_RUN_TONES.map((tone) => [
          `--wb-public-edge-run-status-stroke-${tone}`,
          `var(--wb-ds-canvas-edge-stroke-${tone})`,
        ]),
      ),
    );
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

  it('moves the running dash by one period that matches the default dash', () => {
    const offsets: string[] = [];
    stylesheet.walkAtRules('keyframes', (rule) => {
      rule.walkDecls('stroke-dashoffset', (declaration) => {
        offsets.push(declaration.value);
      });
    });
    expect(offsets).toEqual(['calc(-1 * var(--wb-public-edge-dash-running-period))']);

    const dash = defaults.get('--wb-public-edge-dash-running')!.split(/\s+/).map(Number);
    expect(Number(defaults.get('--wb-public-edge-dash-running-period'))).toBe(dash[0]! + dash[1]!);
  });
});
