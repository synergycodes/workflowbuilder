import React from 'react';
import { Suspense } from 'react';

const PaletteContainer = React.lazy(() =>
  import('./palette-container').then((module) => ({ default: module.PaletteContainer })),
);

export function PaletteContainerLazy() {
  return (
    <Suspense>
      <PaletteContainer />
    </Suspense>
  );
}
