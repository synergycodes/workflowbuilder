import { describe, expect, it } from 'vitest';

import {
  KNOWN_VENDORS,
  LEGACY_VENDOR_ALIASES,
  type ResolvedCredential,
  deliverCredential,
  normalizeCredentialVendor,
} from './delivery';

const ART_DIR = '/tmp/agent-harness-test-artifacts';

function apiKey(key = 'sk-test-123'): ResolvedCredential {
  return { kind: 'api_key', apiKey: key };
}

function oauth(token = 'oauth-bearer'): ResolvedCredential {
  return { kind: 'oauth', oauthApiKey: token, rawCreds: { access: token } };
}

describe('credentials/delivery', () => {
  describe('KNOWN_VENDORS', () => {
    it('includes github-copilot', () => {
      expect(KNOWN_VENDORS.has('github-copilot')).toBe(true);
    });

    it('excludes the legacy agent-keyed id', () => {
      expect(KNOWN_VENDORS.has('copilot')).toBe(false);
    });
  });

  describe('normalizeCredentialVendor', () => {
    it('maps the legacy agent-keyed id to the vendor id', () => {
      expect(normalizeCredentialVendor('copilot')).toBe('github-copilot');
    });

    it('passes vendor ids through unchanged', () => {
      for (const id of ['github-copilot', 'mystery']) {
        expect(normalizeCredentialVendor(id)).toBe(id);
      }
    });

    it('alias table covers exactly the one legacy id', () => {
      expect(Object.keys(LEGACY_VENDOR_ALIASES).sort()).toEqual(['copilot']);
    });
  });

  describe('github-copilot', () => {
    it('api_key → COPILOT_GITHUB_TOKEN', () => {
      const r = deliverCredential('github-copilot', apiKey('pat-x'), { artifactsDir: ART_DIR });
      expect(r.env).toEqual({ COPILOT_GITHUB_TOKEN: 'pat-x' });
      expect(r.files).toBeUndefined();
    });

    it('oauth → COPILOT_GITHUB_TOKEN', () => {
      const r = deliverCredential('github-copilot', oauth('cop-tok'), { artifactsDir: ART_DIR });
      expect(r.env).toEqual({ COPILOT_GITHUB_TOKEN: 'cop-tok' });
      expect(r.files).toBeUndefined();
    });

    it("legacy 'copilot' id normalizes to the same delivery", () => {
      const r = deliverCredential('copilot', apiKey('pat-y'), { artifactsDir: ART_DIR });
      expect(r.env).toEqual({ COPILOT_GITHUB_TOKEN: 'pat-y' });
    });
  });

  describe('unknown vendor', () => {
    it('throws with the list of known vendors', () => {
      expect(() => deliverCredential('mystery', apiKey(), { artifactsDir: ART_DIR })).toThrow(
        /Unknown credential vendor 'mystery'.*Known: github-copilot/,
      );
    });
  });

  describe('signature shape', () => {
    it('returns { env, files? } — not a bare string or a flat env map', () => {
      const r = deliverCredential('github-copilot', apiKey('x'), { artifactsDir: ART_DIR });
      expect(typeof r).toBe('object');
      expect(r).toHaveProperty('env');
      expect(typeof r.env).toBe('object');
    });
  });
});
