import { registerComponentDecorator } from '../plugins-core/adapters/adapter-components';
import { LanguageSelector } from './components/language-selector/language-selector';

// Side-effect imports (`import './plugin-exports'`) get tree-shaken by some
// consumer bundlers despite the SDK's `sideEffects` whitelist — Rollup in
// library mode strips bare function calls when their return value is unused.
// Wrapping the registration in an exported `plugin` invoked from
// `bootstrap.ts` keeps the call alive: the named import is concretely
// consumed, so the module survives the tree shake.
export const plugin = () => {
  registerComponentDecorator('OptionalAppBarControls', {
    content: LanguageSelector,
    priority: 10,
    place: 'before',
  });
};
