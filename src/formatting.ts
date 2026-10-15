export type FormatAction = 'bold' | 'italic' | 'code' | 'rule' | 'underline' | 'bullet' | 'ordered';
export interface FormatEdit {
  from: number;
  to: number;
  insert: string;
  anchor: number;
  head: number;
}

/** Pure edits keep Markdown transparent and preserve the editor's undo history. */
export function formatEdit(
  text: string,
  from: number,
  to: number,
  action: FormatAction,
): FormatEdit {
  const selected = text.slice(from, to);
  if (action === 'bullet' || action === 'ordered') {
    const start = text.lastIndexOf('\n', from - 1) + 1;
    const endAt = text.indexOf('\n', to > from && text[to - 1] === '\n' ? to - 1 : to);
    const end = endAt < 0 ? text.length : endAt;
    const lines = text.slice(start, end).split('\n');
    const same = action === 'bullet' ? /^\s*[-+*] / : /^\s*\d+[.)] /;
    const remove = lines.every((line) => !line.trim() || same.test(line));
    let number = 1;
    const insert = lines
      .map((line) => {
        const match = line.match(/^(\s*)(?:[-+*]|\d+[.)])\s+(.*)$/);
        const indent = match?.[1] || line.match(/^\s*/)?.[0] || '';
        const body = match?.[2] ?? line.slice(indent.length);
        if (remove) return indent + body;
        return indent + (action === 'bullet' ? '- ' : `${number++}. `) + body;
      })
      .join('\n');
    return { from: start, to: end, insert, anchor: start, head: start + insert.length };
  }
  if (action === 'underline') {
    const before = text.slice(0, from),
      after = text.slice(to);
    if (selected && before.endsWith('<u>') && after.startsWith('</u>'))
      return { from: from - 3, to: to + 4, insert: selected, anchor: from - 3, head: to - 3 };
    if (selected.startsWith('<u>') && selected.endsWith('</u>')) {
      const body = selected.slice(3, -4);
      return { from, to, insert: body, anchor: from, head: from + body.length };
    }
    const body = selected || 'texto';
    return { from, to, insert: `<u>${body}</u>`, anchor: from + 3, head: from + 3 + body.length };
  }
  if (action === 'rule') {
    const before = text.slice(0, from);
    const after = text.slice(to);
    const leading = !before || before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const insert = leading + '---\n\n';
    const trailing = after.startsWith('\n') ? to + 1 : to;
    return { from, to: trailing, insert, anchor: from + insert.length, head: from + insert.length };
  }
  let marker = action === 'bold' ? '**' : action === 'italic' ? '*' : '`';
  if (action === 'code') {
    const maxTicks = Math.max(0, ...Array.from(selected.matchAll(/`+/g), (m) => m[0].length));
    marker = '`'.repeat(Math.max(selected.includes('\n') ? 3 : 1, maxTicks + 1));
    if (selected.includes('\n')) {
      const body = selected || 'código';
      const prefix = text.slice(0, from).endsWith('\n') || from === 0 ? '' : '\n';
      const insert = prefix + marker + '\n' + body + '\n' + marker + '\n';
      const anchor = from + prefix.length + marker.length + 1;
      return { from, to, insert, anchor, head: anchor + body.length };
    }
  }
  const before = text.slice(0, from),
    after = text.slice(to);
  const starRuns =
    action === 'italic'
      ? (before.match(/\*+$/)?.[0].length || 0) % 2 === 1 &&
        (after.match(/^\*+/)?.[0].length || 0) % 2 === 1
      : true;
  if (selected && before.endsWith(marker) && after.startsWith(marker) && starRuns) {
    return {
      from: from - marker.length,
      to: to + marker.length,
      insert: selected,
      anchor: from - marker.length,
      head: to - marker.length,
    };
  }
  if (
    selected.length > marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const insert = selected.slice(marker.length, -marker.length);
    return { from, to, insert, anchor: from, head: from + insert.length };
  }
  const body = selected || (action === 'code' ? 'código' : 'texto');
  const insert = marker + body + marker;
  return {
    from,
    to,
    insert,
    anchor: from + marker.length,
    head: from + marker.length + body.length,
  };
}
