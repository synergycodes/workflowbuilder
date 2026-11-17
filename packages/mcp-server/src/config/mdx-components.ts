export type MdxRule =
  | { action: 'remove' | 'unwrap' }
  | { action: 'replace'; template: string }
  | { action: 'special'; handler: 'propsTable' | 'cssVariablesTable' | 'nodeDocumentation' | 'tabItem' | 'link' };

// Components missing here are unwrapped (children kept, tags dropped); an empty element then disappears.
export const mdxComponents: Record<string, MdxRule> = {
  Tabs: { action: 'unwrap' },
  TabItem: { action: 'special', handler: 'tabItem' },
  NodeDocumentation: { action: 'special', handler: 'nodeDocumentation' },
  EnterpriseNote: { action: 'replace', template: '> Enterprise: available with the Enterprise license.' },
  PropsTable: { action: 'special', handler: 'propsTable' },
  CssVariablesTable: { action: 'special', handler: 'cssVariablesTable' },
  a: { action: 'special', handler: 'link' },
  OverflowCard: {
    action: 'replace',
    template: '> Powered by Overflow, a React Flow UI library. Premium plugin docs ({attr:docsUrl})',
  },
  Image: { action: 'replace', template: '[image: {attr:alt}]' },
  VideoCard: { action: 'replace', template: '[video: {attr:title}]' },
  YoutubeEmbed: { action: 'replace', template: '[video: {attr:title}]' },
};
