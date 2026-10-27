// Loose view of the TypeDoc JSON model: only the fields the extractor reads.
export interface TypedocComment {
  summary?: TypedocCommentPart[];
  blockTags?: { tag: string; content: TypedocCommentPart[] }[];
}

export interface TypedocCommentPart {
  kind: string;
  text: string;
  tag?: string;
}

interface TypedocSource {
  fileName: string;
  line: number;
  url?: string;
}

export interface TypedocExternalTarget {
  packageName?: string;
  packagePath?: string;
  qualifiedName?: string;
}

export interface TypedocType {
  type: string;
  name?: string;
  value?: string | number | boolean | null;
  target?: number | TypedocExternalTarget;
  refersToTypeParameter?: boolean;
  typeArguments?: TypedocType[];
  types?: TypedocType[];
  elementType?: TypedocType;
  elements?: TypedocType[];
  element?: TypedocType;
  declaration?: TypedocReflection;
  objectType?: TypedocType;
  indexType?: TypedocType;
  operator?: string;
  head?: string;
  tail?: [TypedocType, string][];
  queryType?: TypedocType;
  checkType?: TypedocType;
  extendsType?: TypedocType;
  trueType?: TypedocType;
  falseType?: TypedocType;
  parameter?: string;
  parameterType?: TypedocType;
  nameType?: TypedocType;
  templateType?: TypedocType;
  readonlyModifier?: string;
  optionalModifier?: string;
  asserts?: boolean;
  targetType?: TypedocType;
  isOptional?: boolean;
}

export interface TypedocTypeParameter {
  name: string;
  type?: TypedocType;
  default?: TypedocType;
}

export interface TypedocReflection {
  id: number;
  name: string;
  variant?: string;
  packageName?: string;
  kind: number;
  flags?: {
    isOptional?: boolean;
    isReadonly?: boolean;
    isConst?: boolean;
    isRest?: boolean;
    isAbstract?: boolean;
    isStatic?: boolean;
  };
  comment?: TypedocComment;
  sources?: TypedocSource[];
  children?: TypedocReflection[];
  signatures?: TypedocReflection[];
  parameters?: TypedocReflection[];
  typeParameters?: TypedocTypeParameter[];
  type?: TypedocType;
  extendedTypes?: TypedocType[];
  implementedTypes?: TypedocType[];
  getSignature?: TypedocReflection;
  setSignature?: TypedocReflection;
  defaultValue?: string;
  target?: number;
  inheritedFrom?: unknown;
}

export const ReflectionKind = {
  Module: 2,
  Enum: 8,
  EnumMember: 16,
  Variable: 32,
  Function: 64,
  Class: 128,
  Interface: 256,
  Constructor: 512,
  Property: 1024,
  Method: 2048,
  Accessor: 262_144,
  TypeAlias: 2_097_152,
  Reference: 4_194_304,
} as const;

// TypeDoc sorts children alphabetically; the declaration order is what a reader expects.
export function inSourceOrder(children: TypedocReflection[]) {
  const groups = new Map<string, TypedocReflection[]>();
  for (const child of children) {
    const key = child.sources?.[0]?.fileName ?? '';
    groups.set(key, [...(groups.get(key) ?? []), child]);
  }
  return [...groups.values()].flatMap((group) =>
    [...group].sort((a, b) => (a.sources?.[0]?.line ?? 0) - (b.sources?.[0]?.line ?? 0)),
  );
}

// Declarations in a TypeDoc project: its direct children, or the children of each module when several entry points were documented.
export function topLevelCount(project: TypedocReflection, modules: boolean) {
  const children = project.children ?? [];
  return modules ? children.reduce((sum, module) => sum + (module.children?.length ?? 0), 0) : children.length;
}
