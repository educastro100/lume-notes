import { t } from '../i18n';
import { useRef } from 'react';
import { clamp } from '../preferences';
export function ResizeDivider({
  label,
  value,
  min,
  max,
  scale = 1,
  step = 10,
  reset,
  onChange,
  onResizing,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  scale?: number;
  step?: number;
  reset: number;
  onChange: (value: number) => void;
  onResizing: (active: boolean) => void;
}) {
  const drag = useRef<{ pointer: number; x: number; value: number } | null>(null);
  const finish = () => {
    drag.current = null;
    onResizing(false);
  };
  return (
    <div
      className="resize-divider"
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(max)}
      tabIndex={0}
      title={t('Arraste para redimensionar · duplo clique para restaurar')}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.focus();
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointer: event.pointerId, x: event.clientX, value };
        onResizing(true);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (start?.pointer === event.pointerId)
          onChange(clamp(start.value + (event.clientX - start.x) * scale, min, max));
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onLostPointerCapture={finish}
      onDoubleClick={() => onChange(clamp(reset, min, max))}
      onKeyDown={(event) => {
        const next =
          event.key === 'ArrowLeft'
            ? value - step
            : event.key === 'ArrowRight'
              ? value + step
              : event.key === 'Home'
                ? min
                : event.key === 'End'
                  ? max
                  : null;
        if (next !== null) {
          event.preventDefault();
          onChange(clamp(next, min, max));
        }
      }}
    />
  );
}
