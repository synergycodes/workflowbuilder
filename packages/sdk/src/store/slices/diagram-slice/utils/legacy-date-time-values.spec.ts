import { describe, expect, it, vi } from 'vitest';

import type { VariableDefinition, VariablesIndex } from '../../../../features/variables/types';
import {
  findLegacyDateTimeValues,
  formatLegacyDateTimeWarning,
  warnIfLegacyDateTimeValues,
} from './legacy-date-time-values';

const LEGACY = '2024-01-14T23:00:00.000Z';
const NODE_ID = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const SLUG = '(migration: zone-less-date-time)';

function condition(y: string, x = '{{nodes.a.status}}') {
  return { x, comparisonOperator: '==', y, logicalOperator: 'and' };
}

function nodeWith(properties: Record<string, unknown>, id = NODE_ID) {
  return { id, data: { type: 'decision', icon: 'Plus', properties } };
}

function variables(type: VariableDefinition['type'], defaultValue: string, name = 'deadline'): VariablesIndex {
  return { [name]: { id: name, name, type, defaultValue, description: '' } };
}

describe('findLegacyDateTimeValues', () => {
  it('finds an instant in a nested decision branch condition with its path', () => {
    const node = nodeWith({ decisionBranches: [{ conditions: [condition('2024-01-15'), condition(LEGACY)] }] });

    expect(findLegacyDateTimeValues([node])).toEqual([
      { kind: 'node', nodeId: NODE_ID, path: 'decisionBranches[0].conditions[1].y', value: LEGACY },
    ]);
  });

  it('finds an instant in a flat conditions array under any property name', () => {
    expect(findLegacyDateTimeValues([nodeWith({ conditionsArray: [condition(LEGACY)] })])).toEqual([
      { kind: 'node', nodeId: NODE_ID, path: 'conditionsArray[0].y', value: LEGACY },
    ]);
    expect(
      findLegacyDateTimeValues([nodeWith({ rules: [condition('1'), condition('2'), condition(LEGACY)] })]),
    ).toEqual([{ kind: 'node', nodeId: NODE_ID, path: 'rules[2].y', value: LEGACY }]);
  });

  it('reports every row of one node in order', () => {
    const node = nodeWith({ conditions: [condition(LEGACY), condition('2024-01-15'), condition(LEGACY)] });

    expect(findLegacyDateTimeValues([node]).map((item) => item.kind === 'node' && item.path)).toEqual([
      'conditions[0].y',
      'conditions[2].y',
    ]);
  });

  it('ignores the left-hand side, the zone-less shapes and references', () => {
    const node = nodeWith({
      conditions: [
        condition('2024-01-15', LEGACY),
        condition('2024-01-15'),
        condition('2024-01-15T09:07'),
        condition('09:07:00+00:00'),
        condition('{{global.deadline}}'),
      ],
    });

    expect(findLegacyDateTimeValues([node])).toEqual([]);
  });

  it('ignores an instant that is not a condition value', () => {
    const node = nodeWith({ createdAt: LEGACY, notes: LEGACY, nested: { when: LEGACY, list: [LEGACY] } });

    expect(findLegacyDateTimeValues([node])).toEqual([]);
  });

  it('handles nodes without properties', () => {
    expect(
      findLegacyDateTimeValues([
        { id: 'a', data: { type: 'x' } },
        { id: 'b', data: {} },
      ]),
    ).toEqual([]);
  });

  it('finds date and datetime global defaults only', () => {
    expect(findLegacyDateTimeValues([], variables('date', LEGACY))).toEqual([
      { kind: 'globalVariable', name: 'deadline', value: LEGACY },
    ]);
    expect(findLegacyDateTimeValues([], variables('datetime', LEGACY, 'starts'))).toEqual([
      { kind: 'globalVariable', name: 'starts', value: LEGACY },
    ]);
    expect(findLegacyDateTimeValues([], variables('string', LEGACY))).toEqual([]);
    expect(findLegacyDateTimeValues([], variables('time', LEGACY))).toEqual([]);
    expect(findLegacyDateTimeValues([], variables('date', ''))).toEqual([]);
    expect(findLegacyDateTimeValues([], { gone: undefined })).toEqual([]);
  });

  it('lists nodes before global variables and returns nothing for clean data', () => {
    const node = nodeWith({ conditions: [condition(LEGACY)] });

    expect(findLegacyDateTimeValues([node], variables('date', LEGACY)).map((item) => item.kind)).toEqual([
      'node',
      'globalVariable',
    ]);
    expect(
      findLegacyDateTimeValues([nodeWith({ conditions: [condition('2024-01-15')] })], variables('date', '2024-01-15')),
    ).toEqual([]);
  });
});

describe('formatLegacyDateTimeWarning', () => {
  const found = [
    { kind: 'node', nodeId: NODE_ID, path: 'conditions[0].y', value: LEGACY },
    { kind: 'node', nodeId: NODE_ID, path: 'conditions[1].y', value: LEGACY },
    { kind: 'globalVariable', name: 'deadline', value: LEGACY },
    { kind: 'globalVariable', name: 'starts', value: LEGACY },
  ] as const;

  it('names the count, the first three locations and the rest, and ends with the slug', () => {
    const message = formatLegacyDateTimeWarning(found);

    expect(message.startsWith('[@workflowbuilder/sdk] 4 date/datetime value(s)')).toBe(true);
    expect(message).toContain(
      `node ${NODE_ID} · conditions[0].y, node ${NODE_ID} · conditions[1].y, global variable 'deadline' and 1 more.`,
    );
    expect(message).not.toContain("'starts'");
    expect(message).toContain('https://www.workflowbuilder.io/docs/get-started/upgrade-to-4/#date-and-time-values');
    expect(message.endsWith(SLUG)).toBe(true);
  });

  it('lists three locations without a remainder', () => {
    const message = formatLegacyDateTimeWarning(found.slice(0, 3));

    expect(message).toContain("global variable 'deadline'. Re-pick");
    expect(message).not.toContain(' more');
  });
});

describe('warnIfLegacyDateTimeValues', () => {
  it('stays silent for clean data', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    warnIfLegacyDateTimeValues([nodeWith({ conditions: [condition('2024-01-15')] })], variables('date', '2024-01-15'));

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('warns once with the formatted message', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const node = nodeWith({ conditions: [condition(LEGACY)] });

    warnIfLegacyDateTimeValues([node], variables('date', LEGACY));

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      formatLegacyDateTimeWarning(findLegacyDateTimeValues([node], variables('date', LEGACY))),
    );
    warnSpy.mockRestore();
  });
});
