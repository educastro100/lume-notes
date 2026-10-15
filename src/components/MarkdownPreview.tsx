import { t } from '../i18n';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { remarkUnderline } from '../remarkUnderline';
export function MarkdownPreview({ content, wrap = true }: { content: string; wrap?: boolean }) {
  return (
    <article
      className={`markdown-preview ${wrap ? '' : 'no-wrap'}`}
      aria-label={t('Prévia Markdown')}
    >
      <div className="preview-eyebrow">{t('PRÉVIA · MARKDOWN')}</div>
      <Markdown
        remarkPlugins={[remarkGfm, remarkUnderline]}
        skipHtml
        components={{
          a: ({ children }) => <span className="preview-link">{children}</span>,
          img: ({ alt }) => (
            <span className="preview-image-label">
              [{t('Imagem: {name}', { name: alt || t('sem descrição') })}]
            </span>
          ),
        }}
      >
        {content || t('*Sua prévia aparece aqui enquanto você escreve.*')}
      </Markdown>
    </article>
  );
}
