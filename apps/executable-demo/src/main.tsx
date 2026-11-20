import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';

import './global.css';

import { App } from './app/app';

const root = ReactDOM.createRoot(document.querySelector('#root') as HTMLElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
