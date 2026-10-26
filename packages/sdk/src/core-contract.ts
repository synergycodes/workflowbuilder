export { NODE_ERROR_POLICIES, type NodeErrorPolicy } from '../../types/src/workflow-execution/execution-model';

// The seam between the SDK and private `@workflow-builder/types`, same pattern as packages/temporal/src/core-contract.ts.
// Relative paths on purpose: a package-name import would survive into the emitted .d.ts and break consumers.
export type {
  NodeSchemaOutput,
  SourceHandleType,
  FlattenedPropertiesIndex,
} from '../../types/src/variables/node-output-schema';
export { SOURCE_HANDLE_TYPE, OUTPUT_SCHEMA_TYPE } from '../../types/src/variables/node-output-schema';
export type { VariableType, VariableTypePrimitive, VariableReference } from '../../types/src/variables/variables';
