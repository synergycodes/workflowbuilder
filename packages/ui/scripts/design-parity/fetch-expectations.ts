import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type NodesConfig = {
  fileKey: string;
  nodes: Record<string, { id: string; description: string }>;
};

type FigmaNode = {
  name: string;
  type: string;
  absoluteBoundingBox?: { width: number; height: number };
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  cornerRadius?: number;
  strokeWeight?: number;
  strokeAlign?: string;
  boundVariables?: Record<string, unknown>;
  children?: FigmaNode[];
};

type FigmaNodesResponse = {
  name: string;
  lastModified: string;
  nodes: Record<string, { document: FigmaNode }>;
};

const directory = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(readFileSync(path.join(directory, 'nodes.json'), 'utf8')) as NodesConfig;
const token = process.env.FIGMA_TOKEN;

if (!token) {
  throw new Error('FIGMA_TOKEN is required (a personal access token with file read scope).');
}

const ids = Object.values(config.nodes).map((node) => node.id.replace(':', '-'));
const response = await fetch(
  `https://api.figma.com/v1/files/${config.fileKey}/nodes?ids=${ids.join(',')}&geometry=paths`,
  { headers: { 'X-Figma-Token': token } },
);

if (!response.ok) {
  throw new Error(`Figma API responded ${response.status} ${response.statusText}`);
}

const payload = (await response.json()) as FigmaNodesResponse;

const pickChild = (child: FigmaNode) => ({
  name: child.name,
  type: child.type,
  width: child.absoluteBoundingBox?.width ?? null,
  height: child.absoluteBoundingBox?.height ?? null,
  strokeWeight: child.strokeWeight ?? null,
  strokeAlign: child.strokeAlign ?? null,
  boundVariables: child.boundVariables ?? {},
});

const pick = (node: FigmaNode) => ({
  name: node.name,
  type: node.type,
  width: node.absoluteBoundingBox?.width ?? null,
  height: node.absoluteBoundingBox?.height ?? null,
  paddingLeft: node.paddingLeft ?? null,
  paddingRight: node.paddingRight ?? null,
  paddingTop: node.paddingTop ?? null,
  paddingBottom: node.paddingBottom ?? null,
  itemSpacing: node.itemSpacing ?? null,
  cornerRadius: node.cornerRadius ?? null,
  strokeWeight: node.strokeWeight ?? null,
  strokeAlign: node.strokeAlign ?? null,
  boundVariables: node.boundVariables ?? {},
  children: (node.children ?? []).map(pickChild),
});

const expectations = {
  fileKey: config.fileKey,
  fileName: payload.name,
  fileLastModified: payload.lastModified,
  fetchedAt: new Date().toISOString(),
  nodes: Object.fromEntries(
    Object.entries(config.nodes).map(([key, { id, description }]) => [
      key,
      { id, description, ...pick(payload.nodes[id].document) },
    ]),
  ),
};

writeFileSync(path.join(directory, 'expectations.json'), `${JSON.stringify(expectations, null, 2)}\n`);
console.log(
  `Wrote expectations for ${Object.keys(expectations.nodes).length} nodes (file modified ${payload.lastModified}).`,
);
