import { describe, expect, it } from 'vitest';

import type { OnSaveExternal } from '../types/integration';
import { resolveIntegration } from './resolve-integration';

const onDataSave: OnSaveExternal = () => Promise.resolve('success');

describe('resolveIntegration', () => {
  it('defaults to localStorage when integration is undefined', () => {
    expect(resolveIntegration()).toEqual({
      strategy: 'localStorage',
      endpoints: undefined,
      onDataSave: undefined,
      autoSave: true,
    });
  });

  it('defaults to localStorage when integration is {}', () => {
    expect(resolveIntegration({})).toEqual({
      strategy: 'localStorage',
      endpoints: undefined,
      onDataSave: undefined,
      autoSave: true,
    });
  });

  it('maps the api variant to flat endpoints', () => {
    const endpoints = { load: '/api/load', save: '/api/save' };
    expect(resolveIntegration({ strategy: 'api', endpoints })).toEqual({
      strategy: 'api',
      endpoints,
      onDataSave: undefined,
      autoSave: true,
    });
  });

  it('maps the props variant to onDataSave', () => {
    expect(resolveIntegration({ strategy: 'props', onDataSave })).toEqual({
      strategy: 'props',
      endpoints: undefined,
      onDataSave,
      autoSave: true,
    });
  });

  it('passes autoSave: false through with every strategy', () => {
    expect(resolveIntegration({ autoSave: false }).autoSave).toBe(false);
    expect(resolveIntegration({ strategy: 'api', endpoints: { load: '', save: '' }, autoSave: false }).autoSave).toBe(
      false,
    );
    expect(resolveIntegration({ strategy: 'props', onDataSave, autoSave: false }).autoSave).toBe(false);
  });
});
