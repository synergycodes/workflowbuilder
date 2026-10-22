import { describe, expect, it, vi } from 'vitest';

const useAutoSave = vi.fn();
const useAutoSaveOnClose = vi.fn();
const useDetectLanguageChange = vi.fn();

vi.mock('../integration/hooks/use-auto-save', () => ({ useAutoSave }));
vi.mock('../integration/hooks/use-auto-save-on-close', () => ({ useAutoSaveOnClose }));
vi.mock('../i18n/use-detect-language-change', () => ({ useDetectLanguageChange }));

const { renderInRoot } = await import('../ui-extensions/test-utils');
const { EditorRuntime } = await import('./editor-runtime');

describe('EditorRuntime', () => {
  it('runs auto-save, auto-save-on-close and language detection on mount, renders nothing', () => {
    // StrictMode (used by `renderInRoot`) double-invokes render in dev, so each hook
    // runs twice on a single mount; what matters here is that each one runs at all.
    const { container } = renderInRoot(<EditorRuntime />);

    expect(useAutoSave).toHaveBeenCalled();
    expect(useAutoSaveOnClose).toHaveBeenCalled();
    expect(useDetectLanguageChange).toHaveBeenCalled();
    expect(container.textContent).toBe('');
  });

  it('save:false (no Save button) does not stop EditorRuntime from running useAutoSave: it is unconditional', () => {
    useAutoSave.mockClear();

    renderInRoot(<EditorRuntime />, { builtInControls: { save: false } });

    expect(useAutoSave).toHaveBeenCalled();
  });
});
