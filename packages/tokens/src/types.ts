export type Config = {
  primitives: string[];
  themes: ThemeConfig[];
};

type ThemeConfig = {
  /** Exact token-set key as exported in tokens.json (e.g. 'Tokens/Dark'). */
  set: string;
  selector: string;
};

/** One token set with every path the pipeline needs, derived once in buildManifest(). */
export type TokenSetEntry = {
  /** Exact tokens.json key. */
  key: string;
  /** Kebab-cased basename shared by the ejected JSON and the built CSS. */
  fileName: string;
  jsonPath: string;
  cssPath: string;
};

type ThemeEntry = TokenSetEntry & { selector: string };

export type Manifest = {
  primitives: TokenSetEntry[];
  themes: ThemeEntry[];
};
