import { useCallback, useEffect, useRef, useState } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { native, isInstalled } from './platform';
import { t } from './i18n';

export type UpdatePhase =
  'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'current' | 'error';
export class UpdatePreparationError extends Error {}
export interface UpdateController {
  installed: boolean | null;
  phase: UpdatePhase;
  version: string;
  notes: string;
  progress: number | null;
  error: string;
  dismissed: boolean;
  checkNow: () => Promise<void>;
  install: () => Promise<void>;
  dismiss: () => void;
}
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;
export function useUpdates({
  enabled,
  automatic,
  onInstall,
}: {
  enabled: boolean;
  automatic: boolean;
  onInstall: (install: () => Promise<void>) => Promise<void>;
}): UpdateController {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const update = useRef<Update | null>(null);
  const downloaded = useRef(false);
  const working = useRef(false);
  const live = useRef(true);
  const callback = useRef(onInstall);
  callback.current = onInstall;
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      void update.current?.close().catch(() => {});
    };
  }, []);
  useEffect(() => {
    if (!native || !enabled) return;
    let active = true;
    void isInstalled()
      .then((value) => {
        if (active) setInstalled(value);
      })
      .catch(() => {
        if (active) {
          setInstalled(false);
          setError(t('Não foi possível verificar a instalação do Lume.'));
        }
      });
    return () => {
      active = false;
    };
  }, [enabled]);
  const checkNow = useCallback(async () => {
    if (!native || !enabled || !installed || working.current) return;
    working.current = true;
    setPhase('checking');
    setError('');
    const previous = update.current;
    update.current = null;
    downloaded.current = false;
    setVersion('');
    setNotes('');
    try {
      await previous?.close();
      const found = await check({ timeout: 15000 });
      if (!live.current) {
        await found?.close();
        return;
      }
      update.current = found;
      setVersion(found?.version || '');
      setNotes(found?.body || '');
      setPhase(found ? 'available' : 'current');
      setDismissed(false);
      try {
        localStorage.setItem('lume.update-check.v1', String(Date.now()));
      } catch {}
    } catch {
      if (live.current) {
        setPhase('error');
        setError(
          t('Não foi possível verificar atualizações. Confira sua conexão e tente novamente.'),
        );
      }
    } finally {
      working.current = false;
    }
  }, [enabled, installed]);
  useEffect(() => {
    if (!automatic || !enabled || !native || !installed) return;
    let last = 0;
    try {
      last = Number(localStorage.getItem('lume.update-check.v1')) || 0;
    } catch {}
    const age = Date.now() - last;
    if (age >= 0 && age < CHECK_INTERVAL) return;
    const timer = setTimeout(() => {
      void checkNow();
    }, 10000);
    return () => clearTimeout(timer);
  }, [automatic, enabled, installed, checkNow]);
  const install = useCallback(async () => {
    const candidate = update.current;
    if (!candidate || working.current || !installed) return;
    working.current = true;
    setError('');
    let stage: 'download' | 'install' = 'download';
    try {
      if (!downloaded.current) {
        setPhase('downloading');
        setProgress(null);
        let total = 0,
          received = 0;
        await candidate.download(
          (event) => {
            if (!live.current) return;
            if (event.event === 'Started') {
              total = event.data.contentLength || 0;
              received = 0;
            }
            if (event.event === 'Progress') received += event.data.chunkLength;
            setProgress(
              event.event === 'Finished'
                ? 100
                : total
                  ? Math.min(100, Math.round((received * 100) / total))
                  : null,
            );
          },
          { timeout: 120000 },
        );
        downloaded.current = true;
      }
      if (!live.current) return;
      stage = 'install';
      setPhase('installing');
      // Persist the latest session only after download, while the editor is locked.
      await callback.current(() => candidate.install());
    } catch (reason) {
      if (live.current) {
        setPhase('error');
        setError(
          reason instanceof UpdatePreparationError
            ? reason.message
            : t(
                stage === 'download'
                  ? 'Não foi possível baixar ou validar a atualização. Tente novamente.'
                  : 'Não foi possível instalar a atualização. Tente novamente.',
              ),
        );
      }
    } finally {
      working.current = false;
    }
  }, [installed]);
  return {
    installed,
    phase,
    version,
    notes,
    progress,
    error,
    dismissed,
    checkNow,
    install,
    dismiss: () => setDismissed(true),
  };
}
