import { t } from '../i18n';
import { useEffect, useState, type MouseEvent, type CSSProperties } from 'react';
import { Save, X, MoreHorizontal, ChevronRight, Plus, FolderPlus, Pencil } from 'lucide-react';
import { GROUP_COLORS, isDirty, type DocumentTab, type TabGroup } from '../documents';
import { DocumentSymbol } from './DocumentSymbol';
import { DropArea, TAB_DRAG_TYPE } from './DropArea';
import { SoftCollapse } from './SoftCollapse';
export interface FileActions {
  onSelect: (id: string, event?: MouseEvent) => void;
  onClose: (id: string) => void;
  onSave: (id: string) => void;
  onAssign: (ids: string[], groupId: string | null) => void;
  onNewGroup: (tabIds?: string[]) => void;
  onToggleGroup: (id: string) => void;
  onEditGroup: (group: TabGroup) => void;
  onRemoveGroup: (id: string) => void;
  onChooseIcon: (id: string) => void;
}
export function SidebarFiles({
  tabs,
  groups,
  activeId,
  busy,
  selectedIds,
  ...actions
}: FileActions & {
  tabs: DocumentTab[];
  groups: TabGroup[];
  activeId: string;
  busy: boolean;
  selectedIds: string[];
}) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [groupMenu, setGroupMenu] = useState<string | null>(null);
  useEffect(() => {
    const dismiss = (event: globalThis.MouseEvent) => {
      if (event.target instanceof Element) {
        if (!event.target.closest('.file-row')) setOpenMenu(null);
        if (!event.target.closest('.sidebar-group')) setGroupMenu(null);
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setGroupMenu(null);
      }
    };
    document.addEventListener('click', dismiss);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('click', dismiss);
      document.removeEventListener('keydown', escape);
    };
  }, []);
  const targets = (id: string) => (selectedIds.includes(id) ? selectedIds : [id]);
  const row = (tab: DocumentTab) => (
    <div
      className={`file-row ${tab.id === activeId ? 'selected' : ''} ${selectedIds.includes(tab.id) ? 'multi-selected' : ''}`}
      key={tab.id}
      draggable={!busy}
      onDragStart={(event) => {
        event.dataTransfer.setData(TAB_DRAG_TYPE, JSON.stringify(targets(tab.id)));
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <button
        className="file-item"
        onClick={(event) => actions.onSelect(tab.id, event)}
        title={`${tab.path || tab.name} · ${t('Shift para intervalo; Ctrl para seleção individual')}`}
        aria-pressed={selectedIds.includes(tab.id)}
      >
        <DocumentSymbol icon={tab.icon} size={15} />
        <span>{tab.name}</span>
        {isDirty(tab) && <i className="dirty-dot" aria-label={t('Alterações não salvas')} />}
      </button>
      <div className="file-row-actions">
        {(!tab.path || isDirty(tab)) && (
          <button
            aria-label={t('Salvar {name} pelo painel', { name: tab.name })}
            title={t('Salvar arquivo')}
            disabled={busy}
            onClick={() => actions.onSave(tab.id)}
          >
            <Save size={12} />
          </button>
        )}
        <button
          aria-label={t('Opções de {name}', { name: tab.name })}
          title={t('Opções da nota e da seleção')}
          disabled={busy}
          onClick={() => setOpenMenu(openMenu === tab.id ? null : tab.id)}
        >
          <MoreHorizontal size={13} />
        </button>
        <button
          aria-label={t('Fechar {name} pelo painel', { name: tab.name })}
          title="Fechar arquivo"
          disabled={busy}
          onClick={() => actions.onClose(tab.id)}
        >
          <X size={13} />
        </button>
      </div>
      {openMenu === tab.id && (
        <div
          className="file-assignment"
          role="menu"
          aria-label={t('Opções de {name}', { name: tab.name })}
        >
          {targets(tab.id).length > 1 && (
            <div className="selection-menu-label">
              {t('{count} arquivos selecionados', { count: targets(tab.id).length })}
            </div>
          )}
          <button
            role="menuitem"
            onClick={() => {
              actions.onChooseIcon(tab.id);
              setOpenMenu(null);
            }}
          >
            {t('Escolher ícone…')}
          </button>
          <button
            role="menuitem"
            onClick={() => {
              actions.onAssign(targets(tab.id), null);
              setOpenMenu(null);
            }}
          >
            {t('Mover para Sem grupo')}
          </button>
          {groups.map((group) => (
            <button
              role="menuitem"
              key={group.id}
              onClick={() => {
                actions.onAssign(targets(tab.id), group.id);
                setOpenMenu(null);
              }}
            >
              <span className="group-color-dot" style={{ background: GROUP_COLORS[group.color] }} />
              {group.name}
            </button>
          ))}
          {targets(tab.id).length > 1 && (
            <button
              role="menuitem"
              onClick={() => {
                actions.onNewGroup(targets(tab.id));
                setOpenMenu(null);
              }}
            >
              <FolderPlus size={13} />
              {t('Criar grupo com {count} arquivos…', { count: targets(tab.id).length })}
            </button>
          )}
          <button role="menuitem" onClick={() => setOpenMenu(null)}>
            {t('Cancelar')}
          </button>
        </div>
      )}
    </div>
  );
  return (
    <>
      <div className="section-heading files-heading">
        <span>
          {t('ARQUIVOS ABERTOS')}
          <small>{tabs.length.toString().padStart(2, '0')}</small>
        </span>
        <button
          aria-label={t('Criar grupo')}
          title={t('Criar grupo de abas')}
          onClick={() => actions.onNewGroup(selectedIds.length > 1 ? selectedIds : undefined)}
          disabled={busy}
        >
          <Plus size={14} />
        </button>
      </div>
      {selectedIds.length > 1 && (
        <div className="selection-count" role="status">
          {t('{count} selecionados · use o menu ⋯', { count: selectedIds.length })}
        </div>
      )}
      <nav className="file-list grouped-files" aria-label={t('Arquivos abertos')}>
        {groups.map((group) => (
          <DropArea
            className="sidebar-group"
            key={group.id}
            style={{ '--group-color': GROUP_COLORS[group.color] } as CSSProperties}
            busy={busy}
            onAssign={(ids) => actions.onAssign(ids, group.id)}
          >
            <div className="sidebar-group-header">
              <button
                className="group-toggle"
                aria-expanded={!group.collapsed}
                aria-label={t(group.collapsed ? 'Expandir grupo {name}' : 'Recolher grupo {name}', {
                  name: group.name,
                })}
                onClick={() => actions.onToggleGroup(group.id)}
              >
                <ChevronRight size={12} className={group.collapsed ? '' : 'expanded'} />
                <span className="group-color-dot" />
                <span>{group.name}</span>
                <small>{tabs.filter((tab) => tab.groupId === group.id).length}</small>
              </button>
              <button
                className="group-options"
                aria-label={t('Opções do grupo {name}', { name: group.name })}
                onClick={() => setGroupMenu(groupMenu === group.id ? null : group.id)}
              >
                <MoreHorizontal size={14} />
              </button>
            </div>
            {groupMenu === group.id && (
              <div className="group-edit-menu">
                <button
                  onClick={() => {
                    actions.onEditGroup(group);
                    setGroupMenu(null);
                  }}
                >
                  <Pencil size={12} />
                  {t('Editar grupo')}
                </button>
                <button
                  onClick={() => {
                    actions.onRemoveGroup(group.id);
                    setGroupMenu(null);
                  }}
                >
                  {t('Desagrupar arquivos')}
                </button>
              </div>
            )}
            <SoftCollapse open={!group.collapsed}>
              <div className="group-file-children">
                {tabs.filter((tab) => tab.groupId === group.id).map(row)}
                {!tabs.some((tab) => tab.groupId === group.id) && (
                  <p className="empty-group">
                    {t('Arraste uma aba para cá')}
                    <br />
                    {t('ou use o menu ⋯ do arquivo.')}
                  </p>
                )}
              </div>
            </SoftCollapse>
          </DropArea>
        ))}
        <DropArea
          className="ungrouped-files"
          busy={busy}
          onAssign={(ids) => actions.onAssign(ids, null)}
        >
          {groups.length > 0 && <div className="ungrouped-heading">{t('SEM GRUPO')}</div>}
          {tabs.filter((tab) => !tab.groupId).map(row)}
          {groups.length > 0 && (
            <p className="ungroup-drop-hint">{t('Solte aqui para deixar sem grupo')}</p>
          )}
        </DropArea>
      </nav>
    </>
  );
}
