import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import TagManager from 'react-gtm-module';

import { App } from './app/app';
import './app/features/i18n';

TagManager.initialize({
  gtmId: import.meta.env.GTM_ID,
});

const root = ReactDOM.createRoot(document.querySelector('#root') as HTMLElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
