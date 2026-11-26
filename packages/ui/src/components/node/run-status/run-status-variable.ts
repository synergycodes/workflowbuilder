import { isCssNamePart } from '../../../shared/utils/css-name';

export function runStatusVariable(role: 'stroke' | 'halo' | 'bg' | 'fg', tone: string | undefined) {
  const fallback = role === 'halo' ? 'transparent' : `var(--wb-public-node-run-status-${role}-neutral)`;
  return isCssNamePart(tone) ? `var(--wb-public-node-run-status-${role}-${tone}, ${fallback})` : fallback;
}
