import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type CSSProperties,
} from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView, keymap, type ViewUpdate } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { indentWithTab, undo, redo, history } from '@codemirror/commands';
import { openSearchPanel, search } from '@codemirror/search';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import {
  FileText,
  Plus,
  X,
  Search,
  FolderOpen,
  Save,
  WrapText,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ArrowUpRight,
  Check,
  AlertCircle,
  MoreHorizontal,
  Sparkles,
  Minus,
  RotateCcw,
  RotateCw,
  Bold,
  Italic,
  Code2,
  SeparatorHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Underline,
  List,
  ListOrdered,
  Settings,
  Scan,
  Minimize2,
  Eye,
  CodeXml,
} from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  isDirty,
  newDocument,
  restoreSession,
  type DocumentTab,
  type TabGroup,
  type GroupColor,
} from './documents';
import {
  native,
  openDocuments,
  saveDocument,
  renameDocument,
  loadDrafts,
  storeDrafts,
} from './platform';
import { formatEdit, type FormatAction } from './formatting';
import { GroupDialog } from './components/GroupDialog';
import { SidebarFiles } from './components/SidebarFiles';
import { TabStrip } from './components/TabStrip';
import { MarkdownPreview } from './components/MarkdownPreview';
import { IconDialog } from './components/IconDialog';
import { DocumentSymbol } from './components/DocumentSymbol';
import { DOCUMENT_ICONS, type DocumentIcon } from './documents';
import { SettingsDialog } from './components/SettingsDialog';
import { NoteTitle } from './components/NoteTitle';
import { isUiTextField } from './noteNames';
import { ThemeIcon } from './components/ThemeIcon';
import { t, useLanguage } from './i18n';
import { version as appVersion } from '../package.json';
import { VisualEditor } from './components/VisualEditor';
import type { Editor as VisualEditorInstance } from '@tiptap/react';
import { visualFormat, needsSourceEditing, findVisual } from './visualMarkdown';
import { rangeSelection } from './selection';
import { separateCodeInputs } from './codeInput';
import { ResizeDivider } from './components/ResizeDivider';
import { FontSizeControl } from './components/FontSizeControl';
import {
  parsePreferences,
  parseTheme,
  THEME_NAMES,
  FONT_MIN,
  FONT_MAX,
  clamp,
  type Theme,
} from './preferences';

const welcome = `Um espaço para suas ideias.\n\nEscreva um rascunho, organize um pensamento ou simplesmente comece.\nO Lume cuida do resto.\n\n• Abra arquivos com Ctrl + O\n• Salve com Ctrl + S\n• Crie uma nova nota com Ctrl + N\n• Encontre qualquer trecho com Ctrl + F\n\nSuas abas e seus rascunhos são recuperados quando você voltar.\n\nBoa escrita.\n`;
type Prompt = {
  title: string;
  body: string;
  choices: { label: string; value: string; danger?: boolean }[];
  resolve: (value: string) => void;
};
type Stats = { line: number; column: number; selected: number };
const initialTab = () => newDocument(t('Comece por aqui.txt'), t(welcome));
const BASIC_SETUP = {
  foldGutter: false,
  history: false,
  highlightActiveLine: true,
  highlightActiveLineGutter: false,
  autocompletion: false,
  closeBrackets: false,
  bracketMatching: true,
  searchKeymap: true,
  tabSize: 2,
};

function TextEditor({
  tab,
  theme,
  fontSize,
  wrap,
  active,
  onChange,
  onView,
  onPosition,
  locale,
}: {
  tab: DocumentTab;
  theme: Theme;
  locale: string;
  fontSize: number;
  wrap: boolean;
  active: boolean;
  onChange: (value: string) => void;
  onView: (view: EditorView) => void;
  onPosition: (stats: Stats) => void;
}) {
  const callbacks = useRef({ active, onChange, onView, onPosition });
  callbacks.current = { active, onChange, onView, onPosition };
  const handleChange = useCallback((value: string) => callbacks.current.onChange(value), []);
  const handleCreate = useCallback((view: EditorView) => callbacks.current.onView(view), []);
  const handleUpdate = useCallback((update: ViewUpdate) => {
    if (callbacks.current.active && (update.selectionSet || update.docChanged)) {
      const selection = update.state.selection.main;
      const line = update.state.doc.lineAt(selection.head);
      callbacks.current.onPosition({
        line: line.number,
        column: selection.head - line.from + 1,
        selected: Math.abs(selection.to - selection.from),
      });
    }
  }, []);
  const language = useMemo(
    () =>
      tab.mode === 'markdown'
        ? markdown()
        : /\.(tsx?|jsx?)$/i.test(tab.name)
          ? javascript({ typescript: /\.tsx?$/i.test(tab.name), jsx: /\.[jt]sx$/i.test(tab.name) })
          : /\.json$/i.test(tab.name)
            ? json()
            : [],
    [tab.name, tab.mode],
  );
  const editorTheme = useMemo(
    () =>
      EditorView.theme(
        {
          '&': {
            height: '100%',
            fontSize: `${fontSize}px`,
            color: 'var(--text)',
            backgroundColor: 'transparent',
          },
          '.cm-scroller': {
            fontFamily: '"Cascadia Code", "Consolas", monospace',
            lineHeight: '1.9',
            overflow: 'auto',
          },
          '.cm-content': { padding: '26px 0 100px', caretColor: 'var(--accent)' },
          '.cm-line': { padding: '0 30px 0 15px' },
          '.cm-gutters': {
            backgroundColor: 'transparent',
            color: 'var(--faint)',
            border: 'none',
            minWidth: '60px',
          },
          '.cm-lineNumbers .cm-gutterElement': { padding: '0 15px 0 12px' },
          '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--active-line)' },
          '&.cm-focused': { outline: 'none' },
          '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
            backgroundColor: 'var(--selection) !important',
          },
          '.cm-cursor': { borderLeftColor: 'var(--accent)' },
          '.cm-panels': {
            backgroundColor: 'var(--surface)',
            color: 'var(--text)',
            borderColor: 'var(--border)',
          },
          '.cm-search': { padding: '12px 20px !important' },
          '.cm-textfield': {
            background: 'var(--paper)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '5px',
            padding: '6px',
          },
          '.cm-button': {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: '5px',
          },
        },
        { dark: theme === 'dark' || theme === 'midnight' },
      ),
    [theme, fontSize],
  );
  const extensions = useMemo(
    () => [
      editorTheme,
      history({ minDepth: 2000, newGroupDelay: 0 }),
      separateCodeInputs,
      search({ top: true }),
      keymap.of([indentWithTab]),
      EditorState.tabSize.of(2),
      EditorState.phrases.of({
        Find: t('Buscar'),
        Replace: t('Substituir'),
        next: t('próximo'),
        previous: t('anterior'),
        all: t('todos'),
        'match case': t('diferenciar maiúsculas'),
        regexp: t('expressão regular'),
        'by word': t('palavra inteira'),
        replace: t('substituir'),
        'replace all': t('substituir todos'),
        close: t('fechar'),
        'No matches': t('Nenhum resultado'),
        'current match': t('resultado atual'),
        'replaced $ matches': t('$ ocorrências substituídas'),
      }),
      ...(wrap ? [EditorView.lineWrapping] : []),
      ...(Array.isArray(language) ? language : [language]),
    ],
    [editorTheme, wrap, language, locale],
  );
  return (
    <div
      className="editor-instance"
      style={{ display: active ? 'block' : 'none' }}
      aria-hidden={!active}
    >
      <CodeMirror
        value={tab.content}
        height="100%"
        theme={theme === 'dark' || theme === 'midnight' ? 'dark' : 'light'}
        extensions={extensions}
        onCreateEditor={handleCreate}
        onChange={handleChange}
        onUpdate={handleUpdate}
        basicSetup={BASIC_SETUP}
      />
    </div>
  );
}

export default function App() {
  const [locale, setLocale] = useLanguage();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusMotion, setFocusMotion] = useState<'enter' | 'leave' | null>(null);
  const previousFocus = useRef(false);
  useEffect(() => {
    if (previousFocus.current === focusMode) return;
    previousFocus.current = focusMode;
    setFocusMotion(focusMode ? 'enter' : 'leave');
    const timer = setTimeout(() => setFocusMotion(null), 380);
    return () => clearTimeout(timer);
  }, [focusMode]);
  const [tabs, setTabs] = useState<DocumentTab[]>([]);
  const [activeId, setActiveId] = useState('');
  const [groups, setGroups] = useState<TabGroup[]>([]);
  const [groupDialog, setGroupDialog] = useState<{
    group: TabGroup | null;
    tabIds?: string[];
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectionAnchor = useRef<string | null>(null);
  const [visualSearch, setVisualSearch] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [replacementText, setReplacementText] = useState('');
  const visualViews = useRef(new Map<string, VisualEditorInstance>());
  const [iconTabId, setIconTabId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [initialPreferences] = useState(() => {
    try {
      return parsePreferences(localStorage.getItem('lume.preferences.v1'));
    } catch {
      return parsePreferences(null);
    }
  });
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return parseTheme(localStorage.getItem('lume.theme'));
    } catch {
      return 'light';
    }
  });
  const [sidebar, setSidebar] = useState(true);
  const [wrap, setWrap] = useState(initialPreferences.wrap);
  const [fontSize, setFontSize] = useState(initialPreferences.fontSize);
  const [sidebarWidth, setSidebarWidth] = useState(initialPreferences.sidebarWidth);
  const [splitRatio, setSplitRatio] = useState(initialPreferences.splitRatio);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [workspaceWidth, setWorkspaceWidth] = useState(800);
  const [resizing, setResizing] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const sidebarMax = Math.max(200, Math.min(440, windowWidth - 480));
  const visibleSidebarWidth = clamp(sidebarWidth, 200, sidebarMax);
  const splitMin = Math.min(45, Math.ceil((200 / Math.max(1, workspaceWidth)) * 100));
  const splitMax = 100 - splitMin;
  const visibleSplitRatio = clamp(splitRatio, splitMin, splitMax);
  useEffect(() => {
    const update = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const update = () => setWorkspaceWidth(element.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(
        'lume.preferences.v1',
        JSON.stringify({ fontSize, sidebarWidth, splitRatio, wrap }),
      );
    } catch {}
  }, [fontSize, sidebarWidth, splitRatio, wrap]);
  const [stats, setStats] = useState<Stats>({ line: 1, column: 1, selected: 0 });
  const [menu, setMenu] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<'saved' | 'saving' | 'error'>('saved');
  const views = useRef(new Map<string, EditorView>());
  const state = useRef({ tabs, activeId, groups });
  state.current = { tabs, activeId, groups };
  const closing = useRef(false);
  const operations = useRef(false);
  const active = tabs.find((t) => t.id === activeId);
  const sourceRequired = active?.mode === 'markdown' && needsSourceEditing(active.content);
  const isVisual =
    active?.mode === 'markdown' && active.presentation === 'visual' && !sourceRequired;
  const showPreview = active?.mode === 'markdown' && !isVisual && active.split;
  useEffect(() => {
    if (!ready || !active) return;
    const frame = requestAnimationFrame(() => {
      if (isVisual)
        visualViews.current.get(activeId)?.commands.focus(undefined, { scrollIntoView: false });
      else views.current.get(activeId)?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [focusMode]);
  const selectTab = (id: string, event?: MouseEvent) => {
    const order = [
      ...groups
        .filter((group) => !group.collapsed)
        .flatMap((group) => tabs.filter((tab) => tab.groupId === group.id).map((tab) => tab.id)),
      ...tabs.filter((tab) => !tab.groupId).map((tab) => tab.id),
    ];
    setSelectedIds((previous) =>
      rangeSelection(
        order,
        selectionAnchor.current,
        id,
        previous,
        !!event?.shiftKey,
        !!(event?.ctrlKey || event?.metaKey),
      ),
    );
    if (!event?.shiftKey) selectionAnchor.current = id;
    setActiveId(id);
  };
  const updatePresentation = (presentation: 'visual' | 'source') => {
    setTabs((current) =>
      current.map((tab) => (tab.id === activeId ? { ...tab, presentation } : tab)),
    );
    setVisualSearch(false);
  };
  useEffect(() => {
    setVisualSearch(false);
  }, [activeId]);
  useEffect(() => {
    setSelectedIds((previous) => previous.filter((id) => tabs.some((tab) => tab.id === id)));
  }, [tabs.length]);
  const notify = useCallback((text: string, error = false) => setToast({ text, error }), []);
  const ask = (title: string, body: string, choices: Prompt['choices']) =>
    new Promise<string>((resolve) => setPrompt({ title, body, choices, resolve }));
  const serialize = () => JSON.stringify({ version: 2, ...state.current });
  const persistQueue = useRef<Promise<void>>(Promise.resolve());
  const persist = useCallback((value: string) => {
    const next = persistQueue.current.catch(() => {}).then(() => storeDrafts(value));
    persistQueue.current = next;
    return next;
  }, []);
  useEffect(() => {
    let live = true;
    loadDrafts()
      .then((raw) => {
        if (!live) return;
        const restored = restoreSession(raw);
        if (restored) {
          setTabs(restored.tabs);
          setActiveId(restored.activeId);
          setGroups(restored.groups);
          setSelectedIds(restored.activeId ? [restored.activeId] : []);
          selectionAnchor.current = restored.activeId || null;
        } else {
          const tab = initialTab();
          setTabs([tab]);
          setActiveId(tab.id);
          if (raw) notify(t('O rascunho anterior está danificado. Ele não foi carregado.'), true);
        }
        setReady(true);
      })
      .catch(() => {
        if (live) {
          const tab = initialTab();
          setTabs([tab]);
          setActiveId(tab.id);
          setReady(true);
          notify(t('Não foi possível recuperar a sessão anterior.'), true);
        }
      });
    return () => {
      live = false;
    };
  }, [notify]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('lume.theme', theme);
    } catch {}
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  useEffect(() => {
    if (!ready) return;
    setRecovery('saving');
    const timer = setTimeout(() => {
      persist(serialize())
        .then(() => setRecovery('saved'))
        .catch(() => {
          setRecovery('error');
          notify(
            t('Não foi possível guardar os rascunhos automaticamente. Salve seus arquivos.'),
            true,
          );
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [tabs, activeId, groups, ready, persist, notify]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.error ? 9000 : 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const title = `${active && isDirty(active) ? '● ' : ''}${active?.name || 'Lume Notes'} — Lume Notes ${appVersion}`;
    document.title = title;
    if (native)
      getCurrentWindow()
        .setTitle(title)
        .catch(() => {});
    const view = views.current.get(activeId);
    if (view && !isVisual) {
      const head = view.state.selection.main.head;
      const line = view.state.doc.lineAt(head);
      setStats({
        line: line.number,
        column: head - line.from + 1,
        selected: Math.abs(view.state.selection.main.to - view.state.selection.main.from),
      });
      requestAnimationFrame(() => view.focus());
    }
  }, [activeId, active?.name, active ? isDirty(active) : false, isVisual]);
  useEffect(() => {
    const closeMenu = (e: globalThis.MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-menu]')) setMenu(null);
    };
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const editTab = (id: string, value: string) =>
    setTabs((current) => current.map((t) => (t.id === id ? { ...t, content: value } : t)));
  const newTab = () => {
    const names = new Set(state.current.tabs.map((tab) => tab.name));
    const untitled = t('Sem título');
    let name = untitled;
    let number = 2;
    while (names.has(name) || names.has(name + '.md') || names.has(name + '.txt'))
      name = `${untitled} ${number++}`;
    const tab = newDocument(name + '.md');
    tab.groupId = state.current.tabs.find((t) => t.id === state.current.activeId)?.groupId || null;
    setTabs((current) => [...current, tab]);
    setActiveId(tab.id);
    setSelectedIds([tab.id]);
    selectionAnchor.current = tab.id;
    if (tab.groupId)
      setGroups((current) =>
        current.map((g) => (g.id === tab.groupId ? { ...g, collapsed: false } : g)),
      );
    setMenu(null);
  };
  const assignGroup = (ids: string[], groupId: string | null) => {
    setTabs((current) => current.map((tab) => (ids.includes(tab.id) ? { ...tab, groupId } : tab)));
    if (groupId)
      setGroups((current) =>
        current.map((group) => (group.id === groupId ? { ...group, collapsed: false } : group)),
      );
  };
  const chooseIcon = (icon: DocumentIcon) => {
    setTabs((current) => current.map((tab) => (tab.id === iconTabId ? { ...tab, icon } : tab)));
    setIconTabId(null);
  };
  const toggleGroup = (id: string) =>
    setGroups((current) =>
      current.map((group) => (group.id === id ? { ...group, collapsed: !group.collapsed } : group)),
    );
  const removeGroup = (id: string) => {
    setGroups((current) => current.filter((group) => group.id !== id));
    setTabs((current) =>
      current.map((tab) => (tab.groupId === id ? { ...tab, groupId: null } : tab)),
    );
  };
  const saveGroup = (name: string, color: GroupColor) => {
    if (!groupDialog) return;
    if (groupDialog.group) {
      const id = groupDialog.group.id;
      setGroups((current) =>
        current.map((group) => (group.id === id ? { ...group, name, color } : group)),
      );
    } else {
      const group: TabGroup = { id: crypto.randomUUID(), name, color, collapsed: false };
      setGroups((current) => [...current, group]);
      if (groupDialog.tabIds) assignGroup(groupDialog.tabIds, group.id);
    }
    setGroupDialog(null);
  };
  const run = async (operation: () => Promise<void>) => {
    if (operations.current) return;
    operations.current = true;
    setBusy(true);
    setMenu(null);
    try {
      await operation();
    } catch (e) {
      notify(String(e).replace(/^Error: /, ''), true);
    } finally {
      operations.current = false;
      setBusy(false);
    }
  };
  const openFiles = () =>
    run(async () => {
      const incoming = await openDocuments();
      if (!incoming.length) return;
      const current = state.current.tabs;
      const additions: DocumentTab[] = [];
      let nextId = '';
      for (const tab of incoming) {
        const duplicate = [...current, ...additions].find(
          (t) => t.path && tab.path && t.path.toLocaleLowerCase() === tab.path.toLocaleLowerCase(),
        );
        if (duplicate) {
          nextId = duplicate.id;
        } else {
          additions.push(tab);
          nextId = tab.id;
        }
      }
      setTabs((existing) => [...existing, ...additions]);
      setActiveId(nextId);
      setSelectedIds([nextId]);
      selectionAnchor.current = nextId;
      const activeGroup = [...current, ...additions].find((tab) => tab.id === nextId)?.groupId;
      if (activeGroup)
        setGroups((groups) =>
          groups.map((group) =>
            group.id === activeGroup ? { ...group, collapsed: false } : group,
          ),
        );
    });
  const saveTab = async (id: string, as = false): Promise<boolean> => {
    const tab = state.current.tabs.find((t) => t.id === id);
    if (!tab) return false;
    let result;
    try {
      result = await saveDocument(tab, as);
    } catch (e) {
      if (String(e).includes('FILE_CHANGED')) {
        const choice = await ask(
          t('O arquivo mudou fora do Lume'),
          t(
            'Outra aplicação alterou ou removeu este arquivo. Você pode salvar uma cópia ou substituir a versão no disco.',
          ),
          [
            { label: t('Cancelar'), value: 'cancel' },
            { label: t('Salvar cópia'), value: 'copy' },
            { label: t('Substituir arquivo'), value: 'overwrite', danger: true },
          ],
        );
        if (choice === 'cancel') return false;
        result = await saveDocument(tab, choice === 'copy', choice === 'overwrite');
      } else throw e;
    }
    if (!result) return false;
    setTabs((current) =>
      current.map((t) => (t.id === id ? { ...t, ...result, savedContent: tab.content } : t)),
    );
    notify(
      native
        ? t('Arquivo salvo.')
        : t('Arquivo baixado. No navegador, cada salvamento gera um download.'),
    );
    return true;
  };
  const renameTab = async (id: string, name: string): Promise<boolean> => {
    if (operations.current) return false;
    const tab = state.current.tabs.find((tab) => tab.id === id);
    if (!tab) return false;
    if (name === tab.name) return true;
    operations.current = true;
    setBusy(true);
    try {
      const result = await renameDocument(tab, name);
      setTabs((current) => current.map((tab) => (tab.id === id ? { ...tab, ...result } : tab)));
      notify(t('Título atualizado.'));
      return true;
    } catch (error) {
      notify(String(error).replace(/^Error: /, ''), true);
      return false;
    } finally {
      operations.current = false;
      setBusy(false);
    }
  };
  const saveActive = (as = false) =>
    run(async () => {
      if (state.current.activeId) await saveTab(state.current.activeId, as);
    });
  const closeTab = (id: string) =>
    run(async () => {
      const tab = state.current.tabs.find((t) => t.id === id);
      if (!tab) return;
      if (isDirty(tab) || !tab.path) {
        const choice = await ask(
          t('Salvar antes de fechar?'),
          !tab.path
            ? t('“{name}” ainda não foi salvo em arquivo.', { name: tab.name })
            : t('“{name}” tem alterações que ainda não foram salvas em arquivo.', {
                name: tab.name,
              }),
          [
            { label: t('Cancelar'), value: 'cancel' },
            { label: t('Descartar'), value: 'discard', danger: true },
            { label: t('Salvar'), value: 'save' },
          ],
        );
        if (choice === 'cancel') return;
        if (choice === 'save') {
          const savingContent = state.current.tabs.find((item) => item.id === id)?.content;
          if (!(await saveTab(id))) return;
          const latest = state.current.tabs.find((item) => item.id === id);
          if (latest && latest.content !== savingContent) {
            notify(t('Há novas alterações após o salvamento. A nota permaneceu aberta.'));
            return;
          }
        }
      }
      const current = state.current.tabs;
      const index = current.findIndex((t) => t.id === id);
      const next = current.filter((t) => t.id !== id);
      if (state.current.activeId === id)
        setActiveId(next[Math.min(index, next.length - 1)]?.id || '');
      setSelectedIds((ids) => ids.filter((selected) => selected !== id));
      if (selectionAnchor.current === id) selectionAnchor.current = null;
      views.current.delete(id);
      visualViews.current.delete(id);
      setTabs(next);
      if (!next.length) setFocusMode(false);
    });
  const find = () => {
    setMenu(null);
    if (isVisual) {
      setVisualSearch(true);
      return;
    }
    const view = views.current.get(state.current.activeId);
    if (view) openSearchPanel(view);
  };
  const editCommand = (command: typeof undo) => {
    if (isVisual) {
      const editor = visualViews.current.get(activeId);
      if (editor)
        command === undo
          ? editor.chain().focus().undo().run()
          : editor.chain().focus().redo().run();
      return;
    }
    const view = views.current.get(state.current.activeId);
    if (view) {
      command(view);
      view.focus();
    }
    setMenu(null);
  };
  const applyFormat = (action: FormatAction) => {
    const id = state.current.activeId,
      view = views.current.get(id);
    if (operations.current) return;
    if (isVisual) {
      const editor = visualViews.current.get(id);
      if (editor) visualFormat(editor, action);
      return;
    }
    if (!view) return;
    const range = view.state.selection.main;
    const edit = formatEdit(view.state.doc.toString(), range.from, range.to, action);
    view.dispatch({
      changes: { from: edit.from, to: edit.to, insert: edit.insert },
      selection: { anchor: edit.anchor, head: edit.head },
      userEvent: 'input.format',
      scrollIntoView: true,
    });
    setTabs((current) =>
      current.map((tab) =>
        tab.id === id
          ? {
              ...tab,
              mode: 'markdown',
              name:
                !tab.path && /^Sem título(?: \d+)?$/.test(tab.name) ? tab.name + '.md' : tab.name,
            }
          : tab,
      ),
    );
    view.focus();
  };
  const actions = useRef({ newTab, openFiles, saveActive, closeTab, find, applyFormat });
  actions.current = { newTab, openFiles, saveActive, closeTab, find, applyFormat };
  useEffect(() => {
    const shortcut = (e: KeyboardEvent) => {
      if ((e.target as Element)?.closest?.('[data-title-editor]')) return;
      if (e.key === 'Escape') {
        if (prompt) {
          prompt.resolve('cancel');
          setPrompt(null);
        }
        setGroupDialog(null);
        setIconTabId(null);
        setSettingsOpen(false);
        setVisualSearch(false);
        setMenu(null);
        if (!prompt && !groupDialog && !iconTabId && !settingsOpen && !menu && !visualSearch)
          setFocusMode(false);
        return;
      }
      if (
        e.key === 'F8' &&
        state.current.tabs.length &&
        !prompt &&
        !groupDialog &&
        !iconTabId &&
        !settingsOpen
      ) {
        e.preventDefault();
        setFocusMode((value) => !value);
        return;
      }
      if (
        !(e.ctrlKey || e.metaKey) ||
        prompt ||
        groupDialog ||
        iconTabId ||
        settingsOpen ||
        operations.current
      )
        return;
      const key = e.key.toLowerCase();
      if (['n', 'o', 's', 'w'].includes(key)) {
        e.preventDefault();
        if (key === 'n') actions.current.newTab();
        if (key === 'o') void actions.current.openFiles();
        if (key === 's') void actions.current.saveActive(e.shiftKey);
        if (key === 'w') void actions.current.closeTab(state.current.activeId);
      }
      if (key === 'f') {
        e.preventDefault();
        actions.current.find();
      }
      if (
        !isUiTextField(e.target) &&
        (key === 'b' || key === 'i' || key === 'u' || (key === 'c' && e.shiftKey))
      ) {
        e.preventDefault();
        actions.current.applyFormat(
          key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'u' ? 'underline' : 'code',
        );
      }
      if (key === 'tab') {
        e.preventDefault();
        const current = state.current.tabs;
        const i = current.findIndex((t) => t.id === state.current.activeId);
        if (current.length)
          setActiveId(current[(i + (e.shiftKey ? -1 : 1) + current.length) % current.length].id);
      }
      if (key === '=' || key === '+') {
        e.preventDefault();
        setFontSize((v) => Math.min(FONT_MAX, v + 1));
      }
      if (key === '-') {
        e.preventDefault();
        setFontSize((v) => Math.max(FONT_MIN, v - 1));
      }
      if (key === '0') {
        e.preventDefault();
        setFontSize(15);
      }
    };
    window.addEventListener('keydown', shortcut, true);
    return () => window.removeEventListener('keydown', shortcut, true);
  }, [prompt, groupDialog, iconTabId, settingsOpen, menu, visualSearch]);
  useEffect(() => {
    if (!ready) return;
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (state.current.tabs.some(isDirty)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    if (!native) {
      window.addEventListener('beforeunload', beforeUnload);
      return () => window.removeEventListener('beforeunload', beforeUnload);
    }
    let disposed = false;
    let unlisten: (() => void) | undefined;
    getCurrentWindow()
      .onCloseRequested(async (event) => {
        if (closing.current) return;
        event.preventDefault();
        if (operations.current) {
          notify(t('Aguarde a operação terminar antes de fechar.'));
          return;
        }
        try {
          await persist(serialize());
          closing.current = true;
          await getCurrentWindow().destroy();
        } catch {
          const choice = await ask(
            t('Seus rascunhos não foram guardados'),
            t(
              'Não foi possível guardar esta sessão. Salve seus arquivos antes de sair para evitar perder alterações.',
            ),
            [
              { label: t('Voltar ao editor'), value: 'cancel' },
              { label: t('Sair mesmo assim'), value: 'discard', danger: true },
            ],
          );
          if (choice === 'discard') {
            closing.current = true;
            await getCurrentWindow().destroy();
          }
        }
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [ready, persist, notify]);
  const words = useMemo(
    () => active?.content.trim().split(/\s+/u).filter(Boolean).length || 0,
    [active?.content],
  );
  const count = useMemo(() => Array.from(active?.content || '').length, [active?.content]);
  const languageName =
    active?.mode === 'markdown'
      ? 'Markdown'
      : active && /\.json$/i.test(active.name)
        ? 'JSON'
        : active && /\.[jt]sx?$/i.test(active.name)
          ? 'JavaScript / TypeScript'
          : t('Texto simples');
  const fileMenu = [
    [t('Novo arquivo'), 'Ctrl N', newTab],
    [t('Abrir arquivo…'), 'Ctrl O', () => void openFiles()],
    [t('Salvar'), 'Ctrl S', () => void saveActive()],
    [t('Salvar como…'), 'Ctrl Shift S', () => void saveActive(true)],
    [t('Fechar aba'), 'Ctrl W', () => void closeTab(activeId)],
  ] as const;
  return (
    <div
      className={`app-shell ${resizing ? 'is-resizing' : ''} ${focusMode ? 'focus-mode' : ''} ${focusMotion ? `focus-${focusMotion}` : ''} ${!active && ready ? 'is-empty' : ''}`}
      lang={locale}
      style={{ '--split-basis': `${visibleSplitRatio}%` } as CSSProperties}
    >
      <aside
        className={`sidebar ${sidebar && !focusMode ? '' : 'collapsed'}`}
        style={{ width: sidebar && !focusMode ? visibleSidebarWidth : 0 }}
        inert={!sidebar || focusMode || settingsOpen || !!prompt || !!groupDialog || !!iconTabId}
      >
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>
          <span>
            lume<span className="brand-dot">.</span>
          </span>
          <span className="brand-tag">NOTES</span>
        </div>
        <div className="workspace-label">
          {t('SEU ESPAÇO')}
          <span>{t('LOCAL')}</span>
        </div>
        <button className="new-note" onClick={newTab} disabled={!ready || busy}>
          <Plus size={17} />
          <span>{t('Nova nota')}</span>
          <kbd>Ctrl N</kbd>
        </button>
        <SidebarFiles
          tabs={tabs}
          groups={groups}
          activeId={activeId}
          busy={busy}
          onSelect={selectTab}
          selectedIds={selectedIds}
          onClose={(id) => void closeTab(id)}
          onSave={(id) =>
            void run(async () => {
              await saveTab(id);
            })
          }
          onAssign={assignGroup}
          onNewGroup={(tabIds) => setGroupDialog({ group: null, tabIds })}
          onToggleGroup={toggleGroup}
          onEditGroup={(group) => setGroupDialog({ group })}
          onRemoveGroup={removeGroup}
          onChooseIcon={setIconTabId}
        />
        <button className="open-sidebar" onClick={() => void openFiles()} disabled={!ready || busy}>
          <FolderOpen size={16} />
          {t('Abrir do computador')}
          <ArrowUpRight size={14} />
        </button>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <Sparkles size={18} />
            <p>
              {t('Uma ideia de cada vez.')}
              <br />
              <span>{t('O resto pode esperar.')}</span>
            </p>
          </div>
          <div className="local-badge">
            <span className="status-dot" />
            {t('Seus textos ficam neste computador')}
          </div>
          <button
            className="settings-button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('Configurações')}
          >
            <Settings size={16} />
            <span>{t('Configurações')}</span>
          </button>
          <div className="sidebar-footer">
            <span>LUME NOTES</span>
            <span>v{appVersion}</span>
          </div>
        </div>
      </aside>
      {sidebar && !focusMode && (
        <ResizeDivider
          label={t('Largura do painel lateral')}
          value={visibleSidebarWidth}
          min={200}
          max={sidebarMax}
          reset={246}
          onChange={setSidebarWidth}
          onResizing={setResizing}
        />
      )}
      <main className="main" inert={settingsOpen || !!prompt || !!groupDialog || !!iconTabId}>
        <div className="workspace-chrome" inert={focusMode}>
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-button"
                aria-label={t(sidebar ? 'Ocultar painel' : 'Mostrar painel')}
                title={t('Alternar painel')}
                onClick={() => setSidebar((v) => !v)}
              >
                {sidebar ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
              </button>
              <div className="top-divider" />
              <span className="workspace-breadcrumb">
                {t('Meu espaço')}
                <span>/</span> <strong>{t('Editor')}</strong>
              </span>
            </div>
            <div className="topbar-right">
              <span className="recovery-label">
                <span className={`status-dot ${recovery === 'error' ? 'warning' : ''}`} />
                {recovery === 'saving'
                  ? t('Guardando rascunhos…')
                  : recovery === 'error'
                    ? t('Rascunhos sem proteção')
                    : t('Rascunhos protegidos')}
              </span>
              <div className="menu-container" data-menu>
                <button
                  className="icon-button"
                  aria-label={t('Escolher tema')}
                  title={`${t('Tema')} ${t(THEME_NAMES[theme])}`}
                  onClick={() => setMenu(menu === 'theme' ? null : 'theme')}
                >
                  <ThemeIcon theme={theme} />
                </button>
                {menu === 'theme' && (
                  <div className="dropdown theme-menu" role="menu" aria-label={t('Temas')}>
                    {(['light', 'sunset', 'dark', 'midnight'] as Theme[]).map((value) => (
                      <button
                        key={value}
                        role="menuitemradio"
                        aria-checked={theme === value}
                        onClick={() => {
                          setTheme(value);
                          setMenu(null);
                        }}
                      >
                        <ThemeIcon theme={value} />
                        {t(THEME_NAMES[value])}
                        {theme === value && <Check size={13} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </header>
          <TabStrip
            tabs={tabs}
            groups={groups}
            activeId={activeId}
            busy={!ready || busy}
            onSelect={selectTab}
            selectedIds={selectedIds}
            onClose={(id) => void closeTab(id)}
            onNew={newTab}
            onToggleGroup={toggleGroup}
            onAssign={assignGroup}
          />
          <div className="toolbar">
            <div className="menus">
              <div className="menu-container" data-menu>
                <button
                  className={`icon-button ${menu === 'file' ? 'toggled' : ''}`}
                  aria-label={t('Menu Arquivo')}
                  title={t('Arquivo')}
                  onClick={() => setMenu(menu === 'file' ? null : 'file')}
                  disabled={!ready || busy}
                >
                  <span className="file-settings-icon">
                    <FileText size={19} />
                    <Settings size={10} />
                  </span>
                </button>
                {menu === 'file' && (
                  <div className="dropdown">
                    {fileMenu.map(([label, shortcut, action]) => (
                      <button key={label} onClick={action}>
                        {label}
                        <kbd>{shortcut}</kbd>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="toolbar-divider" />
              <button
                className="icon-button"
                title={t('Abrir arquivo (Ctrl+O)')}
                aria-label={t('Abrir arquivo')}
                onClick={() => void openFiles()}
                disabled={!ready || busy}
              >
                <FolderOpen size={17} />
              </button>
              <button
                className="icon-button"
                title={t('Salvar (Ctrl+S)')}
                aria-label={t('Salvar arquivo')}
                onClick={() => void saveActive()}
                disabled={!ready || busy}
              >
                <Save size={17} />
              </button>
              <button
                className="icon-button"
                aria-label={t('Ativar modo foco')}
                title={t('Modo foco (F8)')}
                onClick={() => setFocusMode(true)}
                disabled={!active}
              >
                <Scan size={17} />
              </button>
            </div>
            <div className="editor-tools">
              <button
                className="icon-button"
                title={t('Desfazer (Ctrl+Z)')}
                aria-label={t('Desfazer')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editCommand(undo)}
                disabled={!ready || busy}
              >
                <RotateCcw size={17} />
              </button>
              <button
                className="icon-button"
                title={t('Refazer (Ctrl+Y)')}
                aria-label={t('Refazer')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => editCommand(redo)}
                disabled={!ready || busy}
              >
                <RotateCw size={17} />
              </button>
              <button
                className="icon-button"
                title={t('Buscar e substituir (Ctrl+F)')}
                aria-label={t('Buscar e substituir')}
                onClick={find}
              >
                <Search size={17} />
              </button>
              <button
                className={`icon-button ${wrap ? 'toggled' : ''}`}
                title={t('Quebra automática de linha')}
                aria-label={t('Quebra automática de linha')}
                aria-pressed={wrap}
                onClick={() => setWrap((v) => !v)}
              >
                <WrapText size={17} />
              </button>
              <div className="toolbar-divider" />
              <FontSizeControl value={fontSize} onChange={setFontSize} />
            </div>
          </div>
          <div className="formatbar" role="toolbar" aria-label={t('Formatação Markdown')}>
            <span className="formatbar-label">{t('FORMATAR')}</span>
            <button
              className="icon-button"
              aria-label={t('Negrito')}
              aria-pressed={
                isVisual ? visualViews.current.get(activeId)?.isActive('bold') : undefined
              }
              title={t('Negrito (Ctrl+B)')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormat('bold')}
              disabled={!ready || busy}
            >
              <Bold size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={t('Itálico')}
              aria-pressed={
                isVisual ? visualViews.current.get(activeId)?.isActive('italic') : undefined
              }
              title={t('Itálico (Ctrl+I)')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormat('italic')}
              disabled={!ready || busy}
            >
              <Italic size={16} />
            </button>
            <button
              className="icon-button"
              aria-label={t('Código')}
              aria-pressed={
                isVisual
                  ? visualViews.current.get(activeId)?.isActive('code') ||
                    visualViews.current.get(activeId)?.isActive('codeBlock')
                  : undefined
              }
              title={t('Código em linha ou bloco (Ctrl+Shift+C)')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormat('code')}
              disabled={!ready || busy}
            >
              <Code2 size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={t('Inserir divisória')}
              title={t('Inserir linha divisória')}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => applyFormat('rule')}
              disabled={!ready || busy}
            >
              <SeparatorHorizontal size={17} />
            </button>
            {[
              ['underline', t('Sublinhado'), Underline],
              ['bullet', t('Lista com marcadores'), List],
              ['ordered', t('Lista numerada'), ListOrdered],
            ].map(([action, label, Icon]) => {
              const Glyph = Icon as typeof Underline;
              return (
                <button
                  key={action as string}
                  className="icon-button"
                  aria-label={label as string}
                  aria-pressed={
                    isVisual
                      ? visualViews.current
                          .get(activeId)
                          ?.isActive(
                            action === 'bullet'
                              ? 'bulletList'
                              : action === 'ordered'
                                ? 'orderedList'
                                : 'underline',
                          )
                      : undefined
                  }
                  title={label as string}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => applyFormat(action as FormatAction)}
                  disabled={!ready || busy}
                >
                  <Glyph size={16} />
                </button>
              );
            })}
            <span className="format-help">{isVisual ? t('Edição visual') : t('Código')}</span>
            {active?.mode === 'markdown' && (
              <div className="editing-mode" role="group" aria-label={t('Modo de edição')}>
                <button
                  className={isVisual ? 'toggled' : ''}
                  aria-label={t('Editar visualmente')}
                  aria-pressed={isVisual}
                  disabled={!!sourceRequired}
                  title={
                    sourceRequired
                      ? t('Este documento contém sintaxe que deve ser preservada no código')
                      : t('Editar com a formatação visível')
                  }
                  onClick={() => updatePresentation('visual')}
                >
                  <Eye size={14} />
                  <span>{t('Visual')}</span>
                </button>
                <button
                  className={!isVisual ? 'toggled' : ''}
                  aria-label={t('Editar código Markdown')}
                  aria-pressed={!isVisual}
                  onClick={() => updatePresentation('source')}
                >
                  <CodeXml size={14} />
                  <span>{t('Código Markdown')}</span>
                </button>
              </div>
            )}
            {active?.mode === 'markdown' && !isVisual && (
              <button
                className={`preview-toggle ${showPreview ? 'toggled' : ''}`}
                aria-label={t('Alternar split')}
                aria-pressed={showPreview}
                onClick={() =>
                  setTabs((current) =>
                    current.map((tab) =>
                      tab.id === activeId ? { ...tab, split: !tab.split } : tab,
                    ),
                  )
                }
              >
                {showPreview ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                <span>{t('Split')}</span>
              </button>
            )}
          </div>
          <section className="document-heading">
            <div>
              <div className="eyebrow">{active?.path ? t('ARQUIVO LOCAL') : t('SEU RASCUNHO')}</div>
              <div className="document-title-row">
                {active && (
                  <button
                    className="document-icon-button"
                    aria-label={t('Escolher ícone do documento: {name}', {
                      name: t(DOCUMENT_ICONS[active.icon]),
                    })}
                    title={t('Escolher ícone da nota')}
                    onClick={() => setIconTabId(active.id)}
                    disabled={busy}
                  >
                    <DocumentSymbol icon={active.icon} size={24} />
                  </button>
                )}
                {active ? (
                  <NoteTitle
                    key={active.id}
                    tab={active}
                    disabled={busy}
                    onRename={(name) => renameTab(active.id, name)}
                  />
                ) : (
                  <h1>{ready ? t('Nenhuma nota aberta') : t('Preparando seu espaço…')}</h1>
                )}
              </div>
              <p className="document-path" title={active?.path || ''}>
                {active?.path || t('Um lugar tranquilo para colocar as ideias no papel.')}
              </p>
            </div>
            <div className="document-heading-actions">
              <span className={`document-badge ${active && isDirty(active) ? 'modified' : ''}`}>
                {active && isDirty(active) ? (
                  <>
                    <span className="dirty-dot" />
                    {t('Alterado')}
                  </>
                ) : (
                  <>
                    <Check size={12} />
                    {active?.path ? t('Salvo em arquivo') : t('Pronto para escrever')}
                  </>
                )}
              </span>
              <button
                className="icon-button document-close"
                aria-label={t('Fechar documento atual')}
                title={t('Fechar documento (Ctrl+W)')}
                disabled={!ready || busy}
                onClick={() => void closeTab(activeId)}
              >
                <X size={14} />
              </button>
            </div>
          </section>
          {!native && (
            <div className="browser-notice">
              {t(
                'Prévia no navegador · Abrir lê arquivos locais; Salvar baixa uma cópia. O aplicativo desktop salva diretamente no disco.',
              )}
            </div>
          )}
          {sourceRequired && (
            <div className="source-notice">
              {t(
                'Este documento contém sintaxe adicional. O modo de código preserva todos os detalhes.',
              )}
            </div>
          )}
        </div>
        {visualSearch && isVisual && (
          <div
            className="visual-search"
            role="search"
            aria-label={t('Buscar e substituir no texto visual')}
          >
            <input
              aria-label={t('Buscar no documento')}
              autoFocus
              placeholder={t('Buscar…')}
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  const editor = visualViews.current.get(activeId);
                  if (editor && !findVisual(editor, searchText, event.shiftKey))
                    notify(t('Nenhum resultado.'));
                }
              }}
            />
            <button
              onClick={() => {
                const editor = visualViews.current.get(activeId);
                if (editor && !findVisual(editor, searchText)) notify(t('Nenhum resultado.'));
              }}
            >
              {t('Próximo')}
            </button>
            <input
              aria-label={t('Substituir por')}
              placeholder={t('Substituir por…')}
              value={replacementText}
              onChange={(event) => setReplacementText(event.target.value)}
            />
            <button
              onClick={() => {
                const editor = visualViews.current.get(activeId);
                if (!editor || !searchText) return;
                const { from, to } = editor.state.selection;
                if (
                  editor.state.doc.textBetween(from, to).toLocaleLowerCase() ===
                  searchText.toLocaleLowerCase()
                ) {
                  if (replacementText)
                    editor.commands.insertContent({ type: 'text', text: replacementText });
                  else editor.commands.deleteSelection();
                }
                findVisual(editor, searchText);
              }}
            >
              {t('Substituir')}
            </button>
            <button
              className="icon-button"
              aria-label={t('Fechar busca')}
              onClick={() => setVisualSearch(false)}
            >
              <X size={15} />
            </button>
          </div>
        )}
        <div ref={workspace} className={`editor-workspace ${showPreview ? 'with-preview' : ''}`}>
          <div className="editor-area">
            {ready && !active && (
              <div className="empty-workspace">
                <FileText size={38} strokeWidth={1} />
                <h1>{t('Nenhuma nota aberta')}</h1>
                <p>{t('Um espaço livre para a próxima ideia.')}</p>
                <button className="primary" onClick={newTab}>
                  <Plus size={16} />
                  {t('Nova nota')}
                </button>
                <button onClick={() => void openFiles()}>
                  <FolderOpen size={16} />
                  {t('Abrir arquivo')}
                </button>
              </div>
            )}
            {ready &&
              tabs
                .filter((tab) => tab.mode === 'markdown' && !needsSourceEditing(tab.content))
                .map((tab) => (
                  <VisualEditor
                    key={tab.id}
                    tab={tab}
                    active={tab.id === activeId && !!isVisual}
                    fontSize={fontSize}
                    wrap={wrap}
                    searchQuery={visualSearch && tab.id === activeId ? searchText : ''}
                    onChange={(value) => editTab(tab.id, value)}
                    onEditor={(editor) => {
                      if (editor) visualViews.current.set(tab.id, editor);
                      else visualViews.current.delete(tab.id);
                    }}
                    onSelection={setStats}
                  />
                ))}
            {ready &&
              tabs.map((t) => (
                <TextEditor
                  key={t.id}
                  tab={t}
                  theme={theme}
                  locale={locale}
                  fontSize={fontSize}
                  wrap={wrap}
                  active={t.id === activeId && !isVisual}
                  onChange={(value) => editTab(t.id, value)}
                  onView={(view) => {
                    views.current.set(t.id, view);
                    if (t.id === state.current.activeId && !isVisual) view.focus();
                  }}
                  onPosition={setStats}
                />
              ))}
          </div>
          {showPreview && (
            <>
              <ResizeDivider
                label={t('Largura do editor e da prévia Markdown')}
                value={visibleSplitRatio}
                min={splitMin}
                max={splitMax}
                reset={54}
                step={2}
                scale={100 / Math.max(1, workspaceWidth)}
                onChange={setSplitRatio}
                onResizing={setResizing}
              />
              <MarkdownPreview content={active?.content || ''} wrap={wrap} />
            </>
          )}
        </div>
        <footer className="statusbar">
          <div>
            <span>
              {words.toLocaleString(locale)} {t('palavras')}
            </span>
            <span className="status-separator" />
            <span>
              {count.toLocaleString(locale)} {t('caracteres')}
            </span>
            {stats.selected > 0 && (
              <span>
                · {stats.selected} {t('selecionados')}
              </span>
            )}
          </div>
          <div>
            <span>
              Ln {stats.line}, Col {stats.column}
            </span>
            <span className="status-separator" />
            <span>
              {active?.encoding.toUpperCase().replace('UTF8', 'UTF-8').replace('UTF16', 'UTF-16')}
            </span>
            <span className="status-separator" />
            <span>{active?.newline}</span>
            <span className="status-separator" />
            <span className="language-label">{t(languageName)}</span>
            <MoreHorizontal size={15} />
          </div>
        </footer>
      </main>
      <button
        className="focus-exit"
        aria-hidden={!focusMode}
        inert={!focusMode}
        tabIndex={focusMode ? 0 : -1}
        aria-label={t('Sair do modo foco')}
        title={t('Sair do modo foco (Esc / F8)')}
        onClick={() => setFocusMode(false)}
      >
        <Minimize2 size={16} />
        <span>{t('Sair do foco')}</span>
        <kbd>Esc</kbd>
      </button>
      <SettingsDialog
        open={settingsOpen}
        locale={locale}
        onLanguage={setLocale}
        onClose={() => setSettingsOpen(false)}
      />
      {toast && (
        <div
          className={`toast ${toast.error ? 'error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {toast.error ? <AlertCircle size={17} /> : <Check size={17} />}
          <span>{toast.text}</span>
          <button onClick={() => setToast(null)} aria-label={t('Fechar mensagem')}>
            <X size={15} />
          </button>
        </div>
      )}
      {groupDialog && (
        <GroupDialog
          group={groupDialog.group}
          onSave={saveGroup}
          onCancel={() => setGroupDialog(null)}
        />
      )}
      {iconTabId && (
        <IconDialog
          icon={tabs.find((tab) => tab.id === iconTabId)?.icon || 'file'}
          onSelect={chooseIcon}
          onClose={() => setIconTabId(null)}
        />
      )}
      {prompt && (
        <div
          className="modal-backdrop"
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              const nodes = Array.from(
                e.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
              );
              const first = nodes[0],
                last = nodes.at(-1);
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last?.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first?.focus();
              }
            }
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="modal-icon">
              <FileText size={25} />
            </div>
            <h2 id="modal-title">{prompt.title}</h2>
            <p>{prompt.body}</p>
            <div className="modal-actions">
              {prompt.choices.map((choice, i) => (
                <button
                  key={choice.value}
                  autoFocus={i === 0}
                  className={`${i === prompt.choices.length - 1 ? 'primary' : ''} ${choice.danger ? 'danger' : ''}`}
                  onClick={() => {
                    prompt.resolve(choice.value);
                    setPrompt(null);
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
