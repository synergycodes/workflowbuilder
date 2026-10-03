import { describe, expect, test } from 'vitest';

import { UnknownProviderError } from './errors';
import {
  getAgentProvider,
  getProviderCapabilities,
  getProviderInfoList,
  getRegisteredProviders,
  getRegistration,
  isRegisteredProvider,
  parseProviderRunModel,
} from './registry';

describe('registry', () => {
  test('registers exactly the copilot provider', () => {
    const providers = getRegisteredProviders();
    expect(providers.map((p) => p.id)).toEqual(['copilot']);
  });

  test('isRegisteredProvider is true for copilot, false for unknown ids', () => {
    expect(isRegisteredProvider('copilot')).toBe(true);
    expect(isRegisteredProvider('claude')).toBe(false);
  });

  test('isRegisteredProvider does not fall for prototype-chain properties', () => {
    // Object.hasOwn (not `in` or bracket access) must reject these.
    expect(isRegisteredProvider('toString')).toBe(false);
    expect(isRegisteredProvider('constructor')).toBe(false);
    expect(isRegisteredProvider('hasOwnProperty')).toBe(false);
  });

  test('getAgentProvider returns a CopilotProvider instance', () => {
    const provider = getAgentProvider('copilot');
    expect(provider.getType()).toBe('copilot');
  });

  test('getAgentProvider throws UnknownProviderError for an unregistered id', () => {
    expect(() => getAgentProvider('claude')).toThrow(UnknownProviderError);
  });

  test('getRegistration throws UnknownProviderError for prototype-chain names', () => {
    expect(() => getRegistration('constructor')).toThrow(UnknownProviderError);
  });

  test('getProviderCapabilities returns the static capability object', () => {
    const caps = getProviderCapabilities('copilot');
    expect(caps.mcp).toBe(true);
    expect(caps.containerExec).toBe(false);
  });

  test('getProviderInfoList excludes the factory and includes effortLevels when effortControl is true', () => {
    const list = getProviderInfoList();
    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty('factory');
    expect(list[0]?.effortLevels).toEqual(['minimal', 'low', 'medium', 'high', 'xhigh', 'max', 'ultra', 'persistent']);
  });

  test('parseProviderRunModel trims and validates the model through the strict parser', () => {
    expect(parseProviderRunModel('copilot', '  gpt-5  ')).toBe('gpt-5');
  });

  test('parseProviderRunModel rejects a blank model', () => {
    expect(() => parseProviderRunModel('copilot', '   ')).toThrow();
  });
});
