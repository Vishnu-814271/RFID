import React from 'react';

/**
 * ZENV Official Brand Iconography Library
 * Strictly conforming to ZENV Brand Guidelines:
 * - Page 18: Octothorpe Geometric Mark
 * - Page 44: Iconography Style 1 (Line Style Icons for Roles, Events & Products)
 * - Page 45: Iconography Style 2 (Two-Color Icons for DeepTech & Quantum Intelligence)
 * - Page 46: Sharp-edged geometry, no rounded corners, precise angles
 * - Page 29: ZENV Brand Colors (#102b4d Dark Blue, #1e556d Teal, #1d4150 Dark Green, #979085 Taupe)
 */

// 1. ZENV Octothorpe Mark (Page 18)
export function ZenvOctothorpeIcon({ size = 24, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className={className}>
      <path d="M20 30L45 50L20 70V30Z" stroke={color} strokeWidth="6" strokeLinejoin="miter" />
      <path d="M80 30L55 50L80 70V30Z" stroke={color} strokeWidth="6" strokeLinejoin="miter" />
      <path d="M32 40H68L50 55L32 40Z" stroke={color} strokeWidth="6" strokeLinejoin="miter" />
      <path d="M50 45L68 60H32L50 45Z" stroke={color} strokeWidth="6" strokeLinejoin="miter" />
    </svg>
  );
}

// 2. Dashboard / Grid Layout Icon (Page 44)
export function ZenvDashboardIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}

// 3. RFID / Barcode Scanner Line Icon (Page 44)
export function ZenvRfidScanIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M3 7V3h4" />
      <path d="M17 3h4v4" />
      <path d="M21 17v4h-4" />
      <path d="M7 21H3v-4" />
      <rect x="7" y="7" width="10" height="10" />
      <path d="M10 12h4" />
      <path d="M12 10v4" />
    </svg>
  );
}

// 4. RFID / Smart Card Badge (Page 44)
export function ZenvIdCardIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <rect x="3" y="4" width="18" height="16" />
      <circle cx="9" cy="10" r="2" />
      <path d="M15 8h3" />
      <path d="M15 12h3" />
      <path d="M6 17c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" />
      <path d="M14 16h4" />
    </svg>
  );
}

// 5. Users / People Group Icon (Page 44)
export function ZenvUsersIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// 6. Reports / Documents Icon (Page 44)
export function ZenvReportIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M14 2H5v20h14V7l-5-5z" />
      <polyline points="14 2 14 7 19 7" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="16" y2="17" />
      <line x1="8" y1="9" x2="11" y2="9" />
    </svg>
  );
}

// 7. Quantum Security Shield Icon (Page 44 & 45)
export function ZenvQuantumShieldIcon({ size = 20, color = 'currentColor', secondaryColor = '#1e556d', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M12 8v4" stroke={secondaryColor} />
      <path d="M10 14l2-2 2 2" stroke={secondaryColor} />
      <circle cx="12" cy="7" r="1" fill={secondaryColor} />
    </svg>
  );
}

// 8. Settings / Sharp Hexagon Gear Icon (Page 44 & 46)
export function ZenvSettingsIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

// 9. Key / Password Icon (Page 44)
export function ZenvKeyIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M21 2l-2 2m-1.5 1.5L14 9l-3-3-4 4 3 3-5.5 5.5a3.5 3.5 0 1 0 5 5L15 18l3 3 4-4-3-3 3.5-3.5z" />
      <circle cx="7.5" cy="16.5" r="1.5" />
    </svg>
  );
}

// 10. Padlock Icon (Page 44)
export function ZenvLockIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <rect x="4" y="10" width="16" height="12" />
      <path d="M7 10V6a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1.5" />
    </svg>
  );
}

// 11. Exit / Logout Icon (Page 44)
export function ZenvLogoutIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M9 21H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

// 12. Notification Bell Icon (Page 44)
export function ZenvBellIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// 13. Search Lens Icon (Page 44)
export function ZenvSearchIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// 14. Filter Icon (Page 44)
export function ZenvFilterIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// 15. Calendar Checkmark Icon (Page 44)
export function ZenvCalendarIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <rect x="3" y="4" width="18" height="18" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <polyline points="9 16 11 18 15 14" />
    </svg>
  );
}

// 16. Download Icon (Page 44)
export function ZenvDownloadIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// 17. Clock / Timestamp Icon (Page 44)
export function ZenvClockIcon({ size = 20, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// 18. Plus / Add Icon (Page 44)
export function ZenvPlusIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// 19. Trash / Delete Icon (Page 44)
export function ZenvTrashIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

// 20. Edit / Pencil Icon (Page 44)
export function ZenvEditIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  );
}

// 21. Ban / Blocked Icon (Page 44)
export function ZenvBanIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

// 22. Check / Approved Icon (Page 44)
export function ZenvCheckIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// 23. Alert Warning Triangle (Page 44)
export function ZenvAlertIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// 24. Refresh / Sync Icon (Page 44)
export function ZenvRefreshIcon({ size = 18, color = 'currentColor', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" className={className}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

// 25. Two-Color AI Neural Processor / Chip Icon (Page 45 - Style 2)
export function ZenvAiProcessorIcon({ size = 24, primaryColor = '#102b4d', accentColor = '#1e556d', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="5" y="5" width="14" height="14" stroke={primaryColor} strokeWidth="2" />
      <rect x="9" y="9" width="6" height="6" fill={accentColor} opacity="0.3" stroke={accentColor} strokeWidth="1.5" />
      <path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4" stroke={primaryColor} strokeWidth="2" />
    </svg>
  );
}

// 26. Two-Color Smart Document / Audit Checklist Icon (Page 45 - Style 2)
export function ZenvAuditDocIcon({ size = 20, primaryColor = 'currentColor', accentColor = '#1e556d', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M14 2H5v20h14V7l-5-5z" stroke={primaryColor} strokeWidth="2" strokeLinejoin="miter" />
      <polyline points="14 2 14 7 19 7" stroke={primaryColor} strokeWidth="2" strokeLinejoin="miter" />
      <path d="M8 13l2.5 2.5L16 10" stroke={accentColor} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
      <line x1="8" y1="18" x2="16" y2="18" stroke={primaryColor} strokeWidth="2" />
    </svg>
  );
}

// 27. Two-Color System Hierarchy / Roles Icon (Page 45 - Style 2)
export function ZenvHierarchyIcon({ size = 20, primaryColor = 'currentColor', accentColor = '#1e556d', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="3" width="6" height="5" stroke={accentColor} strokeWidth="2" />
      <rect x="3" y="16" width="5" height="5" stroke={primaryColor} strokeWidth="2" />
      <rect x="10" y="16" width="4" height="5" stroke={primaryColor} strokeWidth="2" />
      <rect x="16" y="16" width="5" height="5" stroke={primaryColor} strokeWidth="2" />
      <path d="M12 8v4M5.5 16v-4h13v4M12 12v4" stroke={primaryColor} strokeWidth="1.5" />
    </svg>
  );
}

// 28. 3D Quantum Data Cube / Monitoring Icon (Page 45 - Style 2)
export function ZenvQuantumCubeIcon({ size = 20, primaryColor = 'currentColor', accentColor = '#1e556d', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" stroke={primaryColor} strokeWidth="2" strokeLinejoin="miter" />
      <path d="M12 22V12" stroke={primaryColor} strokeWidth="2" />
      <path d="M21 7l-9 5-9-5" stroke={primaryColor} strokeWidth="2" />
      <circle cx="12" cy="12" r="2" fill={accentColor} />
    </svg>
  );
}

// 29. Two-Color Multi-screen Analytics Charts Icon (Page 45 - Style 2)
export function ZenvAnalyticsChartIcon({ size = 20, primaryColor = 'currentColor', accentColor = '#1e556d', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="3" width="13" height="11" stroke={primaryColor} strokeWidth="2" />
      <path d="M5 10l2.5-3 2.5 2 2.5-4" stroke={accentColor} strokeWidth="1.5" />
      <rect x="11" y="9" width="11" height="12" fill="#ffffff" stroke={primaryColor} strokeWidth="2" />
      <line x1="14" y1="17" x2="14" y2="15" stroke={accentColor} strokeWidth="2" />
      <line x1="17" y1="17" x2="17" y2="13" stroke={accentColor} strokeWidth="2" />
      <line x1="19" y1="17" x2="19" y2="11" stroke={accentColor} strokeWidth="2" />
    </svg>
  );
}

// 30. Two-Color Rocket Launch / Engine Icon (Page 45 - Style 2)
export function ZenvRocketLaunchIcon({ size = 20, primaryColor = 'currentColor', accentColor = '#1e556d', className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" stroke={accentColor} strokeWidth="2" />
      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" stroke={primaryColor} strokeWidth="2" />
      <path d="M9 12H4s.55-3.03 2-4.5c1.62-1.63 5-2.5 5-2.5" stroke={accentColor} strokeWidth="1.5" />
      <path d="M12 15v5s3.03-.55 4.5-2c1.63-1.62 2.5-5 2.5-5" stroke={accentColor} strokeWidth="1.5" />
    </svg>
  );
}
