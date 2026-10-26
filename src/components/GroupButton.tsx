import type { ReactNode } from 'react';
import type { GroupPlacement, TabGroup } from '../documents';
import { t } from '../i18n';
import { GROUP_DRAG_TYPE } from './DropArea';

// Only the group label starts group drags. Notes retain their own drag payload.
export function GroupButton({
  group,
  groups,
  busy,
  className,
  label,
  children,
  onToggle,
  onReorder,
}: {
  group: TabGroup;
  groups: TabGroup[];
  busy: boolean;
  className: string;
  label: string;
  children: ReactNode;
  onToggle: (id: string) => void;
  onReorder: (source: string, target: string, placement: GroupPlacement) => void;
}) {
  return (
    <button
      className={className}
      aria-label={label}
      aria-expanded={!group.collapsed}
      title={t('Arraste para reordenar · Alt + setas também move o grupo')}
      disabled={busy}
      draggable={!busy}
      onClick={() => onToggle(group.id)}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.setData(GROUP_DRAG_TYPE, group.id);
        event.dataTransfer.effectAllowed = 'move';
      }}
      onKeyDown={(event) => {
        if (
          !event.altKey ||
          !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight';
        const target =
          groups[groups.findIndex((item) => item.id === group.id) + (forward ? 1 : -1)];
        if (target) onReorder(group.id, target.id, forward ? 'after' : 'before');
      }}
    >
      {children}
    </button>
  );
}
