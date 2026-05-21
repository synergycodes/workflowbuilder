import { withIntegrationThroughApi } from './integration-variants/with-integration-through-api';
import { withIntegrationThroughLocalStorage } from './integration-variants/with-integration-through-local-storage';
import { withIntegrationThroughProps } from './integration-variants/with-integration-through-props';

const hocByStrategy = {
  API: withIntegrationThroughApi,
  LOCAL_STORAGE: withIntegrationThroughLocalStorage,
  PROPS: withIntegrationThroughProps,
} as const;

/*
  Pick the hocByStrategy that fits your usage best.
*/
export const withIntegration = hocByStrategy.LOCAL_STORAGE;
