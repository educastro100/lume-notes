import { useState } from 'react';
import { CircleHelp, ExternalLink } from 'lucide-react';
import { t } from '../i18n';
import { openProjectPage } from '../platform';

const shortcuts = [
  ['Novo arquivo', 'Ctrl + N'],
  ['Abrir arquivo…', 'Ctrl + O'],
  ['Salvar', 'Ctrl + S'],
  ['Salvar como…', 'Ctrl + Shift + S'],
  ['Fechar aba', 'Ctrl + W'],
  ['Buscar e substituir', 'Ctrl + F'],
  ['Desfazer / refazer', 'Ctrl + Z / Ctrl + Y'],
  ['Alternar abas', 'Ctrl + Tab / Ctrl + Shift + Tab'],
  ['Negrito', 'Ctrl + B'],
  ['Itálico', 'Ctrl + I'],
  ['Sublinhado', 'Ctrl + U'],
  ['Código em linha ou bloco', 'Ctrl + Shift + C'],
  ['Recuar / remover recuo', 'Tab / Shift + Tab'],
  ['Tamanho da fonte', 'Ctrl + + / Ctrl + −'],
  ['Restaurar fonte', 'Ctrl + 0'],
  ['Modo foco', 'F8'],
  ['Fechar painéis / sair do foco', 'Esc'],
] as const;
export function HelpSection({ disabled }: { disabled?: boolean }) {
  const [error, setError] = useState(false);
  const open = (page: 'issues' | 'project') => {
    setError(false);
    void openProjectPage(page).catch(() => setError(true));
  };
  return (
    <details className="settings-section help-section">
      <summary>
        <CircleHelp size={17} />
        <span>{t('Ajuda e atalhos')}</span>
      </summary>
      <p>
        {t(
          'Os atalhos funcionam no documento ativo. No editor visual, selecione o texto para aplicar a formatação.',
        )}
      </p>
      <table className="shortcut-table">
        <caption>{t('Atalhos de teclado')}</caption>
        <tbody>
          {shortcuts.map(([label, keys]) => (
            <tr key={label}>
              <th scope="row">{t(label)}</th>
              <td>
                <kbd>{keys}</kbd>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="help-links">
        <button disabled={disabled} onClick={() => open('issues')}>
          <ExternalLink size={14} />
          {t('Relatar um problema ou sugerir uma melhoria')}
        </button>
        <button disabled={disabled} onClick={() => open('project')}>
          <ExternalLink size={14} />
          {t('Conhecer o projeto no GitHub')}
        </button>
      </div>
      <p>
        {t(
          'Para abrir uma issue, entre na sua conta do GitHub. Descreva os passos e a versão do Lume; compartilhe apenas o conteúdo que quiser tornar público.',
        )}
      </p>
      {error && <p role="alert">{t('Não foi possível abrir o GitHub. Tente novamente.')}</p>}
    </details>
  );
}
