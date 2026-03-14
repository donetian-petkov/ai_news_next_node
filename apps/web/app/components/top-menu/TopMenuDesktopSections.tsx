'use client';

import { TopMenuDesktopOverlay } from './TopMenuDesktopOverlay';
import { useTopMenuContext } from './context/useTopMenuContext';

export function TopMenuDesktopSections() {
  const { showDesktopBody, isMobile } = useTopMenuContext();

  if (isMobile || !showDesktopBody) return null;

  return <TopMenuDesktopOverlay />;
}
