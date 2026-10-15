import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { parseTheme, parsePreferences, themeForTime } from './preferences';
import './styles.css';
import { native } from './platform';
document.documentElement.dataset.native = String(native);
try {
  document.documentElement.dataset.theme = parsePreferences(
    localStorage.getItem('lume.preferences.v1'),
  ).automaticTheme
    ? themeForTime()
    : parseTheme(localStorage.getItem('lume.theme'));
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
