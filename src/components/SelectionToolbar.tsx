import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import type { EditorView } from '@codemirror/view';
import { Bold, Italic, Underline, Code2, List, ListOrdered } from 'lucide-react';
import { t } from '../i18n';
import type { FormatAction } from '../formatting';

export function SelectionToolbar({
  visual,
  source,
  enabled,
  revision,
  onFormat,
}: {
  visual?: Editor;
  source?: EditorView;
  enabled: boolean;
  revision: unknown;
  onFormat: (action: FormatAction) => void;
}) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const menu = useRef<HTMLDivElement>(null);
  const dismissed = useRef('');
  useEffect(() => {
    if (!enabled || (!visual && !source)) {
      setPosition(null);
      return;
    }
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const selection = visual?.state.selection || source?.state.selection.main;
        const dom = visual?.view.dom || source?.contentDOM;
        const key = `${selection?.from}:${selection?.to}`;
        if (dismissed.current && dismissed.current !== key) dismissed.current = '';
        const focused =
          visual?.isFocused || source?.hasFocus || menu.current?.contains(document.activeElement);
        if (
          !selection ||
          selection.from === selection.to ||
          !dom ||
          !focused ||
          dismissed.current === key
        ) {
          setPosition(null);
          return;
        }
        const range = window.getSelection();
        let rect: DOMRect | null = null;
        if (range?.rangeCount && range.anchorNode && dom.contains(range.anchorNode))
          rect = range.getRangeAt(0).getBoundingClientRect();
        if (!rect?.width) {
          const start = visual
            ? visual.view.coordsAtPos(selection.from)
            : source!.coordsAtPos(selection.from);
          const end = visual
            ? visual.view.coordsAtPos(selection.to)
            : source!.coordsAtPos(selection.to);
          if (!start || !end) {
            setPosition(null);
            return;
          }
          rect = new DOMRect(
            Math.min(start.left, end.left),
            Math.min(start.top, end.top),
            Math.max(1, Math.abs(end.left - start.left)),
            Math.max(start.bottom, end.bottom) - Math.min(start.top, end.top),
          );
        }
        const scroller =
          dom.closest('.visual-editor, .cm-scroller')?.getBoundingClientRect() ||
          dom.getBoundingClientRect();
        if (rect.bottom < scroller.top || rect.top > scroller.bottom) {
          setPosition(null);
          return;
        }
        const width = menu.current?.offsetWidth || 224;
        const top = Math.max(scroller.top, rect.top) - 46;
        setPosition({
          left: Math.max(
            8,
            Math.min(window.innerWidth - width - 8, rect.left + rect.width / 2 - width / 2),
          ),
          top: Math.min(window.innerHeight - 48, Math.max(36, top < 36 ? rect.bottom + 8 : top)),
        });
      });
    };
    const dismiss = () => {
      const selection = visual?.state.selection || source?.state.selection.main;
      dismissed.current = `${selection?.from}:${selection?.to}`;
      setPosition(null);
    };
    update();
    document.addEventListener('selectionchange', update);
    document.addEventListener('focusin', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    window.addEventListener('lume-dismiss-formatting', dismiss);
    visual?.on('transaction', update);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('selectionchange', update);
      document.removeEventListener('focusin', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
      window.removeEventListener('lume-dismiss-formatting', dismiss);
      visual?.off('transaction', update);
    };
  }, [visual, source, enabled, revision]);
  if (!enabled || !position) return null;
  return createPortal(
    <div
      ref={menu}
      className="selection-toolbar"
      style={position}
      role="toolbar"
      aria-label={t('Formatação da seleção')}
    >
      {(
        [
          ['bold', 'Negrito na seleção', Bold, 'bold'],
          ['italic', 'Itálico na seleção', Italic, 'italic'],
          ['underline', 'Sublinhar seleção', Underline, 'underline'],
          ['code', 'Código na seleção', Code2, 'code'],
          ['bullet', 'Marcadores na seleção', List, 'bulletList'],
          ['ordered', 'Numerar seleção', ListOrdered, 'orderedList'],
        ] as const
      ).map(([action, label, Icon, mark]) => (
        <button
          key={action}
          aria-label={t(label)}
          title={t(label)}
          aria-pressed={visual ? visual.isActive(mark) : undefined}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onFormat(action)}
        >
          <Icon size={16} />
        </button>
      ))}
    </div>,
    document.body,
  );
}
