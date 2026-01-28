import { useContext, useEffect, useRef } from 'react';

import { IntegrationContext } from '../components/integration-variants/context/integration-context-wrapper';

export function useAutoSaveOnClose() {
  const onSaveRef = useRef<null | (() => void)>(null);

  const { onSave } = useContext(IntegrationContext);

  useEffect(() => {
    if (onSaveRef.current) {
      window.removeEventListener('beforeunload', onSaveRef.current);
    }

    onSaveRef.current = () => {
      onSave({ isAutoSave: true });
    };

    window.removeEventListener('beforeunload', onSaveRef.current);

    return () => {
      if (onSaveRef.current) {
        window.removeEventListener('beforeunload', onSaveRef.current);
      }
    };
  }, [onSave]);
}
