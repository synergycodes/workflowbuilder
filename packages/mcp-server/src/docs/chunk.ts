import GithubSlugger from 'github-slugger';
import type { Heading, Root, RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

import { type ChunkingConfig, chunking as defaultChunking } from '../config/chunking.js';
import { estimateTokens } from '../search/tokens.js';
import { INTRO_ANCHOR, chunkId, pageUrl, sectionId } from './doc-ids.js';
import { rankableText } from './generated-content.js';
import type { DocChunk, DocSection } from './types.js';

interface ChunkPageInput {
  pageId: string;
  title: string;
  description: string;
  badge?: string;
  markdown: string;
  urlFor?: (pageId: string, anchor: string) => string;
}

interface ChunkedPage {
  sections: DocSection[];
  chunks: DocChunk[];
}

interface HeadingInfo {
  depth: number;
  start: number;
  end: number;
  text: string;
  anchor: string;
}

interface Range {
  start: number;
  end: number;
}

interface Piece extends Range {
  anchor: string;
  label?: string;
}

function offsetOf(node: RootContent | Root, which: 'start' | 'end') {
  const offset = node.position?.[which].offset;
  if (offset === undefined) throw new Error('Markdown node without a source position');
  return offset;
}

export function createAnchorSlugger() {
  const slugger = new GithubSlugger();
  return (headingText: string) => slugger.slug(headingText);
}

function collectHeadings(tree: Root) {
  const slug = createAnchorSlugger();
  const headings: HeadingInfo[] = [];
  const walk = (node: Root | RootContent) => {
    if (node.type === 'heading') {
      const heading = node as Heading;
      const text = toString(heading);
      headings.push({
        depth: heading.depth,
        start: offsetOf(heading, 'start'),
        end: offsetOf(heading, 'end'),
        text,
        anchor: slug(text),
      });
      return;
    }
    if ('children' in node) for (const child of node.children) walk(child);
  };
  walk(tree);
  return headings;
}

function splitAtBlocks(markdown: string, piece: Piece, blocks: RootContent[], maxTokens: number) {
  const inside = blocks.filter(
    (block) => offsetOf(block, 'start') >= piece.start && offsetOf(block, 'end') <= piece.end,
  );
  const parts: Piece[] = [];
  let first: RootContent | undefined;
  let last: RootContent | undefined;
  const flush = (chunkStart: number) => {
    if (!first || !last) return;
    parts.push({ ...piece, start: chunkStart, end: offsetOf(last, 'end') });
  };
  let currentStart = piece.start;
  for (const block of inside) {
    if (first && last && estimateTokens(markdown.slice(currentStart, offsetOf(block, 'end'))) > maxTokens) {
      flush(currentStart);
      currentStart = offsetOf(block, 'start');
      first = undefined;
      last = undefined;
    }
    first ??= block;
    last = block;
  }
  flush(currentStart);
  return parts.length > 0 ? parts : [piece];
}

function textWithout(markdown: string, piece: Range, removed: Range[]) {
  let text = markdown.slice(piece.start, piece.end);
  for (const item of [...removed].filter((range) => range.start >= piece.start).sort((x, y) => y.start - x.start)) {
    text = text.slice(0, item.start - piece.start) + text.slice(item.end - piece.start);
  }
  return text.trim();
}

export function chunkPage(input: ChunkPageInput, config: ChunkingConfig = defaultChunking): ChunkedPage {
  const { markdown } = input;
  const tree = unified().use(remarkParse).parse(markdown) as Root;
  const headings = collectHeadings(tree);
  const blocks = tree.children;
  const h2s = headings.filter((heading) => heading.depth === 2);

  const sections: DocSection[] = [];
  const chunks: DocChunk[] = [];
  const badge = input.badge ? ` ${input.badge}` : '';
  const introDescription = `${input.description}${badge}`.trim();

  const sectionRanges: (Range & { anchor: string; title: string; h2?: HeadingInfo })[] = [];
  const introEnd = h2s.length > 0 ? h2s[0].start : markdown.length;
  if (markdown.slice(0, introEnd).trim() !== '') {
    sectionRanges.push({ start: 0, end: introEnd, anchor: INTRO_ANCHOR, title: input.title });
  }
  for (const [index, h2] of h2s.entries()) {
    sectionRanges.push({
      start: h2.start,
      end: h2s[index + 1]?.start ?? markdown.length,
      anchor: h2.anchor,
      title: h2.text,
      h2,
    });
  }

  for (const [order, range] of sectionRanges.entries()) {
    const id = sectionId(input.pageId, range.anchor);
    let pieces: Piece[] = [{ start: range.start, end: range.end, anchor: range.anchor }];

    if (estimateTokens(markdown.slice(range.start, range.end)) > config.maxChunkTokens) {
      if (config.splitAtH3) {
        const h3s = headings.filter(
          (heading) => heading.depth === 3 && heading.start >= range.start && heading.end <= range.end,
        );
        if (h3s.length > 0) {
          pieces = [
            { start: range.start, end: h3s[0].start, anchor: range.anchor },
            ...h3s.map((h3, index) => ({
              start: h3.start,
              end: h3s[index + 1]?.start ?? range.end,
              anchor: h3.anchor,
              label: h3.text,
            })),
          ].filter((piece) => markdown.slice(piece.start, piece.end).trim() !== '');
        }
      }
      pieces = pieces.flatMap((piece) =>
        estimateTokens(markdown.slice(piece.start, piece.end)) > config.maxChunkTokens
          ? splitAtBlocks(markdown, piece, blocks, config.maxChunkTokens)
          : [piece],
      );
    }

    const chunkIds: string[] = [];
    for (const piece of pieces) {
      const content = markdown.slice(piece.start, piece.end).trim();
      if (content === '') continue;
      const inner = headings.filter((heading) => heading.start >= piece.start && heading.end <= piece.end);
      const codeRanges = config.indexCode
        ? []
        : blocks
            .filter(
              (block) =>
                block.type === 'code' && offsetOf(block, 'start') >= piece.start && offsetOf(block, 'end') <= piece.end,
            )
            .map((block) => ({ start: offsetOf(block, 'start'), end: offsetOf(block, 'end') }));
      const bodyText = textWithout(markdown, piece, [
        ...inner.map(({ start, end }) => ({ start, end })),
        ...codeRanges,
      ]);

      const headingTexts = [
        ...(range.h2 ? [range.h2.text] : []),
        ...inner
          .filter((heading) => heading.depth >= 3 && !(range.h2 && heading.start === range.h2.start))
          .map((heading) => heading.text),
      ];
      const label = piece.label ? `${range.title} › ${piece.label}` : range.title;
      const carriesDescription = chunks.length === 0;
      const id_ = chunkId(id, chunkIds.length);
      chunkIds.push(id_);
      chunks.push({
        chunkId: id_,
        sectionId: id,
        pageId: input.pageId,
        title: input.title,
        section: label,
        url: (input.urlFor ?? pageUrl)(input.pageId, piece.anchor),
        content,
        headings: headingTexts.join('\n'),
        description: carriesDescription ? introDescription : '',
        pageDescription: carriesDescription ? '' : introDescription,
        body: rankableText(bodyText),
        order: chunks.length,
      });
    }

    sections.push({
      id,
      pageId: input.pageId,
      anchor: range.anchor,
      title: range.title,
      content: markdown.slice(range.start, range.end).trim(),
      chunkIds,
      subAnchors: headings
        .filter((heading) => heading.depth >= 3 && heading.start >= range.start && heading.end <= range.end)
        .map((heading) => heading.anchor),
      order,
    });
  }

  return { sections, chunks };
}
