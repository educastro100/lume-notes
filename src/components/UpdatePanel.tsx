import { Download, RefreshCw, ArrowUpRight } from 'lucide-react';
import type { UpdateController } from '../useUpdates';
import { t } from '../i18n';
import { openReleaseDownloads } from '../platform';
import { version } from '../../package.json';
export function UpdatePanel({
  updates,
  automatic,
  onAutomatic,
}: {
  updates: UpdateController;
  automatic: boolean;
  onAutomatic: (value: boolean) => void;
}) {
  const busy = ['checking', 'downloading', 'installing'].includes(updates.phase);
  return (
    <section className="settings-section update-panel" aria-labelledby="updates-title">
      <h3 id="updates-title">
        {t('Atualizações')}
        <span className="version-chip">v{version}</span>
      </h3>
      {updates.installed === false ? (
        <>
          <p>
            {t(
              'Instale o Lume para receber atualizações pelo aplicativo. Seus rascunhos serão recuperados.',
            )}
          </p>
          <button className="integration-button" onClick={() => void openReleaseDownloads()}>
            {t('Ver instaladores')}
            <ArrowUpRight size={13} />
          </button>
        </>
      ) : (
        <>
          <label className="setting-toggle">
            <span>{t('Verificar automaticamente')}</span>
            <input
              type="checkbox"
              role="switch"
              checked={automatic}
              disabled={updates.phase === 'installing'}
              onChange={(event) => onAutomatic(event.target.checked)}
            />
          </label>
          <p>{t('O Lume avisa quando há uma versão nova. Você escolhe quando instalar.')}</p>
          {updates.version && (
            <div className="update-release">
              <strong>{t('Lume {version} disponível', { version: updates.version })}</strong>
              {updates.notes && <p className="update-notes">{updates.notes}</p>}
            </div>
          )}
          {updates.phase === 'downloading' && (
            <div className="update-progress">
              <progress
                max={100}
                value={updates.progress ?? undefined}
                aria-label={t('Progresso da atualização')}
              />
              <span>
                {updates.progress === null
                  ? t('Baixando atualização…')
                  : t('Baixando atualização… {progress}%', { progress: updates.progress })}
              </span>
            </div>
          )}
          {updates.phase === 'installing' && (
            <p role="status">{t('Guardando seus rascunhos e reiniciando para atualizar…')}</p>
          )}
          {updates.phase === 'current' && (
            <p role="status">{t('Você está usando a versão mais recente.')}</p>
          )}
          <div className="update-actions">
            <button
              className="integration-button"
              disabled={busy || updates.installed === null}
              onClick={() => void updates.checkNow()}
            >
              <RefreshCw size={13} className={updates.phase === 'checking' ? 'spin' : ''} />
              {t(updates.phase === 'checking' ? 'Verificando…' : 'Verificar atualizações')}
            </button>
            {updates.version && (
              <button
                className="primary update-install-button"
                disabled={busy}
                onClick={() => void updates.install()}
              >
                <Download size={14} />
                {t('Atualizar e reiniciar')}
              </button>
            )}
          </div>
        </>
      )}
      {updates.error && (
        <p role="alert" className="settings-error">
          {updates.error}
        </p>
      )}
    </section>
  );
}
