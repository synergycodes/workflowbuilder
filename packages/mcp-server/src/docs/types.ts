export interface DocPage {
  id: string;
  title: string;
  description: string;
  badge?: string;
  url: string;
  content: string;
  sectionIds: string[];
}

export interface DocSection {
  id: string;
  pageId: string;
  anchor: string;
  title: string;
  content: string;
  chunkIds: string[];
  // Anchors of the H3 and deeper headings inside the section.
  subAnchors: string[];
  order: number;
}

export interface DocChunk {
  chunkId: string;
  sectionId: string;
  pageId: string;
  title: string;
  section: string;
  url: string;
  content: string;
  headings: string;
  description: string;
  // The page description on every chunk but the intro, which holds it in description.
  pageDescription: string;
  body: string;
  order: number;
}
