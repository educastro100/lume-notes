import { Sun, Sunset, Moon, MoonStar } from 'lucide-react';
import type { Theme } from '../preferences';

const phases = [Sun, Sunset, Moon, MoonStar];
const order: Theme[] = ['light', 'sunset', 'dark', 'midnight'];
export function ThemeIcon({ theme }: { theme: Theme }) {
  return (
    <span className="theme-orbit" aria-hidden="true">
      <span
        className="theme-orbit-track"
        style={{ transform: `translateY(-${order.indexOf(theme) * 25}%)` }}
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
