import { useState, type CSSProperties, type ReactNode } from 'react';
export const TAB_DRAG_TYPE = 'application/x-lume-tab';
export function DropArea({
  children,
  className = '',
  style,
  onAssign,
  busy = false,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onAssign: (ids: string[]) => void;
  busy?: boolean;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`${className} ${over ? 'drop-hover' : ''}`}
      style={style}
      onDragOver={(event) => {
        if (busy || !event.dataTransfer.types.includes(TAB_DRAG_TYPE)) return;
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
          setOver(false);
      }}
      onDragEnd={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        if (busy) return;
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
