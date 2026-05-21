export type ApiError = {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
};

export type ApiErrorCode =
  | 'workflow_not_found'
  | 'execution_not_found'
  | 'unsupported_node_types'
  | 'validation_error'
  | 'published_version_missing'
  | 'execution_not_cancellable';

export type ValidationProblem = {
  path: string;
  message: string;
  code?: string;
};

export type ValidationErrorDetails = {
  problems: ValidationProblem[];
};

export type UnsupportedNodeTypesDetails = {
  unsupportedNodeTypes: string[];
};
