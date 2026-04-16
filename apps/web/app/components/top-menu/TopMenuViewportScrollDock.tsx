'use client';

import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import { IconButton } from '@mui/material';
import { useTopMenuContext } from './context/useTopMenuContext';

export function TopMenuViewportScrollDock() {
  const {
    labels,
    onPlayToggleSound,
    onScrollToPageTop,
    onScrollToPageBottom
  } = useTopMenuContext();

  const onScrollAction = (action: () => void) => {
    onPlayToggleSound?.();
    action();
  };

  return (
    <div className="viewportScrollDock" aria-label="Page scroll controls">
      <IconButton
        id="pageTopBtn"
        className="viewportScrollDockBtn"
        size="small"
        aria-label={labels.pageTop}
        onClick={() => onScrollAction(onScrollToPageTop)}
      >
        <VerticalAlignTopIcon fontSize="small" />
      </IconButton>
      <IconButton
        id="pageBottomBtn"
        className="viewportScrollDockBtn"
        size="small"
        aria-label={labels.pageBottom}
        onClick={() => onScrollAction(onScrollToPageBottom)}
      >
        <VerticalAlignBottomIcon fontSize="small" />
      </IconButton>
    </div>
  );
}
