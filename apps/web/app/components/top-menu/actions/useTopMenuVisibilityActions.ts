'use client';

import { useCallback } from 'react';
import { setTopUiState } from '../../../store/slices/uiSlice';
import type { AppDispatch, RootState } from '../../../store/store';
import type { TopMenuFocusTarget } from '../types';

type Args = {
  dispatch: AppDispatch;
  ui: RootState['ui'];
  isMobile: boolean;
  setMobileDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  scheduleFocus: (target: TopMenuFocusTarget, delay?: number) => void;
};

export function useTopMenuVisibilityActions({
  dispatch,
  ui,
  isMobile,
  setMobileDrawerOpen,
  scheduleFocus
}: Args) {
  const toggleSearch = useCallback(() => {
    const nextSearchVisible = !ui.searchVisible;
    if (isMobile) setMobileDrawerOpen(true);
    dispatch(setTopUiState({ menuCollapsed: false, searchVisible: nextSearchVisible }));
    if (nextSearchVisible) scheduleFocus('search', isMobile ? 80 : 30);
  }, [dispatch, isMobile, scheduleFocus, setMobileDrawerOpen, ui.searchVisible]);

  const toggleAddStream = useCallback(() => {
    const nextAddStreamVisible = !ui.addStreamVisible;
    if (isMobile) setMobileDrawerOpen(true);
    dispatch(setTopUiState({ menuCollapsed: false, addStreamVisible: nextAddStreamVisible }));
    if (nextAddStreamVisible) scheduleFocus('addStream', isMobile ? 80 : 30);
  }, [dispatch, isMobile, scheduleFocus, setMobileDrawerOpen, ui.addStreamVisible]);

  const toggleControls = useCallback(() => {
    if (isMobile) {
      setMobileDrawerOpen(true);
      dispatch(setTopUiState({ menuCollapsed: false, controlsCollapsed: false }));
      return;
    }

    dispatch(setTopUiState({ menuCollapsed: false, controlsCollapsed: false }));
  }, [dispatch, isMobile, setMobileDrawerOpen]);

  const toggleMenu = useCallback(() => {
    if (isMobile) {
      setMobileDrawerOpen(prev => !prev);
      return;
    }

    const nextMenuCollapsed = !ui.menuCollapsed;
    dispatch(setTopUiState({
      menuCollapsed: nextMenuCollapsed,
      controlsCollapsed: nextMenuCollapsed ? ui.controlsCollapsed : false
    }));
  }, [dispatch, isMobile, setMobileDrawerOpen, ui.controlsCollapsed, ui.menuCollapsed]);

  const toggleAllColumnControls = useCallback(() => {
    dispatch(setTopUiState({ allColumnControlsHidden: !ui.allColumnControlsHidden }));
  }, [dispatch, ui.allColumnControlsHidden]);

  return {
    toggleSearch,
    toggleAddStream,
    toggleControls,
    toggleMenu,
    toggleAllColumnControls
  };
}
