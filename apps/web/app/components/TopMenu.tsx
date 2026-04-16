'use client';

import { HelpDialog } from './top-menu/HelpDialog';
import { TopMenuHeader } from './top-menu/TopMenuHeader';
import { TopMenuViewportScrollDock } from './top-menu/TopMenuViewportScrollDock';
import { TopMenuMobileDrawer } from './top-menu/TopMenuMobileDrawer';
import { TopMenuDesktopSections } from './top-menu/TopMenuDesktopSections';
import { ToastStack } from './top-menu/ToastStack';
import { TopMenuProvider } from './top-menu/context/TopMenuProvider';
import { useTopMenuController } from './top-menu/useTopMenuController';

export default function TopMenu() {
  const {
    topbarInnerRef,
    contextValue
  } = useTopMenuController();

  return (
    <TopMenuProvider value={contextValue}>
      <div className="topbar">
        <div className="topbarInner" id="topbarInner" ref={topbarInnerRef}>
          <TopMenuHeader />

          <TopMenuDesktopSections />
        </div>

        <TopMenuViewportScrollDock />
        <TopMenuMobileDrawer />

        <HelpDialog />
        <ToastStack />
      </div>
    </TopMenuProvider>
  );
}
