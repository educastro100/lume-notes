import { Sunrise, Sun, Sunset, Moon, MoonStar } from 'lucide-react';
import { THEME_ORDER, type Theme } from '../preferences';

const phases = [Sunrise, Sun, Sunset, Moon, MoonStar];
export function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <span className="theme-orbit" aria-hidden="true">
      <span
        className="theme-orbit-track"
        style={{
          height: `${THEME_ORDER.length * 20}px`,
          transform: `translateY(-${THEME_ORDER.indexOf(theme) * (100 / THEME_ORDER.length)}%)`,
        }}
      >
        {phases.map((Icon, index) => (
          <span key={index}>
            <Icon size={17} />
          </span>
        ))}
      </span>
    </span>
  );
}
