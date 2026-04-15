'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import TuneIcon from '@mui/icons-material/Tune';
import VerticalAlignTopIcon from '@mui/icons-material/VerticalAlignTop';
import { Button, Stack } from '@mui/material';
import { useFeedColumnsContext } from '../../context/useFeedColumnsContext';
import { useFeedColumnContext } from '../context/useFeedColumnContext';

export function FeedColumnCoreActions() {
  const { feed, isMatchColumn, isEmergingColumn } = useFeedColumnContext();
  const { view, state, handlers } = useFeedColumnsContext();
  const { connected, compactBtnSx, labels } = view;
  const { pinnedByUrl, controlsOpenByUrl } = state;
  const { onTogglePinnedColumn, onMoveFeedToTop, onRemoveFeed, onToggleFeedControls } = handlers;
  const pinned = !!pinnedByUrl[feed.url];
  const controlsOpen = typeof controlsOpenByUrl[feed.url] === 'boolean' ? !!controlsOpenByUrl[feed.url] : true;

  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1.1 }} flexWrap="wrap">
      {!isMatchColumn && !isEmergingColumn ? (
        <Button
          size="small"
          variant={pinned ? 'contained' : 'outlined'}
          startIcon={pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}
          onClick={() => onTogglePinnedColumn(feed.url)}
          sx={compactBtnSx}
        >
          {pinned ? labels.pinned : labels.pin}
        </Button>
      ) : null}
      {!isMatchColumn && !isEmergingColumn ? (
        <Button
          size="small"
          variant="outlined"
          startIcon={<VerticalAlignTopIcon />}
          onClick={() => onMoveFeedToTop(feed.url)}
          sx={compactBtnSx}
        >
          {labels.moveToTop}
        </Button>
      ) : null}
      {!isMatchColumn && !isEmergingColumn ? (
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => onRemoveFeed(feed.url)}
          disabled={!connected}
          sx={compactBtnSx}
        >
          {labels.remove}
        </Button>
      ) : null}
      <Button
        size="small"
        variant="outlined"
        startIcon={<TuneIcon />}
        onClick={() => onToggleFeedControls(feed.url)}
        sx={compactBtnSx}
      >
        {controlsOpen ? labels.hideControls : labels.showControls}
      </Button>
    </Stack>
  );
}
