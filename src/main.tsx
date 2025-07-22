// Import crypto polyfill first to fix HTTP crypto issues
import './utils/crypto-polyfill';

import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <App />
);
