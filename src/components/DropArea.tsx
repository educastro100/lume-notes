import { useEffect, useState, type CSSProperties, type ReactNode, type DragEvent } from 'react';
import type { GroupPlacement } from '../documents';
export const TAB_DRAG_TYPE = 'application/x-lume-tab';
export const GROUP_DRAG_TYPE = 'application/x-lume-group';
export function DropArea({
  children,
  className = '',
  style,
  onAssign,
  busy = false,
  groupId,
  onReorderGroup,
  horizontal = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onAssign: (ids: string[]) => void;
  busy?: boolean;
  groupId?: string;
  onReorderGroup?: (source: string, target: string, placement: GroupPlacement) => void;
  horizontal?: boolean;
}) {
  const [over, setOver] = useState(false);
  const [placement, setPlacement] = useState<GroupPlacement | null>(null);
  const reset = () => {
    setOver(false);
    setPlacement(null);
  };
  useEffect(() => {
    document.addEventListener('dragend', reset);
    document.addEventListener('drop', reset);
    return () => {
      document.removeEventListener('dragend', reset);
      document.removeEventListener('drop', reset);
    };
  }, []);
  const position = (event: DragEvent<HTMLDivElement>): GroupPlacement => {
    const rect = event.currentTarget.getBoundingClientRect();
    return (
      horizontal
        ? event.clientX < rect.left + rect.width / 2
        : event.clientY < rect.top + rect.height / 2
    )
      ? 'before'
      : 'after';
  };
  return (
    <div
      className={
        className + (over ? ' drop-hover' : '') + (placement ? ' group-drop-' + placement : '')
      }
      style={style}
      onDragOver={(event) => {
        if (busy) return;
        if (event.dataTransfer.types.includes(GROUP_DRAG_TYPE)) {
          if (!groupId || !onReorderGroup) return;
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = 'move';
          setOver(false);
          setPlacement(position(event));
          return;
        }
        if (!event.dataTransfer.types.includes(TAB_DRAG_TYPE)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          reset();
      }}
      onDragEnd={reset}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        reset();
        if (busy) return;
        if (event.dataTransfer.types.includes(GROUP_DRAG_TYPE)) {
          const source = event.dataTransfer.getData(GROUP_DRAG_TYPE);
          if (source && source !== groupId && groupId && onReorderGroup)
            onReorderGroup(source, groupId, position(event));
          return;
        }
        if (!event.dataTransfer.types.includes(TAB_DRAG_TYPE)) return;
        try {
          const value = JSON.parse(event.dataTransfer.getData(TAB_DRAG_TYPE));
          if (Array.isArray(value)) onAssign(value.filter((id) => typeof id === 'string'));
        } catch {
          /* Only accept Lume document drags. */
        }
      }}
    >
      {children}
    </div>
  );
}
