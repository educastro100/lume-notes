import type { Theme } from '../preferences';

export function BrandDot({ theme }: { theme: Theme }) {
  return (
    <span className="brand-dot" aria-hidden="true" data-tauri-drag-region>
      .<span className="brand-dot-glow" key={theme} />
    </span>
  );
}
