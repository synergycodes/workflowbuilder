import { AndCondition, LeafCondition, OrCondition, RuleEffect, SchemaBasedCondition } from '@jsonforms/core';

type UISchemaCondition = OrCondition | AndCondition | LeafCondition | SchemaBasedCondition;

export type UISchemaRule = {
  effect: keyof typeof RuleEffect;
  condition: UISchemaCondition;
};
