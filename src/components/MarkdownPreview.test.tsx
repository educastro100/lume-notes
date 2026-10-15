import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownPreview } from './MarkdownPreview';
describe('Markdown preview', () => {
  it('renders the underline extension while still dropping arbitrary HTML', () => {
    const result = renderToStaticMarkup(
      <MarkdownPreview content={'<u>ideia **forte**</u>\n\n<script>bad()</script>'} />,
    );
    expect(result).toContain('<u>ideia <strong>forte</strong></u>');
    expect(result).not.toContain('<script');
  });
  it('renders formatting and dividers as semantic elements', () => {
    const result = renderToStaticMarkup(
      <MarkdownPreview
        content={'**Negrito** e *itálico* com `código`\n\n---\n\n```js\nconst x=1;\n```'}
      />,
    );
    expect(result).toContain('<strong>Negrito</strong>');
    expect(result).toContain('<em>itálico</em>');
    expect(result).toContain('<code>código</code>');
    expect(result).toContain('<hr/>');
    expect(result).toContain('<pre>');
  });
  it('does not execute HTML, navigate away, or load external document images', () => {
    const result = renderToStaticMarkup(
      <MarkdownPreview
        content={
          '<script>alert(1)</script>\n\n![imagem](https://example.com/image.png)\n\n[link](https://example.com)'
        }
      />,
    );
    expect(result).not.toContain('<script');
    expect(result).not.toContain('<img');
    expect(result).not.toContain('href=');
    expect(result).toContain('[Imagem: imagem]');
  });
});
