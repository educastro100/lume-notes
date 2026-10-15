import { t } from '../i18n';
import { useState } from 'react';
import { FolderOpen, X, Check } from 'lucide-react';
import { GROUP_COLORS, type GroupColor, type TabGroup } from '../documents';
const colorNames: Record<GroupColor, string> = {
  sage: 'Sálvia',
  blue: 'Azul',
  rose: 'Rosa',
  amber: 'Âmbar',
  violet: 'Violeta',
  teal: 'Turquesa',
  orange: 'Laranja',
  coral: 'Coral',
  olive: 'Oliva',
  cyan: 'Ciano',
  lavender: 'Lavanda',
  stone: 'Pedra',
};

export function GroupDialog({
  group,
  onSave,
  onCancel,
}: {
  group: TabGroup | null;
  onSave: (name: string, color: GroupColor) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(group?.name || '');
  const [color, setColor] = useState<GroupColor>(group?.color || 'sage');
  return (
    <div
      className="modal-backdrop"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
        if (event.key === 'Tab') {
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>('input,button'),
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
      <form
        className="modal group-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-dialog-title"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim()) onSave(name.trim(), color);
        }}
      >
        <div className="group-dialog-top">
          <div className="modal-icon">
            <FolderOpen size={25} />
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={t('Cancelar grupo')}
            onClick={onCancel}
          >
            <X size={17} />
          </button>
        </div>
        <h2 id="group-dialog-title">
          {group ? t('Editar grupo') : t('Um lugar para cada assunto')}
        </h2>
        <p>{t('Agrupe suas notas por projeto, tema ou pelo que fizer sentido para você.')}</p>
        <label htmlFor="group-name">{t('Nome do grupo')}</label>
        <input
          id="group-name"
          autoFocus
          maxLength={60}
          placeholder={t('Ex.: Trabalho, Estudos, Ideias…')}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label>{t('Cor do grupo')}</label>
        <div className="group-colors">
          {Object.entries(GROUP_COLORS).map(([key, value]) => (
            <button
              type="button"
              key={key}
              aria-label={t('Cor {name}', { name: t(colorNames[key as GroupColor]) })}
              aria-pressed={key === color}
              style={{ background: value }}
              onClick={() => setColor(key as GroupColor)}
            >
              {key === color && <Check size={16} />}
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            {t('Cancelar')}
          </button>
          <button type="submit" className="primary" disabled={!name.trim()}>
            {group ? t('Salvar grupo') : t('Criar grupo')}
          </button>
        </div>
      </form>
    </div>
  );
}
