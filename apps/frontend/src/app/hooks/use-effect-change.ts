import { useEffect, useRef } from 'react';

export default function useEffectChange(callback: () => void, dependencies: unknown[]) {
  const isInited = useRef(false);

  useEffect(() => {
    if (!isInited.current) {
      isInited.current = true;

      return;
    }

    return callback();
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps
}
