import type { WorkflowBuilderLogo } from '../workflow-builder-root/workflow-builder-root.types';

export type AppBarBranding = {
  logo?: WorkflowBuilderLogo;
  logoHref?: string;
};

let branding: AppBarBranding = {};

export function setAppBarBranding(value: AppBarBranding): void {
  branding = value;
}

export function getAppBarBranding(): AppBarBranding {
  return branding;
}
