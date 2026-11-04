import React from 'react';
import { Suspense } from 'react';

const AppBarContainer = React.lazy(() =>
  import('./app-bar-container').then((module) => ({ default: module.AppBarContainer })),
);

/*
  It prevents the sidebars from moving if they loaded earlier.
*/
const expectedAppBarHeight = 'var(--wb-sdk-app-bar-height)';

export function AppBarContainerLazy() {
  return (
    <Suspense fallback={<div style={{ height: expectedAppBarHeight }} />}>
      <AppBarContainer />
    </Suspense>
  );
}
