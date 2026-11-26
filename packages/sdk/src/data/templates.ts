import { withOptionalFunctionPlugins } from '../features/plugins-core/adapters/adapter-functions';

import type { TemplateModel } from '../node/common';

let customTemplates: TemplateModel[] = [];

export function setCustomTemplates(ts: TemplateModel[] | null) {
  customTemplates = ts ?? [];
}

const getTemplatesFunction = (): TemplateModel[] => customTemplates;

export const getTemplates = withOptionalFunctionPlugins(getTemplatesFunction, 'getTemplates');
