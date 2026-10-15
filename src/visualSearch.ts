import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';

export const visualSearchKey = new PluginKey<string>('lumeSearch');
export function visualMatches(doc: Node, query: string) {
  if (!query) return [];
  const result: { from: number; to: number }[] = [];
  // A textblock can contain several text nodes (bold, italic, links...).
  doc.descendants((block, pos) => {
    if (!block.isTextblock) return;
    let text = '';
    const positions: number[] = [];
    block.descendants((node, offset) => {
      if (node.isText) {
        for (let i = 0; i < node.text!.length; i++) {
          text += node.text![i];
          positions.push(pos + 1 + offset + i);
        }
      } else if (node.isLeaf) {
        text += '\n';
        positions.push(pos + 1 + offset);
      }
    });
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    for (const match of text.matchAll(new RegExp(escaped, 'giu'))) {
      const index = match.index!;
      result.push({ from: positions[index], to: positions[index + match[0].length - 1] + 1 });
    }
    return false;
  });
  return result;
}

export const VisualSearch = Extension.create({
  name: 'lumeSearch',
  addProseMirrorPlugins() {
    return [
      new Plugin<string>({
        key: visualSearchKey,
        state: {
          init: () => '',
          apply: (tr, query) => tr.getMeta(visualSearchKey) ?? query,
        },
        props: {
          decorations(state) {
            const matches = visualMatches(state.doc, visualSearchKey.getState(state) || '');
            return DecorationSet.create(
              state.doc,
              matches.map(({ from, to }) =>
                Decoration.inline(from, to, {
                  class:
                    state.selection.from === from && state.selection.to === to
                      ? 'search-match current-search-match'
                      : 'search-match',
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});
