import { t } from '../i18n';
import { useEffect, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { clamp, FONT_MIN, FONT_MAX } from '../preferences';
export function FontSizeControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const node = useRef<HTMLDivElement>(null),
    latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  useEffect(() => {
    let last = -Infinity;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      if (!event.deltaY || event.timeStamp - last < 65) return;
      last = event.timeStamp;
      latest.current.onChange(
        clamp(latest.current.value + (event.deltaY < 0 ? 1 : -1), FONT_MIN, FONT_MAX),
      );
    };
    const element = node.current;
    element?.addEventListener('wheel', wheel, { passive: false });
    return () => element?.removeEventListener('wheel', wheel);
  }, []);
  return (
    <div
      className="font-size-control"
      ref={node}
      role="group"
      aria-label={t('Tamanho da fonte')}
      title={t('Role para ajustar o tamanho da fonte')}
    >
      <button
        className="font-control"
        title={t('Diminuir fonte')}
        aria-label={t('Diminuir fonte')}
        onClick={() => onChange(clamp(value - 1, FONT_MIN, FONT_MAX))}
      >
        <Minus size={12} />
      </button>
      <span className="font-size" aria-live="polite">
        {value}
      </span>
      <button
        className="font-control"
        title={t('Aumentar fonte')}
        aria-label={t('Aumentar fonte')}
        onClick={() => onChange(clamp(value + 1, FONT_MIN, FONT_MAX))}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}
