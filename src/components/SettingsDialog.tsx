import { useEffect, useRef, useState } from 'react';
import { Languages, X } from 'lucide-react';
import { LANGUAGES, t, type Locale } from '../i18n';

export function SettingsDialog({
  open,
  locale,
  onLanguage,
  onClose,
}: {
  open: boolean;
  locale: Locale;
  onLanguage: (value: Locale) => void;
  onClose: () => void;
}) {
  const select = useRef<HTMLSelectElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) {
      setPresent(true);
      return;
    }
    const timer = setTimeout(() => setPresent(false), 180);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (open && present) {
      if (!previous.current) previous.current = document.activeElement as HTMLElement | null;
      select.current?.focus();
    } else if (!open && previous.current) {
      if (previous.current.isConnected) previous.current.focus();
      previous.current = null;
    }
  }, [open, present]);
  if (!present) return null;
  return (
    <div
      className="modal-backdrop settings-backdrop"
      data-state={open ? 'open' : 'closed'}
      inert={!open}
      aria-hidden={!open}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>('button,select'),
        );
        if (event.shiftKey && document.activeElement === controls[0]) {
          event.preventDefault();
          controls.at(-1)?.focus();
        } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
          event.preventDefault();
          controls[0]?.focus();
        }
      }}
    >
      <section
        className="modal settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="group-dialog-top">
          <div className="modal-icon">
            <Languages size={24} />
          </div>
          <button className="icon-button" aria-label={t('Fechar configurações')} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <h2 id="settings-title">{t('Configurações')}</h2>
        <p>{t('Seu espaço, do seu jeito.')}</p>
        <label htmlFor="interface-language">{t('Idioma da interface')}</label>
        <select
          ref={select}
          id="interface-language"
          value={locale}
          onChange={(event) => onLanguage(event.target.value as Locale)}
        >
          {Object.entries(LANGUAGES).map(([id, label]) => (
            <option key={id} value={id} lang={id}>
              {label}
            </option>
          ))}
        </select>
        <p className="icon-storage-hint">
          {t('A escolha fica salva neste computador. Suas notas mantêm o texto original.')}
        </p>
        <div className="modal-actions">
          <button className="primary" onClick={onClose}>
            {t('Concluído')}
          </button>
        </div>
      </section>
    </div>
  );
}
