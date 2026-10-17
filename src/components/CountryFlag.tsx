import type { Locale } from '../i18n';

// Local SVGs stay visible in Windows/WebView2, where flag emoji can show letters.
export function CountryFlag({ locale }: { locale: Locale }) {
  return (
    <svg className="country-flag" viewBox="0 0 30 20" aria-hidden="true" focusable="false">
      {locale === 'pt-BR' && (
        <>
          <path fill="#229447" d="M0 0h30v20H0z" />
          <path fill="#ffdc45" d="m15 2 13 8-13 8L2 10z" />
          <circle fill="#28488c" cx="15" cy="10" r="5" />
          <path stroke="#fff" strokeWidth="1.2" fill="none" d="M10.3 8.5q5-1 9.3 3" />
        </>
      )}
      {locale === 'en' && (
        <>
          <path fill="#fff" d="M0 0h30v20H0z" />
          <path stroke="#c94351" strokeWidth="2" d="M0 1h30M0 5h30M0 9h30M0 13h30M0 17h30" />
          <path fill="#344f86" d="M0 0h13v11H0z" />
          <g fill="#fff">
            <circle cx="3" cy="3" r=".8" />
            <circle cx="7" cy="3" r=".8" />
            <circle cx="11" cy="3" r=".8" />
            <circle cx="5" cy="6" r=".8" />
            <circle cx="9" cy="6" r=".8" />
            <circle cx="3" cy="9" r=".8" />
            <circle cx="7" cy="9" r=".8" />
            <circle cx="11" cy="9" r=".8" />
          </g>
        </>
      )}
      {locale === 'fr' && (
        <>
          <path fill="#fff" d="M0 0h30v20H0z" />
          <path fill="#294b93" d="M0 0h10v20H0z" />
          <path fill="#e64a55" d="M20 0h10v20H20z" />
        </>
      )}
      {locale === 'de' && (
        <>
          <path fill="#282828" d="M0 0h30v7H0z" />
          <path fill="#d94d4b" d="M0 7h30v6H0z" />
          <path fill="#f4c94c" d="M0 13h30v7H0z" />
        </>
      )}
      {locale === 'el' && (
        <>
          <path fill="#fff" d="M0 0h30v20H0z" />
          <path
            stroke="#3675b9"
            strokeWidth="2.2"
            d="M0 1.1h30M0 5.55h30M0 10h30M0 14.45h30M0 18.9h30"
          />
          <path fill="#3675b9" d="M0 0h11v11H0z" />
          <path stroke="#fff" strokeWidth="2" d="M5.5 0v11M0 5.5h11" />
        </>
      )}
      {locale === 'zh-Hans' && (
        <>
          <path fill="#d94a42" d="M0 0h30v20H0z" />
          <path
            fill="#ffda56"
            d="m7 3 1.2 3.6H12l-3 2.2 1.1 3.6L7 10.2l-3.1 2.2L5 8.8 2 6.6h3.8z"
          />
          <g fill="#ffda56">
            <circle cx="14" cy="3" r="1" />
            <circle cx="17" cy="6" r="1" />
            <circle cx="17" cy="10" r="1" />
            <circle cx="14" cy="13" r="1" />
          </g>
        </>
      )}
    </svg>
  );
}
