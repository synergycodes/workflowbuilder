import {
  ReflectionKind,
  type TypedocReflection,
  type TypedocType,
  type TypedocTypeParameter,
  inSourceOrder,
} from './typedoc-types.js';

// TypeDoc's name for a destructured parameter.
const DESTRUCTURED_PARAMETER = '__namedParameters';
const MAX_DEPTH = 6;
const INLINE_OBJECT_DEPTH = 3;

export function typeToString(type: TypedocType | undefined, depth = 0): string {
  if (!type || depth > MAX_DEPTH) return 'unknown';
  switch (type.type) {
    case 'intrinsic': {
      return type.name ?? 'unknown';
    }
    case 'literal': {
      if (typeof type.value === 'string') return `'${type.value}'`;
      if (type.value === null) return 'null';
      return String(type.value);
    }
    case 'reference': {
      const arguments_ = type.typeArguments?.length
        ? `<${type.typeArguments.map((argument) => typeToString(argument, depth + 1)).join(', ')}>`
        : '';
      return `${type.name ?? 'unknown'}${arguments_}`;
    }
    case 'union': {
      return (type.types ?? []).map((member) => wrapUnionMember(member, depth)).join(' | ');
    }
    case 'intersection': {
      return (type.types ?? []).map((member) => wrapIntersectionMember(member, depth)).join(' & ');
    }
    case 'array': {
      const element = typeToString(type.elementType, depth + 1);
      return /[\s|&]/.test(element) && !element.startsWith('{') ? `(${element})[]` : `${element}[]`;
    }
    case 'tuple': {
      return `[${(type.elements ?? []).map((element) => typeToString(element, depth + 1)).join(', ')}]`;
    }
    case 'namedTupleMember': {
      return `${type.name}${type.isOptional ? '?' : ''}: ${typeToString(type.element, depth + 1)}`;
    }
    case 'optional': {
      return `${typeToString(type.elementType, depth + 1)}?`;
    }
    case 'rest': {
      return `...${typeToString(type.elementType, depth + 1)}`;
    }
    case 'reflection': {
      return reflectionToString(type.declaration, depth);
    }
    case 'indexedAccess': {
      return `${typeToString(type.objectType, depth + 1)}[${typeToString(type.indexType, depth + 1)}]`;
    }
    case 'templateLiteral': {
      const spans = (type.tail ?? []).map(([spanType, text]) => `\${${typeToString(spanType, depth + 1)}}${text}`);
      return `\`${type.head ?? ''}${spans.join('')}\``;
    }
    case 'query': {
      return `typeof ${typeToString(type.queryType, depth + 1)}`;
    }
    case 'predicate': {
      const target = type.targetType ? ` is ${typeToString(type.targetType, depth + 1)}` : '';
      return `${type.asserts ? 'asserts ' : ''}${type.name}${target}`;
    }
    case 'typeOperator': {
      return `${type.operator} ${typeToString(type.target as TypedocType | undefined, depth + 1)}`;
    }
    case 'conditional': {
      return `${typeToString(type.checkType, depth + 1)} extends ${typeToString(type.extendsType, depth + 1)} ? ${typeToString(type.trueType, depth + 1)} : ${typeToString(type.falseType, depth + 1)}`;
    }
    case 'mapped': {
      const modifier = type.readonlyModifier === '+' ? 'readonly ' : '';
      const optional = type.optionalModifier === '+' ? '?' : '';
      return `{ ${modifier}[${type.parameter} in ${typeToString(type.parameterType, depth + 1)}]${optional}: ${typeToString(type.templateType, depth + 1)} }`;
    }
    case 'inferred': {
      return `infer ${type.name}`;
    }
    default: {
      return type.name ?? 'unknown';
    }
  }
}

function wrapUnionMember(member: TypedocType, depth: number) {
  const text = typeToString(member, depth + 1);
  return member.type === 'reflection' && text.includes('=>') ? `(${text})` : text;
}

function wrapIntersectionMember(member: TypedocType, depth: number) {
  const text = typeToString(member, depth + 1);
  return member.type === 'union' || (member.type === 'reflection' && text.includes('=>')) ? `(${text})` : text;
}

function reflectionToString(declaration: TypedocReflection | undefined, depth: number) {
  if (!declaration) return '{ … }';
  const signature = declaration.signatures?.[0];
  if (signature)
    return `${typeParametersToString(signature.typeParameters)}(${parametersToString(signature.parameters, depth + 1)}) => ${typeToString(signature.type, depth + 1)}`;
  const children = declaration.children ?? [];
  if (children.length === 0) return '{}';
  if (depth >= INLINE_OBJECT_DEPTH) return '{ … }';
  return `{ ${children.map((child) => memberToString(child, depth + 1)).join('; ')} }`;
}

function typeParametersToString(parameters: TypedocTypeParameter[] | undefined) {
  if (!parameters?.length) return '';
  const text = parameters.map((parameter) => {
    const constraint = parameter.type ? ` extends ${typeToString(parameter.type, 1)}` : '';
    const fallback = parameter.default ? ` = ${typeToString(parameter.default, 1)}` : '';
    return `${parameter.name}${constraint}${fallback}`;
  });
  return `<${text.join(', ')}>`;
}

function parametersToString(parameters: TypedocReflection[] | undefined, depth = 0) {
  return (parameters ?? [])
    .map((parameter) => {
      const rest = parameter.flags?.isRest ? '...' : '';
      const optional = parameter.flags?.isOptional ? '?' : '';
      const name = parameter.name === DESTRUCTURED_PARAMETER ? 'options' : parameter.name;
      return `${rest}${name}${optional}: ${typeToString(parameter.type, depth + 1)}`;
    })
    .join(', ');
}

function callSignature(signature: TypedocReflection, depth: number) {
  return `${typeParametersToString(signature.typeParameters)}(${parametersToString(signature.parameters, depth + 1)}): ${typeToString(signature.type, depth + 1)}`;
}

export function memberToString(child: TypedocReflection, depth = 0) {
  const readonly = child.flags?.isReadonly ? 'readonly ' : '';
  const optional = child.flags?.isOptional ? '?' : '';
  if (child.kind === ReflectionKind.Method) {
    const signature = child.signatures?.[0];
    return signature ? `${child.name}${optional}${callSignature(signature, depth)}` : `${child.name}${optional}()`;
  }
  if (child.kind === ReflectionKind.Accessor) {
    const type = child.getSignature?.type ?? child.setSignature?.parameters?.[0]?.type;
    const accessorReadonly = child.setSignature ? '' : 'readonly ';
    return `${accessorReadonly}${child.name}: ${typeToString(type, depth + 1)}`;
  }
  const signature = child.type?.type === 'reflection' ? undefined : child.signatures?.[0];
  if (signature) return `${child.name}${optional}${callSignature(signature, depth)}`;
  return `${readonly}${child.name}${optional}: ${typeToString(child.type, depth + 1)}`;
}

function heritage(declaration: TypedocReflection) {
  const extended = declaration.extendedTypes?.map((type) => typeToString(type, 1)).join(', ');
  const implemented = declaration.implementedTypes?.map((type) => typeToString(type, 1)).join(', ');
  return { extended, implemented };
}

function ownMembers(declaration: TypedocReflection) {
  return inSourceOrder((declaration.children ?? []).filter((child) => child.kind !== ReflectionKind.Constructor));
}

export function declarationSignature(declaration: TypedocReflection) {
  const typeParameters = typeParametersToString(declaration.typeParameters);
  switch (declaration.kind) {
    case ReflectionKind.Function: {
      return (declaration.signatures ?? [])
        .map((signature) => `function ${declaration.name}${callSignature(signature, 0)}`)
        .join('\n');
    }
    case ReflectionKind.Variable: {
      return `const ${declaration.name}: ${typeToString(declaration.type, 0)}`;
    }
    case ReflectionKind.TypeAlias: {
      const body = declaration.type ? typeToString(declaration.type, 0) : reflectionToString(declaration, 0);
      return `type ${declaration.name}${typeParameters} = ${body}`;
    }
    case ReflectionKind.Interface: {
      const { extended } = heritage(declaration);
      const header = `interface ${declaration.name}${typeParameters}${extended ? ` extends ${extended}` : ''}`;
      const body = ownMembers(declaration).map((child) => memberToString(child, 0));
      return body.length > 0 ? `${header} { ${body.join('; ')} }` : `${header} {}`;
    }
    case ReflectionKind.Class: {
      const { extended, implemented } = heritage(declaration);
      const header = `class ${declaration.name}${typeParameters}${extended ? ` extends ${extended}` : ''}${implemented ? ` implements ${implemented}` : ''}`;
      const constructorSignature = declaration.children?.find((child) => child.kind === ReflectionKind.Constructor)
        ?.signatures?.[0];
      const parts = [
        ...(constructorSignature ? [`constructor(${parametersToString(constructorSignature.parameters, 0)})`] : []),
        ...ownMembers(declaration).map((child) => memberToString(child, 0)),
      ];
      return parts.length > 0 ? `${header} { ${parts.join('; ')} }` : `${header} {}`;
    }
    case ReflectionKind.Enum: {
      const members = inSourceOrder(declaration.children ?? []).map((member) => {
        const value = member.type?.type === 'literal' ? ` = ${typeToString(member.type, 0)}` : '';
        return `${member.name}${value}`;
      });
      return `enum ${declaration.name} { ${members.join(', ')} }`;
    }
    default: {
      return declaration.name;
    }
  }
}
