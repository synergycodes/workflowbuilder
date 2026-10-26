import { type BudgetConfig, budget as defaultBudget } from '../../config/budget.js';
import { estimateTokens } from '../../search/tokens.js';
import { truncateInline, truncateToTokens } from '../../search/truncate.js';
import type { ApiMember, ApiSymbol } from '../../symbols/extract-symbols.js';
import { type SymbolEngine, isMember } from '../../symbols/symbol-search.js';
import { parseInput } from '../parse-input.js';
import type { ToolHandler } from '../types.js';
import { GetSymbolInputSchema } from './tool.validator.js';

interface MemberOutput {
  name: string;
  kind: string;
  signature: string;
  summary?: string;
  defaultValue?: string;
  truncated?: true;
}

interface VariantOutput {
  name?: string;
  members: MemberOutput[];
}

function importStatement(symbol: ApiSymbol) {
  return symbol.typeOnly
    ? `import type { ${symbol.name} } from '${symbol.importPath}';`
    : `import { ${symbol.name} } from '${symbol.importPath}';`;
}

function memberOutput(member: ApiMember, budget: BudgetConfig): MemberOutput {
  const { maxMemberSignatureTokens, maxMemberSummaryTokens } = budget.getSymbol;
  const signature = truncateInline(member.signature, maxMemberSignatureTokens);
  const summary = member.summary ? truncateInline(member.summary, maxMemberSummaryTokens) : undefined;
  const truncated = signature !== member.signature || summary !== (member.summary || undefined);
  return {
    name: member.name,
    kind: member.kind,
    signature,
    ...(summary ? { summary } : {}),
    ...(member.defaultValue ? { defaultValue: member.defaultValue } : {}),
    ...(truncated ? { truncated: true as const } : {}),
  };
}

// Members every variant declares with the same type, then what remains of each variant.
function splitVariants(symbol: ApiSymbol) {
  const { variants } = symbol;
  if (!variants) return { shared: symbol.members, rest: [] };
  const sharedNames = new Set(
    variants[0].members
      .filter((member) =>
        variants.every((variant) =>
          variant.members.some((other) => other.name === member.name && other.signature === member.signature),
        ),
      )
      .map((member) => member.name),
  );
  return {
    shared: variants[0].members.filter((member) => sharedNames.has(member.name)),
    rest: variants.map((variant) => ({
      ...(variant.name ? { name: variant.name } : {}),
      members: variant.members.filter((member) => !sharedNames.has(member.name)),
    })),
  };
}

function symbolOutput(symbol: ApiSymbol, budget: BudgetConfig) {
  const { maxSignatureTokens, maxDescriptionTokens, maxResponseTokens } = budget.getSymbol;
  const description = truncateToTokens(symbol.description, maxDescriptionTokens);
  const signature = truncateInline(symbol.signature, maxSignatureTokens);
  const signatureTruncated = signature !== symbol.signature;
  const output: Record<string, unknown> = {
    id: symbol.id,
    name: symbol.name,
    kind: symbol.kind,
    package: symbol.package,
    ...(symbol.exported === false ? { exported: false } : { importStatement: importStatement(symbol) }),
    ...(symbol.otherImportPaths ? { otherImportPaths: symbol.otherImportPaths } : {}),
    signature,
    ...(signatureTruncated && symbol.unionSize ? { unionSize: symbol.unionSize } : {}),
    description: description.text,
    ...(symbol.category ? { category: symbol.category } : {}),
    ...(symbol.deprecated === undefined ? {} : { deprecated: symbol.deprecated }),
    ...(symbol.since === undefined ? {} : { since: symbol.since }),
    ...(symbol.defaultValue ? { defaultValue: symbol.defaultValue } : {}),
    source: symbol.source,
    ...(symbol.url ? { url: symbol.url } : {}),
    ...(symbol.docs ? { docs: symbol.docs } : {}),
  };

  const { shared, rest } = splitVariants(symbol);
  const total = shared.length + rest.reduce((sum, variant) => sum + variant.members.length, 0);
  let tokens = estimateTokens(JSON.stringify({ ...output, members: [], membersTruncated: 0 }));
  let emitted = 0;
  let memberCut = false;
  let full = false;
  const fitAll = (list: ApiMember[]) => {
    const entries: MemberOutput[] = [];
    for (const member of list) {
      const entry = memberOutput(member, budget);
      const cost = estimateTokens(JSON.stringify(entry)) + 1;
      if (tokens + cost > maxResponseTokens) {
        full = true;
        break;
      }
      tokens += cost;
      emitted += 1;
      if (entry.truncated) memberCut = true;
      entries.push(entry);
    }
    return entries;
  };

  const members = fitAll(shared);
  const variants: VariantOutput[] = [];
  for (const variant of rest) {
    if (full) break;
    variants.push({ ...(variant.name ? { name: variant.name } : {}), members: fitAll(variant.members) });
  }

  const membersTruncated = total - emitted;
  const truncated = signatureTruncated || description.truncated || membersTruncated > 0 || memberCut;
  return {
    ...output,
    members,
    ...(variants.length > 0 ? { variants } : {}),
    membersTruncated,
    ...(membersTruncated > 0 ? { memberCount: total } : {}),
    ...(truncated ? { truncated: true } : {}),
  };
}

function memberDetail(member: ApiMember, parent: ApiSymbol | undefined, budget: BudgetConfig) {
  const description = truncateToTokens(member.description, budget.getSymbol.maxDescriptionTokens);
  const signature = truncateInline(member.signature, budget.getSymbol.maxSignatureTokens);
  return {
    id: member.id,
    name: member.name,
    kind: member.kind,
    package: member.package,
    parent: member.parent,
    ...(parent?.exported === false
      ? { exported: false }
      : {
          importStatement: parent
            ? importStatement(parent)
            : `import { ${member.parent} } from '${member.importPath}';`,
        }),
    signature,
    description: description.text,
    ...(member.defaultValue ? { defaultValue: member.defaultValue } : {}),
    ...(member.deprecated === undefined ? {} : { deprecated: member.deprecated }),
    ...(description.truncated || signature !== member.signature ? { truncated: true } : {}),
  };
}

export function createGetSymbolHandler(symbols: SymbolEngine, budget: BudgetConfig = defaultBudget): ToolHandler {
  return async (input) => {
    const { name } = parseInput(GetSymbolInputSchema, input);
    const resolution = symbols.resolve(name);
    if ('ambiguous' in resolution) {
      throw new Error(`Ambiguous symbol "${name}": ${resolution.ambiguous.join(', ')}`);
    }
    if ('missing' in resolution) {
      const suggestions = symbols.search(name, {}, 3).map((hit) => hit.item.id);
      const hint = suggestions.length > 0 ? `. Did you mean: ${suggestions.join(', ')}?` : '';
      throw new Error(`Symbol not found: ${name}${hint}`);
    }
    const { found } = resolution;
    if (isMember(found)) return memberDetail(found, symbols.symbolById(`${found.package}:${found.parent}`), budget);
    return symbolOutput(found, budget);
  };
}
