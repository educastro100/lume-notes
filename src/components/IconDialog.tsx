import { t } from '../i18n';
import { X } from 'lucide-react';
import { DOCUMENT_ICONS, type DocumentIcon } from '../documents';
import { DocumentSymbol } from './DocumentSymbol';

export function IconDialog({
  icon,
  onSelect,
  onClose,
}: {
  icon: DocumentIcon;
  onSelect: (value: DocumentIcon) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="modal-backdrop"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
        if (event.key === 'Tab') {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
          );
          const first = controls[0],
            last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div
        className="modal icon-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="icon-dialog-title"
      >
        <div className="group-dialog-top">
          <div className="modal-icon">
            <DocumentSymbol icon={icon} size={25} />
          </div>
          <button
            className="icon-button"
            aria-label={t('Fechar seletor de ícone')}
            onClick={onClose}
            autoFocus
          >
            <X size={17} />
          </button>
        </div>
        <h2 id="icon-dialog-title">{t('Um ícone para esta nota')}</h2>
        <p>{t('Escolha um símbolo para reconhecer o assunto nas abas e no painel.')}</p>
        <div className="document-icon-grid">
          {Object.entries(DOCUMENT_ICONS).map(([value, label]) => (
            <button
              key={value}
              aria-label={t('Ícone {name}', { name: t(label) })}
              aria-pressed={icon === value}
              onClick={() => onSelect(value as DocumentIcon)}
            >
              <DocumentSymbol icon={value as DocumentIcon} size={22} />
              <span>{t(label)}</span>
            </button>
          ))}
        </div>
        <p className="icon-storage-hint">
          {t('A escolha fica salva no Lume, sem alterar o conteúdo do arquivo.')}
        </p>
      </div>
    </div>
  );
}
