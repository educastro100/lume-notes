import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { parseTheme } from './preferences';
import './styles.css';
try {
  document.documentElement.dataset.theme = parseTheme(localStorage.getItem('lume.theme'));
} catch {
  document.documentElement.dataset.theme = 'light';
}
// Apply the saved palette before enabling transitions between user-selected themes.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.dataset.themeReady = 'true';
  });
});
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
