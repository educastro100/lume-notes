import { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, Copy, X } from 'lucide-react';
import { native } from '../platform';
import { t } from '../i18n';

export function NativeTitlebar({ title }: { title: string }) {
  const [maximized, setMaximized] = useState(false);
  useEffect(() => {
    if (!native) return;
    const win = getCurrentWindow();
    let live = true,
      unlisten: (() => void) | undefined;
    const update = () => {
      void win
        .isMaximized()
        .then((value) => {
          if (live) setMaximized(value);
        })
        .catch(() => {});
    };
    update();
    void win
      .onResized(update)
      .then((fn) => {
        if (live) unlisten = fn;
        else fn();
      })
      .catch(() => {});
    return () => {
      live = false;
      unlisten?.();
    };
  }, []);
  if (!native) return null;
  const win = getCurrentWindow();
  return (
    <div className="native-titlebar">
      <div className="native-drag-area" data-tauri-drag-region>
        <span className="native-brand" data-tauri-drag-region>
          lume.
        </span>
        <span className="native-window-title" data-tauri-drag-region>
          {title}
        </span>
      </div>
      <div className="native-window-controls">
        <button
          aria-label={t('Minimizar janela')}
          title={t('Minimizar janela')}
          onClick={() => void win.minimize()}
        >
          <Minus size={14} />
        </button>
        <button
          aria-label={t(maximized ? 'Restaurar janela' : 'Maximizar janela')}
          title={t(maximized ? 'Restaurar janela' : 'Maximizar janela')}
          onClick={() => void win.toggleMaximize()}
        >
          {maximized ? <Copy size={12} /> : <Square size={12} />}
        </button>
        <button
          className="native-window-close"
          aria-label={t('Fechar Lume')}
          title={t('Fechar Lume')}
          onClick={() => void win.close()}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
