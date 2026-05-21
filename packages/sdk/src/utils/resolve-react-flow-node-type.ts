import type { NodeType } from '../node/node-types';

/**
 * Decides which template-registry key to use for a palette item. If the
 * palette `type` is itself a key in `templates`, that wins (consumer's
 * custom template). Otherwise we fall back to `templateType` (the SDK's
 * built-in renderer for this palette item).
 *
 * `templates` is intentionally typed as a string-keyed record because the
 * function only checks for key presence; both `NodeTypes` (canvas) and
 * `NodeTemplatesMap` (palette preview) satisfy this shape.
 */
export function resolveReactFlowNodeType(
  paletteType: string,
  templateType: NodeType,
  templates: Record<string, unknown>,
): string {
  return templates[paletteType] ? paletteType : templateType;
}
