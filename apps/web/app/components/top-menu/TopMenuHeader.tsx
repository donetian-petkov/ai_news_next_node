'use client';

import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GridViewIcon from '@mui/icons-material/GridView';
import MenuIcon from '@mui/icons-material/Menu';
import OpenWithIcon from '@mui/icons-material/OpenWith';
import SearchIcon from '@mui/icons-material/Search';
import SummarizeIcon from '@mui/icons-material/Summarize';
import { DateTimePill } from './DateTimePill';
import { StatusPills } from './StatusPills';
import { QuickVibeSelect } from './QuickVibeSelect';
import { TopMenuActionButton } from './TopMenuActionButton';
import { useTopMenuContext } from './context/useTopMenuContext';

export function TopMenuHeader() {
  const {
    labels,
    topHintAsButtons,
    isMobile,
    searchLabel,
    addStreamLabel,
    allColumnLabel,
    menuLabel,
    hideAllResearchLabel,
    hideAllSummariesLabel,
    onScrollToColumns,
    onOpenHelp,
    onToggleMenu,
    onToggleSearch,
    onToggleAddStream,
    onToggleAllColumnControls,
    onToggleHideAllResearch,
    onToggleHideAllSummaries
  } = useTopMenuContext();

  return (
    <div className="headerRow">
      <Box className="headerLeft">
        <Stack direction="row" alignItems="center" spacing={1.1} className="headerTitleRow">
          <Typography id="appTitle" className="appTitleText" component="h1">
            {labels.title}
          </Typography>
        </Stack>
        {topHintAsButtons ? (
          <Stack className="subHintButtons" id="subHintButtons" direction="row" spacing={0.7} flexWrap="wrap">
            <Button className="subHintBtn" size="small" variant="outlined" type="button" onClick={onScrollToColumns} startIcon={<OpenWithIcon fontSize="small" />}>
              {labels.subHintDrag}
            </Button>
            <Button className="subHintBtn" size="small" variant="outlined" type="button" onClick={onOpenHelp}>
              ? {labels.subHintHelp}
            </Button>
            <Button className="subHintBtn" size="small" variant="outlined" type="button" onClick={onToggleMenu} startIcon={<MenuIcon fontSize="small" />}>
              M {labels.subHintMenu}
            </Button>
            <Button className="subHintBtn" size="small" variant="outlined" type="button" onClick={onToggleSearch} startIcon={<SearchIcon fontSize="small" />}>
              / {labels.subHintSearch}
            </Button>
          </Stack>
        ) : (
          <div className="subHint" id="subHint">
            {labels.subHint}
          </div>
        )}
      </Box>

      {!isMobile ? (
        <Box className="headerCenter">
          <DateTimePill />
        </Box>
      ) : null}

      {isMobile ? (
        <Stack className="headerRight mobileTopActions mobileTopActionsStack" spacing={1.1}>
          <Stack className="mobileStatusRow" direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Stack className="mobileStatusPills" direction="row" spacing={0.8}>
              <StatusPills />
            </Stack>
            <Stack direction="row" spacing={0.8}>
              <IconButton
                id="menuToggle"
                className="mobileMenuToggleBtn"
                size="small"
                onClick={onToggleMenu}
              >
                <MenuIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Stack>
      ) : (
        <Stack className="headerRight" direction="row" flexWrap="wrap" gap={1.1} alignItems="center">
          <StatusPills />
          <QuickVibeSelect />
          <TopMenuActionButton id="quickSearchBtn" label={searchLabel} icon={<SearchIcon fontSize="small" />} onClick={onToggleSearch} />
          <TopMenuActionButton id="quickAddStreamBtn" label={addStreamLabel} icon={<AddIcon fontSize="small" />} onClick={onToggleAddStream} />
          <TopMenuActionButton id="allColControlsToggle" label={allColumnLabel} icon={<GridViewIcon fontSize="small" />} onClick={onToggleAllColumnControls} />
          <TopMenuActionButton id="hideAllResearchBtn" label={hideAllResearchLabel} icon={<AutoAwesomeIcon fontSize="small" />} onClick={onToggleHideAllResearch} />
          <TopMenuActionButton id="hideAllSummariesBtn" label={hideAllSummariesLabel} icon={<SummarizeIcon fontSize="small" />} onClick={onToggleHideAllSummaries} />
          <TopMenuActionButton id="menuToggle" label={menuLabel} icon={<MenuIcon fontSize="small" />} onClick={onToggleMenu} />
        </Stack>
      )}
    </div>
  );
}
