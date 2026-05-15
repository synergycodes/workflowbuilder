import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Import via the barrel — same path a third-party adapter author would use,
// and the test thus pins that the public surface re-exports both the impl
// and the interface in one place.
import { AllowAllAuthPort, type AuthPort } from '.';

describe('AllowAllAuthPort', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;
  const originalNodeEnv = process.env['NODE_ENV'];
  const originalAllowInsecure = process.env['WB_ALLOW_INSECURE'];

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Tests below assume non-production unless they opt in.
    delete process.env['NODE_ENV'];
    delete process.env['WB_ALLOW_INSECURE'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalNodeEnv === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = originalNodeEnv;
    if (originalAllowInsecure === undefined) delete process.env['WB_ALLOW_INSECURE'];
    else process.env['WB_ALLOW_INSECURE'] = originalAllowInsecure;
  });

  describe('contract', () => {
    it('identify returns null — caller is anonymous, matches port design note', async () => {
      // Typed as the interface so the test exercises the contract callers see —
      // the impl class narrows its method signatures to zero-args internally.
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

  describe('constructor safeties', () => {
    it('emits the warning banner so operators see the permissive default at boot', () => {
      new AllowAllAuthPort();

      // Banner is multi-line: top bar + 4 message lines + bottom bar = 6 calls.
      expect(warnSpy).toHaveBeenCalledTimes(6);
      const lines = warnSpy.mock.calls.map((call) => call[0]);
      expect(lines.some((line) => typeof line === 'string' && line.includes('AllowAllAuthPort'))).toBe(true);
      expect(lines.some((line) => typeof line === 'string' && line.includes('auth-port.decision-log.md'))).toBe(true);
    });

    it('refuses to boot under NODE_ENV=production without WB_ALLOW_INSECURE', () => {
      process.env['NODE_ENV'] = 'production';

      expect(() => new AllowAllAuthPort()).toThrow(/Refusing to boot.*NODE_ENV=production/);
      // Warning is suppressed when the guard fires — the throw is the signal.
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('boots under NODE_ENV=production when WB_ALLOW_INSECURE=1 opts in deliberately', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['WB_ALLOW_INSECURE'] = '1';

      expect(() => new AllowAllAuthPort()).not.toThrow();
      // Operator opted in — warning still fires so the choice is loud in logs.
      expect(warnSpy).toHaveBeenCalled();
    });

    it('WB_ALLOW_INSECURE values other than "1" do not opt in', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['WB_ALLOW_INSECURE'] = 'true';

      expect(() => new AllowAllAuthPort()).toThrow(/Refusing to boot/);
    });
  });
});
