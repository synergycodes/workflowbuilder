import { useEffect, useState } from 'react';

import { adaptVisualization } from '../utils/adapt-visualization';
import type { VisualizeRenderer } from '../utils/detect-format';

const ADAPTABLE = new Set<VisualizeRenderer>(['diagram', 'chart', 'table', 'json', 'stat-cards']);

// output null = the adapt call failed and the raw text is rendered instead.
type Adaptation = { key: string; output: string | null };

// The adapted content is an async derived value keyed by (renderer, text).
// A stale adaptation is ignored by the key check, never reset by an effect,
// so switching the render format re-adapts for the new one.
export function useAdaptedVisualization(text: string, renderer: VisualizeRenderer, hasOutput: boolean) {
  const [adaptation, setAdaptation] = useState<Adaptation | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);

  const adaptationKey = `${renderer}\n${text}`;
  const cached = adaptation?.key === adaptationKey ? adaptation : null;
  const shouldAdapt = hasOutput && ADAPTABLE.has(renderer) && cached === null;

  useEffect(() => {
    if (!shouldAdapt) return;

    const controller = new AbortController();

    async function adapt() {
      setIsAdapting(true);
      try {
        const output = await adaptVisualization(text, renderer, controller.signal);
        setAdaptation({ key: adaptationKey, output });
      } catch {
        if (!controller.signal.aborted) setAdaptation({ key: adaptationKey, output: null });
      } finally {
        if (!controller.signal.aborted) setIsAdapting(false);
      }
    }

    void adapt();

    return () => controller.abort();
  }, [shouldAdapt, adaptationKey, text, renderer]);

  return { adaptedText: cached?.output ?? null, isAdapting };
}
