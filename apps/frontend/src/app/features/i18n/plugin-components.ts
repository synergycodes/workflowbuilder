import { registerComponentDecorator } from '@/features/plugins-core/adapters/adapter-components';
import { LanguageSelector } from './components/language-selector/language-selector';

registerComponentDecorator('OptionalAppBarControls', {
  content: LanguageSelector,
  priority: 10,
  place: 'before',
});
