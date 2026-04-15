'use client';

import type { TFunction } from 'i18next';
import type { AppDispatch, RootState } from '../../store/store';
import { useTopMenuAddStreamAction } from './actions/useTopMenuAddStreamAction';
import { useTopMenuAiActions } from './actions/useTopMenuAiActions';
import { useTopMenuAppearanceActions } from './actions/useTopMenuAppearanceActions';
import { useTopMenuMaintenanceActions } from './actions/useTopMenuMaintenanceActions';
import { useTopMenuVisibilityActions } from './actions/useTopMenuVisibilityActions';
import type { AddStatus, FeedType, TopMenuActionsResult, TopMenuFocusTarget } from './types';
import type { TopMenuDeleteAge } from './topMenu.services';

type UseTopMenuActionsArgs = {
  dispatch: AppDispatch;
  ui: RootState['ui'];
  feeds: RootState['feeds']['feeds'];
  isMobile: boolean;
  labels: Record<string, string>;
  t: TFunction;
  feedType: FeedType;
  feedUrl: string;
  feedLabel: string;
  feedInterval: string;
  deleteAgeAll: TopMenuDeleteAge;
  setAddStatus: React.Dispatch<React.SetStateAction<AddStatus>>;
  setFeedUrl: React.Dispatch<React.SetStateAction<string>>;
  setFeedLabel: React.Dispatch<React.SetStateAction<string>>;
  setMobileDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  scheduleFocus: (target: TopMenuFocusTarget, delay?: number) => void;
};

export function useTopMenuActions({
  dispatch,
  ui,
  feeds,
  isMobile,
  labels,
  t,
  feedType,
  feedUrl,
  feedLabel,
  feedInterval,
  deleteAgeAll,
  setAddStatus,
  setFeedUrl,
  setFeedLabel,
  setMobileDrawerOpen,
  scheduleFocus
}: UseTopMenuActionsArgs): TopMenuActionsResult {
  const addStream = useTopMenuAddStreamAction({
    feedType,
    feedUrl,
    feedLabel,
    feedInterval,
    labels,
    setAddStatus,
    setFeedUrl,
    setFeedLabel
  });

  const {
    toggleSearch,
    toggleAddStream,
    toggleControls,
    toggleMenu,
    toggleAllColumnControls
  } = useTopMenuVisibilityActions({
    dispatch,
    ui,
    isMobile,
    setMobileDrawerOpen,
    scheduleFocus
  });

  const { cycleTheme, cycleVibe } = useTopMenuAppearanceActions({ dispatch, ui });

  const {
    applyAllBudget,
    changeAiProvider,
    setProviderApiKey,
    requestNotificationPermission
  } = useTopMenuAiActions({
    dispatch,
    t,
    labels,
    feeds
  });

  const { resetAllNewest, deleteOldAllColumns } = useTopMenuMaintenanceActions({
    dispatch,
    feeds,
    deleteAgeAll,
    storiesPerColumn: ui.storiesPerColumn
  });

  return {
    addStream,
    toggleSearch,
    toggleAddStream,
    toggleControls,
    toggleMenu,
    toggleAllColumnControls,
    cycleTheme,
    cycleVibe,
    applyAllBudget,
    changeAiProvider,
    setProviderApiKey,
    requestNotificationPermission,
    resetAllNewest,
    deleteOldAllColumns
  };
}
