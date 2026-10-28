import { beforeEach, describe, expect, it } from 'vitest';

import { getIsValidConnection, getReactFlowProps, setIsValidConnection, setReactFlowProps } from './react-flow-config';

const alwaysValid = () => true;

beforeEach(() => {
  setIsValidConnection(null);
  setReactFlowProps(null);
});

describe('react-flow-config holder', () => {
  it('round-trips isValidConnection and resets to null', () => {
    setIsValidConnection(alwaysValid);
    expect(getIsValidConnection()).toBe(alwaysValid);

    setIsValidConnection(null);
    expect(getIsValidConnection()).toBeNull();
  });

  it('round-trips reactFlowProps', () => {
    const props = { maxZoom: 3 };

    setReactFlowProps(props);
    expect(getReactFlowProps()).toBe(props);
  });

  it('returns the same frozen empty object whenever unset', () => {
    const first = getReactFlowProps();
    setReactFlowProps(null);
    const second = getReactFlowProps();

    expect(first).toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(first).toEqual({});
  });
});
