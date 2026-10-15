import { useRef, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';
import type { DocumentTab } from '../documents';
import { noteNameParts, renamedNoteName } from '../noteNames';
import { t } from '../i18n';

export function NoteTitle({
  tab,
  disabled,
  onRename,
}: {
  tab: DocumentTab;
  disabled: boolean;
  onRename: (name: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const { extension } = noteNameParts(tab.name);
  const commit = async () => {
    if (submitting.current) return;
    let name: string;
    try {
      name = renamedNoteName(tab, title);
    } catch (error) {
      setError(String(error).replace(/^Error: /, ''));
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      if (await onRename(name)) setEditing(false);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };
  return (
    <div className="note-title">
      {!editing ? (
        <h1 aria-label={tab.name.replace(/\.(txt|md)$/i, '')}>
          <button
            className="title-button"
            aria-label={t('Editar título da nota')}
            title={t('Editar título da nota')}
            disabled={disabled}
            onClick={() => {
              setTitle(noteNameParts(tab.name).title);
              setError('');
              setEditing(true);
            }}
          >
            <span>{tab.name.replace(/\.(txt|md)$/i, '')}</span>
            <Pencil size={14} aria-hidden="true" />
          </button>
        </h1>
      ) : (
        <form
          className="title-editor"
          data-title-editor
          onSubmit={(event) => {
            event.preventDefault();
            void commit();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !pending) {
              event.stopPropagation();
              setEditing(false);
            }
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
              event.preventDefault();
              void commit();
            }
          }}
        >
          <div className="title-editor-row">
            <input
              aria-label={t('Título da nota')}
              aria-describedby="title-edit-hint"
              aria-invalid={!!error}
              value={title}
              autoFocus
              disabled={pending}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => {
                setTitle(event.target.value);
                setError('');
              }}
            />
            <span className="title-extension">{extension}</span>
            <button
              className="icon-button"
              type="submit"
              disabled={pending}
              aria-label={t('Confirmar título')}
            >
              <Check size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              disabled={pending}
              aria-label={t('Cancelar edição do título')}
              onClick={() => setEditing(false)}
            >
              <X size={16} />
            </button>
          </div>
          <span
            id="title-edit-hint"
            className={`title-hint ${error ? 'has-error' : ''}`}
            role={error ? 'alert' : undefined}
          >
            {error ||
              t(
                tab.path
                  ? 'Enter confirma e renomeia o arquivo nesta pasta. Esc cancela.'
                  : 'Enter confirma. Este nome será sugerido ao salvar o arquivo.',
              )}
          </span>
        </form>
      )}
    </div>
  );
}
