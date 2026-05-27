import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import via the barrel - same path a third-party adapter author would use,
// and the test thus pins that the public surface re-exports both the impl
// and the interface in one place.
import { AllowAllAuthPort, type AuthPort } from '.';

describe('AllowAllAuthPort', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  const originalAuthPort = process.env['WB_AUTH_PORT'];

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Default-secure: most tests assume the opt-in is absent and the
    // constructor refuses to boot. Tests that exercise the happy path set
    // the env var themselves.
    delete process.env['WB_AUTH_PORT'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalAuthPort === undefined) delete process.env['WB_AUTH_PORT'];
    else process.env['WB_AUTH_PORT'] = originalAuthPort;
  });

  describe('contract', () => {
    beforeEach(() => {
      process.env['WB_AUTH_PORT'] = 'allow-all';
    });

    it('identify returns null: caller is anonymous, matches port design note', async () => {
      const port: AuthPort = new AllowAllAuthPort();
      const request = new Request('http://localhost/whatever');

      await expect(port.identify(request)).resolves.toBeNull();
    });

    it('authorize returns true regardless of caller, action, or resource', async () => {
      const port: AuthPort = new AllowAllAuthPort();

      await expect(port.authorize(null, 'workflows:create', { kind: 'workflows' })).resolves.toBe(true);
      await expect(
        port.authorize({ subject: 'whoever' }, 'workflows:execute', { kind: 'workflow', workflowId: 'w-1' }),
      ).resolves.toBe(true);
      await expect(port.authorize(null, 'executions:cancel', { kind: 'execution', executionId: 'e-1' })).resolves.toBe(
        true,
      );
    });
  });

  describe('opt-in', () => {
    it('refuses to boot without WB_AUTH_PORT=allow-all', () => {
      expect(() => new AllowAllAuthPort()).toThrow(/Refusing to boot.*explicit opt-in/);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('values other than "allow-all" do not opt in', () => {
      process.env['WB_AUTH_PORT'] = 'true';
      expect(() => new AllowAllAuthPort()).toThrow(/Refusing to boot/);

      process.env['WB_AUTH_PORT'] = '1';
      expect(() => new AllowAllAuthPort()).toThrow(/Refusing to boot/);

      process.env['WB_AUTH_PORT'] = '';
      expect(() => new AllowAllAuthPort()).toThrow(/Refusing to boot/);
    });

    it('error message points the operator at the decision log', () => {
      expect(() => new AllowAllAuthPort()).toThrow(/auth-port\.decision-log\.md/);
    });
  });

  describe('warning banner', () => {
    beforeEach(() => {
      process.env['WB_AUTH_PORT'] = 'allow-all';
    });

    it('emits the warning banner so operators see the permissive default at boot', () => {
      new AllowAllAuthPort();

      // Not asserting on the exact line count: the banner is purely cosmetic
      // and tightening that pin breaks the test on harmless edits. Assert on
      // the load-bearing content instead - the name of the port and the
      // pointer to the decision log.
      expect(warnSpy).toHaveBeenCalled();
      const lines = warnSpy.mock.calls.map((call) => call[0]);
      expect(lines.some((line) => typeof line === 'string' && line.includes('AllowAllAuthPort'))).toBe(true);
      expect(lines.some((line) => typeof line === 'string' && line.includes('auth-port.decision-log.md'))).toBe(true);
    });
  });
});
