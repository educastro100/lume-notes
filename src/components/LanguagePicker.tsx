import { useEffect, useRef, useState, type Ref } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { LANGUAGES, type Locale } from '../i18n';
import { CountryFlag } from './CountryFlag';

const locales = Object.keys(LANGUAGES) as Locale[];
export function LanguagePicker({
  value,
  onChange,
  disabled,
  buttonRef,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [highlight, setHighlight] = useState(locales.indexOf(value));
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (expanded)
      document
        .getElementById(`language-${locales[highlight]}`)
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [expanded, highlight]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setExpanded(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => {
    if (disabled) setExpanded(false);
  }, [disabled]);
  const choose = (index: number) => {
    onChange(locales[index]);
    setExpanded(false);
  };
  return (
    <div className="language-picker" ref={root}>
      <button
        id="interface-language"
        ref={buttonRef}
        role="combobox"
        aria-labelledby="interface-language-label interface-language-value"
        aria-expanded={expanded}
        aria-controls="language-options"
        aria-haspopup="listbox"
        aria-activedescendant={expanded ? `language-${locales[highlight]}` : undefined}
        disabled={disabled}
        onClick={() => {
          setHighlight(locales.indexOf(value));
          setExpanded((open) => !open);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement?.contains(event.relatedTarget)) setExpanded(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && expanded) {
            event.preventDefault();
            event.stopPropagation();
            setExpanded(false);
          }
          if (event.key === 'Tab') setExpanded(false);
          if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault();
            setExpanded(true);
            setHighlight((index) =>
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? locales.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + locales.length) %
                    locales.length,
            );
          }
          if (expanded && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            choose(highlight);
          }
        }}
      >
        <CountryFlag locale={value} />
        <span id="interface-language-value" lang={value}>
          {LANGUAGES[value]}
        </span>
        <ChevronDown size={16} />
      </button>
      {expanded && (
        <div id="language-options" role="listbox" aria-labelledby="interface-language-label">
          {locales.map((locale, index) => (
            <button
              type="button"
              role="option"
              id={`language-${locale}`}
              key={locale}
              lang={locale}
              tabIndex={-1}
              aria-selected={value === locale}
              className={highlight === index ? 'highlighted' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onPointerMove={() => setHighlight(index)}
              onClick={() => choose(index)}
            >
              <CountryFlag locale={locale} />
              <span>{LANGUAGES[locale]}</span>
              {value === locale && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
