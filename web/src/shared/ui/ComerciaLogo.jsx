import { useState } from 'react';
import logoDark from '../../assets/assets-comercia/logo/logo-horizontal-dark.svg';
import logoLight from '../../assets/assets-comercia/logo/logo-horizontal-light.svg';
import logoIcon from '../../assets/assets-comercia/logo/logo-icon.svg';
import logoIconLight from '../../assets/assets-comercia/logo/logo-icon-light.svg';

export function ComerciaLogo({ className = '', variant = 'dark', alt = 'ComercIA' }) {
  const [failed, setFailed] = useState(false);

  const getLogoSrc = () => {
    switch (variant) {
      case 'light':
        return logoLight;
      case 'icon':
        return logoIcon;
      case 'icon-light':
        return logoIconLight;
      case 'dark':
      default:
        return logoDark;
    }
  };

  const src = getLogoSrc();

  return (
    <span className={`comercia-logo brand-logo ${variant} ${className}`}>
      {!failed ? (
        <img src={src} alt={alt} className="comercia-logo-img" onError={() => setFailed(true)} />
      ) : (
        <span className="comercia-fallback-brand">
          <span className="brand-symbol">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              <path d="m9 14 2 2 4-4" />
            </svg>
          </span>
          <b>
            Comerc<span>IA</span>
          </b>
        </span>
      )}
    </span>
  );
}
