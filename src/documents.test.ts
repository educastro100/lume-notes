import { describe, it, expect } from 'vitest';
import {
  decodeBytes,
  encodeText,
  restoreSession,
  newDocument,
  type Encoding,
  type Newline,
  DOCUMENT_ICONS,
} from './documents';
describe('text preservation', () => {
  for (const encoding of ['utf8', 'utf8-bom', 'utf16le', 'utf16be'] as Encoding[]) {
    for (const newline of ['LF', 'CRLF', 'CR'] as Newline[])
      it(`roundtrips ${encoding} / ${newline}`, () => {
        const content = 'Olá, mundo 🌻\nSegunda linha\n';
        expect(decodeBytes(encodeText(content, encoding, newline))).toEqual({
          content,
          encoding,
          newline,
        });
      });
  }
  it('refuses invalid UTF-8 instead of silently corrupting text', () =>
    expect(() => decodeBytes(new Uint8Array([0xc3, 0x28]))).toThrow());
  it('refuses binary files', () => expect(() => decodeBytes(new Uint8Array([0, 2, 3]))).toThrow());
});
describe('draft recovery', () => {
  it('restores the source/split choice and defaults older notes to visual mode without changing text', () => {
    const tab = newDocument('nota.md', '__original__\n');
    tab.presentation = 'source';
    tab.split = false;
    expect(
      restoreSession(JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id }))?.tabs[0],
    ).toEqual(tab);
    const { presentation: _mode, split: _split, ...legacy } = tab;
    expect(
      restoreSession(JSON.stringify({ version: 2, tabs: [legacy], activeId: tab.id }))?.tabs[0],
    ).toEqual({ ...tab, presentation: 'visual', split: true });
  });
  it('starts new unsaved notes as Markdown while keeping opened text files in text mode', () => {
    expect(newDocument()).toMatchObject({
      name: 'Sem título.md',
      path: null,
      mode: 'markdown',
      icon: 'file',
    });
    expect(newDocument('existente.txt').mode).toBe('text');
  });
  it('restores every supported icon without changing the document text or dirty state', () => {
    for (const icon of Object.keys(DOCUMENT_ICONS)) {
      const tab = { ...newDocument('nota.md', 'original'), icon, content: '**alterado**' };
      const restored = restoreSession(
        JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id }),
      );
      expect(restored?.tabs[0]).toEqual(tab);
    }
  });
  it('migrates notes without icons and ignores unknown icon identifiers', () => {
    const { icon: _icon, ...legacy } = newDocument('antigo.txt', 'preservar');
    for (const tab of [legacy, { ...legacy, icon: '__proto__' }, { ...legacy, icon: 123 }]) {
      const restored = restoreSession(
        JSON.stringify({ version: 2, tabs: [tab], activeId: tab.id }),
      );
      expect(restored?.tabs[0]).toEqual({ ...legacy, icon: 'file' });
    }
  });
  it('restores unsaved changes and their original baseline', () => {
    const tab = newDocument('texto.txt', 'original');
    tab.content = 'alterado';
    expect(restoreSession(JSON.stringify({ version: 1, tabs: [tab], activeId: tab.id }))).toEqual({
      tabs: [tab],
      activeId: tab.id,
      groups: [],
    });
  });
  it('rejects damaged sessions', () => {
    expect(restoreSession('{')).toBeNull();
    expect(restoreSession(JSON.stringify({ version: 1, tabs: [{ content: 3 }] }))).toBeNull();
  });
  it('rejects duplicate tab identities', () => {
    const tab = newDocument();
    expect(restoreSession(JSON.stringify({ version: 1, tabs: [tab, tab] }))).toBeNull();
  });
  it('migrates the original app session without losing dirty text or saved baseline', () => {
    const tab = newDocument('nota.txt', 'original');
    tab.content = 'texto ainda não salvo';
    const { groupId: _group, mode: _mode, ...legacy } = tab;
    const restored = restoreSession(
      JSON.stringify({ version: 1, tabs: [legacy], activeId: tab.id }),
    );
    expect(restored?.tabs[0]).toEqual({ ...tab, groupId: null, mode: 'text' });
    expect(restored?.groups).toEqual([]);
  });
  it('restores group names, colors, membership, collapsed state and Markdown mode', () => {
    const tab = newDocument('ideias.md', '**ideia**');
    tab.groupId = 'project';
    const groups = [{ id: 'project', name: 'Projeto', color: 'violet', collapsed: true }];
    expect(
      restoreSession(JSON.stringify({ version: 2, tabs: [tab], groups, activeId: tab.id })),
    ).toEqual({ tabs: [tab], groups, activeId: tab.id });
  });
  it('keeps documents when a group reference is missing or damaged', () => {
    const tab = newDocument('nota.txt', 'Não perder este texto');
    tab.groupId = 'missing';
    const restored = restoreSession(
      JSON.stringify({
        version: 2,
        tabs: [tab],
        groups: [{ id: 'missing', name: 'Grupo', color: '__proto__' }],
        activeId: 'missing',
      }),
    );
    expect(restored?.tabs[0].content).toBe(tab.content);
    expect(restored?.tabs[0].groupId).toBeNull();
    expect(restored?.activeId).toBe(tab.id);
    expect(restored?.groups).toEqual([]);
  });
  it('recovers more than one hundred valid tabs instead of discarding the session', () => {
    const tabs = Array.from({ length: 101 }, () => newDocument());
    expect(
      restoreSession(JSON.stringify({ version: 2, tabs, groups: [], activeId: tabs[100].id }))
        ?.tabs,
    ).toHaveLength(101);
  });
});

it('restores a deliberately empty workspace with its empty groups', () => {
  const groups = [{ id: 'g', name: 'Projeto', color: 'sage', collapsed: false }];
  expect(restoreSession(JSON.stringify({ version: 2, tabs: [], activeId: 'old', groups }))).toEqual(
    { tabs: [], activeId: '', groups },
  );
});
