import { t } from '../i18n';
import { useEffect, useMemo, useRef } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import { visualExtensions } from '../visualMarkdown';
import { useLanguage } from '../i18n';
import { visualSearchKey } from '../visualSearch';
import type { DocumentTab } from '../documents';

export function VisualEditor({
  tab,
  active,
  fontSize,
  wrap = true,
  searchQuery = '',
  onChange,
  onEditor,
  onSelection,
}: {
  tab: DocumentTab;
  active: boolean;
  fontSize: number;
  wrap?: boolean;
  searchQuery?: string;
  onChange: (value: string) => void;
  onEditor: (editor: Editor | null) => void;
  onSelection: (stats: { line: number; column: number; selected: number }) => void;
}) {
  const [locale] = useLanguage();
  const callbacks = useRef({ onChange, onEditor, onSelection, active });
  callbacks.current = { onChange, onEditor, onSelection, active };
  const lastContent = useRef(tab.content);
  const extensions = useMemo(visualExtensions, []);
  const editor = useEditor({
    extensions,
    content: tab.content,
    contentType: 'markdown',
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': t('Editar Markdown visualmente'),
        'aria-multiline': 'true',
        spellcheck: 'true',
      },
      handleClick: (_view, _pos, event) => {
        if ((event.target as Element)?.closest('a')) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const value = editor.getMarkdown();
      lastContent.current = value;
      callbacks.current.onChange(value);
    },
    onTransaction: ({ editor, transaction }) => {
      callbacks.current.onEditor(editor);
      if (
        !callbacks.current.active ||
        !(transaction.docChanged || transaction.selectionSet || transaction.storedMarksSet)
      )
        return;
      const { from, to, $from } = editor.state.selection;
      const before = editor.state.doc.textBetween(0, from, '\n');
      callbacks.current.onSelection({
        line: before.split('\n').length,
        column: $from.parentOffset + 1,
        selected: editor.state.doc.textBetween(from, to).length,
      });
    },
  });
  useEffect(() => {
    if (editor)
      editor.setOptions({
        editorProps: {
          ...editor.options.editorProps,
          attributes: {
            role: 'textbox',
            'aria-label': t('Editar Markdown visualmente'),
            'aria-multiline': 'true',
            spellcheck: 'true',
            lang: locale,
          },
        },
      });
  }, [editor, locale]);
  useEffect(() => {
    if (editor) callbacks.current.onEditor(editor);
    return () => callbacks.current.onEditor(null);
  }, [editor]);
  useEffect(() => {
    if (editor && tab.content !== lastContent.current) {
      editor.commands.setContent(tab.content, { contentType: 'markdown', emitUpdate: false });
      lastContent.current = tab.content;
    }
  }, [editor, tab.content]);
  useEffect(() => {
    if (!active) return;
    const frame = requestAnimationFrame(() => {
      if (!editor?.isDestroyed) editor?.commands.focus(undefined, { scrollIntoView: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [active, editor]);
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(
        editor.state.tr
          .setMeta(visualSearchKey, active ? searchQuery : '')
          .setMeta('addToHistory', false),
      );
    }
  }, [editor, active, searchQuery]);
  return (
    <div className={`visual-editor ${wrap ? '' : 'no-wrap'}`} hidden={!active} style={{ fontSize }}>
      <EditorContent editor={editor} />
    </div>
  );
}
