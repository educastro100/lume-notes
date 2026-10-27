import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, CircleHelp, Keyboard, X } from 'lucide-react';
import { native, openWithStatus, setOpenWith, openDefaultApps } from '../platform';
import { t, type Locale } from '../i18n';
import { LanguagePicker } from './LanguagePicker';
import { HelpSection, ShortcutsSection } from './HelpSection';
import { UpdatePanel } from './UpdatePanel';
import { STORE_BUILD } from '../distribution';
import type { UpdateController } from '../useUpdates';

const pages = [
  { id: 'settings', label: 'Configurações', icon: SlidersHorizontal },
  { id: 'help', label: 'Ajuda', icon: CircleHelp },
  { id: 'shortcuts', label: 'Atalhos', icon: Keyboard },
] as const;
type SettingsPage = (typeof pages)[number]['id'];

export function SettingsDialog({
  open,
  locale,
  onLanguage,
  onClose,
  automaticTheme,
  onAutomaticTheme,
  updates,
  automaticUpdates = true,
  onAutomaticUpdates = () => {},
}: {
  updates?: UpdateController;
  automaticUpdates?: boolean;
  onAutomaticUpdates?: (value: boolean) => void;
  open: boolean;
  automaticTheme: boolean;
  onAutomaticTheme: (value: boolean) => void;
  locale: Locale;
  onLanguage: (value: Locale) => void;
  onClose: () => void;
}) {
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [integrating, setIntegrating] = useState(false);
  const [integrationError, setIntegrationError] = useState('');
  const [page, setPage] = useState<SettingsPage>('settings');
  const tabButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const panel = useRef<HTMLDivElement>(null);
  const currentPage = pages.find((item) => item.id === page)!;
  const PageIcon = currentPage.icon;
  useEffect(() => {
    panel.current?.scrollTo?.({ top: 0 });
  }, [page]);
  useEffect(() => {
    if (!open || !native) return;
    let live = true;
    void openWithStatus()
      .then((value) => {
        if (live) setRegistered(value);
      })
      .catch(() => {
        if (live) {
          setRegistered(false);
          setIntegrationError(t('Não foi possível verificar a integração com o Windows.'));
        }
      });
    return () => {
      live = false;
    };
  }, [open]);
  const locked = updates?.phase === 'installing';
  const previous = useRef<HTMLElement | null>(null);
  const [present, setPresent] = useState(open);
  useEffect(() => {
    if (open) {
      setPage('settings');
      setPresent(true);
      return;
    }
    const timer = setTimeout(() => setPresent(false), 180);
    return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    if (open && present) {
      if (!previous.current) previous.current = document.activeElement as HTMLElement | null;
      tabButtons.current[0]?.focus();
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
        if (event.key === 'Escape' && !locked) {
          event.stopPropagation();
          onClose();
        }
        if (event.key !== 'Tab') return;
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled):not([tabindex="-1"]),select:not(:disabled),input:not(:disabled),[tabindex="0"]',
          ),
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
            <PageIcon size={24} />
          </div>
          <button
            className="icon-button"
            aria-label={t('Fechar configurações')}
            disabled={locked}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="settings-title">{t(currentPage.label)}</h2>
        <p>{t('Seu espaço, do seu jeito.')}</p>
        <div className="settings-tabs" role="tablist" aria-label={t('Seções do Lume')}>
          {pages.map(({ id, label, icon: Icon }, index) => (
            <button
              key={id}
              ref={(node) => {
                tabButtons.current[index] = node;
              }}
              type="button"
              id={`settings-tab-${id}`}
              role="tab"
              aria-selected={page === id}
              aria-controls={`settings-panel-${id}`}
              tabIndex={page === id ? 0 : -1}
              disabled={locked}
              onClick={() => setPage(id)}
              onKeyDown={(event) => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const next =
                  event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? pages.length - 1
                      : (index + (event.key === 'ArrowRight' ? 1 : -1) + pages.length) %
                        pages.length;
                setPage(pages[next].id);
                tabButtons.current[next]?.focus();
              }}
            >
              <Icon size={15} />
              <span>{t(label)}</span>
            </button>
          ))}
        </div>
        <div
          className="settings-tab-panel"
          key={page}
          ref={panel}
          role="tabpanel"
          id={`settings-panel-${page}`}
          aria-labelledby={`settings-tab-${page}`}
          tabIndex={0}
        >
          {page === 'settings' && (
            <>
              <label id="interface-language-label" htmlFor="interface-language">
                {t('Idioma da interface')}
              </label>
              <LanguagePicker value={locale} onChange={onLanguage} disabled={locked} />
              <p className="icon-storage-hint">
                {t('A escolha fica salva neste computador. Suas notas mantêm o texto original.')}
              </p>
              <div className="settings-section">
                <label className="setting-toggle">
                  <span>{t('Tema automático')}</span>
                  <input
                    type="checkbox"
                    role="switch"
                    disabled={locked}
                    checked={automaticTheme}
                    onChange={(event) => onAutomaticTheme(event.target.checked)}
                  />
                </label>
                <p>
                  {t(
                    'Manhã 5h–10h · Dia 10h–15h · Tarde 15h–19h · Noite 19h–0h · Madrugada 0h–5h. Horário local.',
                  )}
                </p>
                <p>{t('Escolher um tema manualmente desativa o modo automático.')}</p>
              </div>
              {native && (
                <div className="settings-section">
                  <h3>{t('Integração com o Windows')}</h3>
                  <p>
                    {t(
                      STORE_BUILD
                        ? 'O Abrir com desta edição é gerenciado pelo Windows.'
                        : 'Adicione o Lume ao menu Abrir com para arquivos de texto e Markdown. O aplicativo padrão não será alterado.',
                    )}
                  </p>
                  {!STORE_BUILD && (
                    <button
                      className="integration-button"
                      disabled={locked || integrating || registered === null}
                      onClick={() => {
                        setIntegrating(true);
                        setIntegrationError('');
                        void setOpenWith(updates?.installed ? true : !registered)
                          .then(setRegistered)
                          .catch((error) =>
                            setIntegrationError(String(error).replace(/^Error: /, '')),
                          )
                          .finally(() => setIntegrating(false));
                      }}
                    >
                      {t(
                        integrating
                          ? 'Atualizando…'
                          : registered
                            ? updates?.installed
                              ? 'Reparar integração'
                              : 'Remover do Abrir com'
                            : 'Adicionar ao Abrir com',
                      )}
                    </button>
                  )}
                  <button
                    className="integration-button default-apps-button"
                    disabled={locked || integrating}
                    onClick={() => {
                      setIntegrating(true);
                      setIntegrationError('');
                      void openDefaultApps()
                        .then(() => setRegistered(true))
                        .catch(() =>
                          setIntegrationError(
                            t('Não foi possível abrir os aplicativos padrão do Windows.'),
                          ),
                        )
                        .finally(() => setIntegrating(false));
                    }}
                  >
                    {t('Escolher padrões do Windows')}
                  </button>
                  <p>
                    {t(
                      'Escolha no Windows quais extensões devem abrir no Lume. Suas escolhas atuais são mantidas até você alterá-las.',
                    )}
                  </p>
                  {integrationError && <p role="alert">{integrationError}</p>}
                </div>
              )}
              {native && updates && (
                <UpdatePanel
                  updates={updates}
                  automatic={automaticUpdates}
                  onAutomatic={onAutomaticUpdates}
                />
              )}
            </>
          )}
          {page === 'help' && <HelpSection disabled={locked} />}
          {page === 'shortcuts' && <ShortcutsSection />}
        </div>
        <div className="modal-actions">
          <button className="primary" disabled={locked} onClick={onClose}>
            {t('Concluído')}
          </button>
        </div>
      </section>
    </div>
  );
}
