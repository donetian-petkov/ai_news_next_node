'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import TuneIcon from '@mui/icons-material/Tune';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import { Box, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useFeedColumnsContext } from '../../context/useFeedColumnsContext';
import { useFeedColumnContext } from '../context/useFeedColumnContext';

export function FeedColumnCoreActions() {
  const { t } = useTranslation();
  const { feed, isMatchColumn, isEmergingColumn } = useFeedColumnContext();
  const { view, state, handlers } = useFeedColumnsContext();
  const { connected, compactBtnSx, labels } = view;
  const { pinnedByUrl, controlsOpenByUrl } = state;
  const { onTogglePinnedColumn, onMoveFeedToTop, onRemoveFeed, onToggleFeedControls, onResetNewsToTen } = handlers;
  const pinned = !!pinnedByUrl[feed.url];
  const controlsOpen = typeof controlsOpenByUrl[feed.url] === 'boolean' ? !!controlsOpenByUrl[feed.url] : true;
  const showColumnActions = !isMatchColumn && !isEmergingColumn;
  const resetVisibleCount = Math.max(1, Math.floor(Number(view.storiesPerColumn) || 1));
  const actionBtnSx = {
    ...compactBtnSx,
    width: '100%',
    minWidth: 0,
    justifyContent: 'center',
    px: { xs: 1, sm: 1.15 },
    '& .MuiButton-startIcon': {
      ml: 0,
      mr: { xs: 0.55, sm: 0.7 }
    }
  } as const;

  return (
    <Box
      sx={{
        mb: 1.1,
        display: 'grid',
        gap: 1,
        gridTemplateColumns: showColumnActions
          ? { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(4, minmax(0, 1fr))' }
          : { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' }
      }}
    >
      <Button
        size="small"
        variant="outlined"
        color="secondary"
        startIcon={<RestartAltIcon />}
        onClick={() => onResetNewsToTen(feed.url)}
        sx={actionBtnSx}
        fullWidth
        style={{ gridColumn: '1 / -1' }}
      >
        {t('columns.resetToFirstCount', { count: resetVisibleCount })}
      </Button>
      {showColumnActions ? (
        <Button
          size="small"
          variant={pinned ? 'contained' : 'outlined'}
          startIcon={pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
          onClick={() => onTogglePinnedColumn(feed.url)}
          sx={actionBtnSx}
        >
          {pinned ? labels.pinned : labels.pin}
        </Button>
      ) : null}
      {showColumnActions ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<VerticalAlignTopIcon />}
          onClick={() => onMoveFeedToTop(feed.url)}
          sx={actionBtnSx}
        >
          {labels.moveToTop}
        </Button>
      ) : null}
      {showColumnActions ? (
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => onRemoveFeed(feed.url)}
          disabled={!connected}
          sx={actionBtnSx}
        >
          {labels.remove}
        </Button>
      ) : null}
      <Button
        size="small"
        variant="outlined"
        startIcon={<TuneIcon />}
        onClick={() => onToggleFeedControls(feed.url)}
        sx={{
          ...actionBtnSx,
          gridColumn: '1 / -1'
        }}
      >
        {controlsOpen ? labels.hideControls : labels.showControls}
      </Button>
    </Box>
  );
}
