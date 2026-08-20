import React from 'react';
import zenvLogoImg from '../assets/zenv-logo.png';

/**
 * ZENV Official Brand Logo Component conforming strictly to ZENV Brand Guidelines
 * Supports:
 * - Primary Lockup (Page 41): ZENV | [ENTITY NAME in uppercase, kerning 240]
 * - Secondary Lockup (Page 43): ZENV logotype with QUANTUM subtext (kerning 1275)
 * - Brand Tagline (Page 4): "THINK. ADAPT. EVOLVE."
 */
export function ZenvLogo({
  variant = 'horizontal', // 'horizontal' | 'white' | 'dark' | 'icon'
  size = 'md',            // 'sm' | 'md' | 'lg'
  subtext = 'QUANTUM',
  entityName = '',        // e.g. 'RFTRACK' for Primary Lockup (Page 41)
  tagline = '',           // e.g. 'THINK. ADAPT. EVOLVE.' (Page 4)
  className = ''
}) {
  const iconHeights = {
    sm: 20,
    md: 26,
    lg: 38
  };

  const fontSizes = {
    sm: '1.05rem',
    md: '1.22rem',
    lg: '1.60rem'
  };

  const subFontSizes = {
    sm: '0.55rem',
    md: '0.62rem',
    lg: '0.78rem'
  };

  const h = iconHeights[size] || iconHeights.md;
  const isWhite = variant === 'white';
  const textColor = isWhite ? '#ffffff' : 'var(--color-primary, #102b4d)';
  const subColor = isWhite ? 'rgba(255, 255, 255, 0.75)' : 'var(--color-primary-light, #1e556d)';
  const separatorColor = isWhite ? 'rgba(255, 255, 255, 0.3)' : 'var(--color-border, #d1d1d1)';

  return (
    <div
      className={`zenv-logo-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'transparent',
        gap: '0.6rem',
        userSelect: 'none'
      }}
    >
      {/* ZENV Geometric Octothorpe Mark (Page 18) */}
      <img
        src={zenvLogoImg}
        alt="ZENV"
        style={{
          height: `${h}px`,
          width: 'auto',
          objectFit: 'contain',
          display: 'block',
          ...(isWhite ? { filter: 'brightness(0) invert(1)' } : {})
        }}
      />

      {/* ZENV Master Logotype (Stem Medium / Outfit / Noto Sans per Pages 19, 31, 33) */}
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span style={{
          fontFamily: 'var(--font-family-display, var(--font-family))',
          fontWeight: '700',
          fontSize: fontSizes[size] || fontSizes.md,
          letterSpacing: '1.5px',
          color: textColor
        }}>
          ZENV
        </span>
        {subtext && (
          <span style={{
            fontFamily: 'var(--font-family-display, var(--font-family))',
            fontWeight: '600',
            fontSize: subFontSizes[size] || subFontSizes.md,
            letterSpacing: '3px',
            color: subColor,
            textTransform: 'uppercase',
            marginTop: '2px'
          }}>
            {subtext}
          </span>
        )}
      </div>

      {/* Primary Brand Lockup with Entity Name (Page 41 of Guidelines) */}
      {entityName && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginLeft: '0.2rem' }}>
          <span style={{
            height: `${h * 0.75}px`,
            width: '1px',
            background: separatorColor,
            display: 'inline-block'
          }} />
          <span style={{
            fontFamily: 'var(--font-family-display, var(--font-family))',
            fontWeight: '400',
            fontSize: fontSizes[size] || fontSizes.md,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: isWhite ? '#ffffff' : 'var(--color-primary, #102b4d)'
          }}>
            {entityName}
          </span>
        </div>
      )}

      {/* Optional Brand Tagline (Page 4: Think. Adapt. Evolve) */}
      {tagline && (
        <span style={{
          fontSize: '0.65rem',
          letterSpacing: '0.15em',
          color: subColor,
          textTransform: 'uppercase',
          marginLeft: '0.5rem',
          fontWeight: '600'
        }}>
          {tagline}
        </span>
      )}
    </div>
  );
}
