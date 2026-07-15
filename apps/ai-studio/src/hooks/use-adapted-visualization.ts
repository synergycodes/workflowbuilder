import { useEffect, useState } from 'react';

import { adaptVisualization } from '../utils/adapt-visualization';
import type { VisualizeRenderer } from '../utils/detect-format';

const ADAPTABLE = new Set<VisualizeRenderer>(['diagram', 'chart', 'table', 'json', 'stat-cards']);

type Adaptation = { key: string; output: string };

// The adapted content is an async derived value keyed by (renderer, text).
// A stale adaptation is ignored by the key check, never reset by an effect,
// so switching the render format re-adapts for the new one.
export function useAdaptedVisualization(text: string, renderer: VisualizeRenderer, hasOutput: boolean) {
  const [adaptation, setAdaptation] = useState<Adaptation | null>(null);
  const [isAdapting, setIsAdapting] = useState(false);

  const adaptationKey = `${renderer}\n${text}`;
  const adaptedText = adaptation?.key === adaptationKey ? adaptation.output : null;
  const shouldAdapt = hasOutput && ADAPTABLE.has(renderer) && adaptedText === null;

  useEffect(() => {
    if (!shouldAdapt) return;

    let cancelled = false;
    setIsAdapting(true);
    adaptVisualization(text, renderer)
      .then((output) => {
        if (!cancelled) setAdaptation({ key: adaptationKey, output });
      })
      .catch(() => {
        // keep original content
      })
      .finally(() => {
        if (!cancelled) setIsAdapting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldAdapt, adaptationKey, text, renderer]);

  return { adaptedText, isAdapting };
}
