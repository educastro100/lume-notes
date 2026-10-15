import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
export function SoftCollapse({
  open,
  horizontal = false,
  children,
}: {
  open: boolean;
  horizontal?: boolean;
  children: ReactNode;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(0);
  useLayoutEffect(() => {
    const node = content.current;
    if (!node) return;
    const measure = () => setSize(horizontal ? node.scrollWidth : node.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [horizontal]);
  return (
    <div
      className={`soft-collapse ${horizontal ? 'horizontal' : 'vertical'}`}
      inert={!open}
      aria-hidden={!open}
      style={horizontal ? { width: open ? size : 0 } : { height: open ? size : 0 }}
    >
      <div ref={content} className="soft-collapse-content">
        {children}
      </div>
    </div>
  );
}
