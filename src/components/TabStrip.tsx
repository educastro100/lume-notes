import { t } from '../i18n';
import type { CSSProperties, MouseEvent } from 'react';
import { Plus, X, ChevronRight } from 'lucide-react';
import { DocumentSymbol } from './DocumentSymbol';
import { DropArea, TAB_DRAG_TYPE } from './DropArea';
import { SoftCollapse } from './SoftCollapse';
import { GROUP_COLORS, isDirty, type DocumentTab, type TabGroup } from '../documents';
export function TabStrip({
  tabs,
  groups,
  activeId,
  busy,
  selectedIds,
  onSelect,
  onClose,
  onNew,
  onToggleGroup,
  onAssign,
}: {
  tabs: DocumentTab[];
  groups: TabGroup[];
  activeId: string;
  busy: boolean;
  selectedIds: string[];
  onSelect: (id: string, event?: MouseEvent) => void;
  onClose: (id: string) => void;
  onNew: () => void;
  onToggleGroup: (id: string) => void;
  onAssign: (ids: string[], groupId: string | null) => void;
}) {
  const tabElement = (tab: DocumentTab) => (
    <div
      className={`tab ${tab.id === activeId ? 'active' : ''} ${selectedIds.includes(tab.id) ? 'multi-selected' : ''}`}
      key={tab.id}
      draggable={!busy}
      onDragStart={(event) => {
        event.dataTransfer.setData(
          TAB_DRAG_TYPE,
          JSON.stringify(selectedIds.includes(tab.id) ? selectedIds : [tab.id]),
        );
        event.dataTransfer.effectAllowed = 'move';
      }}
    >
      <button
        role="tab"
        aria-selected={tab.id === activeId}
        onClick={(event) => onSelect(tab.id, event)}
        title={tab.path || tab.name}
      >
        <DocumentSymbol icon={tab.icon} size={14} />
        <span>{tab.name}</span>
        {isDirty(tab) && <i className="dirty-dot" />}
      </button>
      <button
        className="tab-close"
        onClick={() => onClose(tab.id)}
        disabled={busy}
        aria-label={t('Fechar {name}', { name: tab.name })}
      >
        <X size={13} />
      </button>
    </div>
  );
  return (
    <div className="tabbar" role="tablist" aria-label={t('Abas')}>
      {groups.map((group) => (
        <DropArea
          className={`tab-group-block ${group.collapsed ? 'is-collapsed' : ''}`}
          key={group.id}
          style={{ '--group-color': GROUP_COLORS[group.color] } as CSSProperties}
          busy={busy}
          onAssign={(ids) => onAssign(ids, group.id)}
        >
          <button
            className="tab-group-chip"
            aria-label={t(group.collapsed ? 'Expandir abas de {name}' : 'Recolher abas de {name}', {
              name: group.name,
            })}
            aria-expanded={!group.collapsed}
            onClick={() => onToggleGroup(group.id)}
          >
            <ChevronRight size={12} className={group.collapsed ? '' : 'expanded'} />
            {group.name}
            <span>{tabs.filter((tab) => tab.groupId === group.id).length}</span>
          </button>
          <SoftCollapse open={!group.collapsed} horizontal>
            <div className="group-tab-items">
              {tabs.filter((tab) => tab.groupId === group.id).map(tabElement)}
            </div>
          </SoftCollapse>
        </DropArea>
      ))}
      <DropArea className="ungrouped-tabs" busy={busy} onAssign={(ids) => onAssign(ids, null)}>
        {tabs.filter((tab) => !tab.groupId).map(tabElement)}
        <button
          className="icon-button add-tab"
          onClick={onNew}
          disabled={busy}
          title={t('Nova nota (Ctrl+N)')}
          aria-label={t('Nova aba')}
        >
          <Plus size={17} />
        </button>
        <span className="ungroup-drop-hint">{t('Sem grupo')}</span>
      </DropArea>
    </div>
  );
}
