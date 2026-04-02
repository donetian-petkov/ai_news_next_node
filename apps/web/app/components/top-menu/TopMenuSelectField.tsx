'use client';

import { useMemo, useRef, useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';

export type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  id: string;
  label: string;
  title?: string;
  value: T;
  options: Option<T>[];
  disabled?: boolean;
  layout?: 'inline' | 'stacked';
  wrapperClassName?: string;
  onChange: (next: T) => void;
};

export function TopMenuSelectField<T extends string>({
  id,
  label,
  title,
  value,
  options,
  disabled,
  layout = 'inline',
  wrapperClassName,
  onChange
}: Props<T>) {
  const isMobile = useMediaQuery('(max-width:900px)');
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopAnchorEl, setDesktopAnchorEl] = useState<HTMLButtonElement | null>(null);
  const popupSurfaceColor = 'var(--bg-main)';
  const popupSurfaceBackground = 'linear-gradient(180deg, color-mix(in srgb, var(--bg-main) 94%, var(--accent-color) 6%), color-mix(in srgb, var(--bg-main) 88%, black 12%))';
  const popupItemBackground = 'linear-gradient(180deg, color-mix(in srgb, var(--bg-main) 86%, var(--accent-color) 14%), color-mix(in srgb, var(--bg-main) 78%, black 22%))';
  const popupItemHoverBackground = 'linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 22%, var(--bg-main)), color-mix(in srgb, var(--accent-color) 28%, var(--bg-main)))';
  const popupItemActiveBackground = 'linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 30%, var(--bg-main)), color-mix(in srgb, var(--accent-color) 38%, var(--bg-main)))';
  const cls = ['checkbox', layout === 'stacked' ? 'checkboxStacked' : '', wrapperClassName || '']
    .filter(Boolean)
    .join(' ');
  const selectedLabel = useMemo(
    () => options.find(option => option.value === value)?.label || value,
    [options, value]
  );
  const desktopMenuOpen = !!desktopAnchorEl;
  const desktopMenuMinWidth = desktopAnchorEl
    ? Math.min(
      desktopAnchorEl.getBoundingClientRect().width,
      typeof window !== 'undefined' ? Math.max(window.innerWidth - 24, 160) : desktopAnchorEl.getBoundingClientRect().width
    )
    : undefined;

  const trigger = (
    <button
      ref={triggerRef}
      id={id}
      type="button"
      className="select topMenuSelectTrigger"
      disabled={disabled}
      aria-haspopup={isMobile ? 'dialog' : 'menu'}
      aria-expanded={isMobile ? mobileOpen : desktopMenuOpen}
      onClick={() => {
        if (disabled) return;
        if (isMobile) setMobileOpen(true);
        else setDesktopAnchorEl(triggerRef.current);
      }}
    >
      <span className="topMenuSelectTriggerLabel">{selectedLabel}</span>
      <span className="topMenuSelectTriggerIcon" aria-hidden="true">
        <KeyboardArrowDownIcon fontSize="small" />
      </span>
    </button>
  );

  if (isMobile) {
    return (
      <>
        <label className={cls} title={title}>
          <span id={`${id}Prefix`}>{label}</span>
          {trigger}
        </label>
        <Dialog
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          fullWidth
          maxWidth="xs"
          PaperProps={{
            sx: {
              backgroundColor: popupSurfaceColor,
              backgroundImage: popupSurfaceBackground,
              color: 'var(--text-main)',
              border: '1px solid var(--panel-border)',
              borderRadius: 4,
              boxShadow: '0 26px 54px rgba(0, 0, 0, 0.42), 0 0 0 1px color-mix(in srgb, var(--panel-border) 92%, transparent)',
              backdropFilter: 'none',
              isolation: 'isolate'
            }
          }}
        >
          <DialogTitle
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              pb: 1
            }}
          >
            <span>{label}</span>
            <IconButton onClick={() => setMobileOpen(false)} sx={{ color: 'var(--text-main)' }}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent sx={{ pt: '0 !important', pb: 1.2 }}>
            <List
              sx={{
                py: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.8,
                backgroundColor: 'transparent',
                backgroundImage: 'none'
              }}
            >
              {options.map(option => {
                const selected = option.value === value;
                return (
                  <ListItemButton
                    key={option.value}
                    selected={selected}
                    onClick={() => {
                      onChange(option.value);
                      setMobileOpen(false);
                    }}
                    sx={{
                      borderRadius: 3,
                      minHeight: 52,
                      border: '1px solid color-mix(in srgb, var(--accent-color) 34%, var(--panel-border))',
                      background: selected ? popupItemActiveBackground : popupItemBackground,
                      boxShadow: '0 12px 24px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                      '&:hover': {
                        background: selected ? popupItemActiveBackground : popupItemHoverBackground
                      }
                    }}
                  >
                    <Box
                      sx={{
                        width: '100%',
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1.2
                      }}
                    >
                      <ListItemText
                        primary={option.label}
                        primaryTypographyProps={{
                          sx: {
                            color: 'var(--text-main)',
                            fontWeight: selected ? 800 : 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            letterSpacing: '0.01em'
                          }
                        }}
                      />
                      <CheckIcon
                        sx={{
                          flex: '0 0 auto',
                          fontSize: '1.05rem',
                          color: 'var(--text-main)',
                          opacity: selected ? 0.95 : 0.18
                        }}
                      />
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <label className={cls} title={title}>
        <span id={`${id}Prefix`}>{label}</span>
        {trigger}
      </label>
      <Menu
        anchorEl={desktopAnchorEl}
        open={desktopMenuOpen}
        onClose={() => setDesktopAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 0.7,
            width: 'max-content',
            minWidth: desktopMenuMinWidth ? `${desktopMenuMinWidth}px` : undefined,
            maxWidth: 'calc(100vw - 24px)',
            border: '1px solid var(--panel-border)',
            borderRadius: 2,
            backgroundColor: popupSurfaceColor,
            backgroundImage: popupSurfaceBackground,
            color: 'var(--text-main)',
            overflow: 'hidden',
            boxShadow: '0 22px 48px rgba(0, 0, 0, 0.44), 0 0 0 1px color-mix(in srgb, var(--panel-border) 92%, transparent)',
            backdropFilter: 'none',
            isolation: 'isolate'
          }
        }}
        MenuListProps={{
          dense: true,
          sx: {
            p: 0.8,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.6,
            backgroundColor: 'transparent',
            backgroundImage: 'none'
          }
        }}
      >
        {options.map(option => {
          const selected = option.value === value;
          return (
            <MenuItem
              key={option.value}
              selected={selected}
              onClick={() => {
                onChange(option.value);
                setDesktopAnchorEl(null);
              }}
              sx={{
                borderRadius: 3,
                minHeight: 48,
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                border: '1px solid color-mix(in srgb, var(--accent-color) 34%, var(--panel-border))',
                background: selected ? popupItemActiveBackground : popupItemBackground,
                fontWeight: selected ? 800 : 650,
                letterSpacing: '0.01em',
                boxShadow: '0 12px 24px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                '&:hover, &.Mui-focusVisible': {
                  background: selected ? popupItemActiveBackground : popupItemHoverBackground
                },
                '&.Mui-selected:hover': {
                  background: popupItemActiveBackground
                }
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.2
                }}
              >
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {option.label}
                </span>
                <CheckIcon
                  sx={{
                    flex: '0 0 auto',
                    fontSize: '1.02rem',
                    color: 'var(--text-main)',
                    opacity: selected ? 0.95 : 0.18
                  }}
                />
              </Box>
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
