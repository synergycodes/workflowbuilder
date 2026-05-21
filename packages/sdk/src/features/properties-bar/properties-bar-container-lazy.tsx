import React from 'react';
import { Suspense } from 'react';

const PropertiesBarContainer = React.lazy(() =>
  import('./properties-bar-container').then((module) => ({ default: module.PropertiesBarContainer })),
);

export function PropertiesBarContainerLazy() {
  return (
    <Suspense>
      <PropertiesBarContainer />
    </Suspense>
  );
}
