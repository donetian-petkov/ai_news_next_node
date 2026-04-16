'use client';

import { useMemo, useRef, useState } from 'react';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
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
  iconSrc?: string;
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
  const popupShellRadius = '26px';
  const popupItemRadius = '20px';
  const cls = ['checkbox', layout === 'stacked' ? 'checkboxStacked' : '', wrapperClassName || '']
    .filter(Boolean)
    .join(' ');
  const selectedOption = useMemo(
    () => options.find(option => option.value === value),
    [options, value]
  );
  const selectedLabel = selectedOption?.label || value;
  const desktopMenuOpen = !!desktopAnchorEl;
  const desktopMenuMinWidth = desktopAnchorEl
    ? Math.min(
      desktopAnchorEl.getBoundingClientRect().width,
      typeof window !== 'undefined' ? Math.max(window.innerWidth - 24, 160) : desktopAnchorEl.getBoundingClientRect().width
    )
    : undefined;

  const renderOptionGlyph = (iconSrc?: string) => {
    if (!iconSrc) return null;

    return (
      <Box
        sx={{
          flex: '0 0 auto',
          width: 26,
          height: 26,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '999px',
          border: '1px solid color-mix(in srgb, var(--accent-color) 34%, var(--panel-border))',
          background:
            'radial-gradient(circle at 50% 35%, color-mix(in srgb, var(--accent-color) 18%, rgba(255, 255, 255, 0.08)), transparent 72%), linear-gradient(180deg, color-mix(in srgb, var(--field-bg) 80%, var(--accent-color) 20%), color-mix(in srgb, var(--bg-main) 78%, var(--accent-color) 22%))',
          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)'
        }}
      >
        <Box
          component="img"
          src={iconSrc}
          alt=""
          sx={{
            width: '72%',
            height: '72%',
            display: 'block',
            objectFit: 'contain',
            filter: 'drop-shadow(0 1px 6px rgba(0, 0, 0, 0.26))'
          }}
        />
      </Box>
    );
  };

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
      <span className="topMenuSelectTriggerContent">
        {selectedOption?.iconSrc ? (
          <Box component="span" className="topMenuSelectTriggerGlyph" aria-hidden="true">
            <Box component="img" className="topMenuSelectTriggerGlyphImage" src={selectedOption.iconSrc} alt="" />
          </Box>
        ) : null}
        <span className="topMenuSelectTriggerLabel">{selectedLabel}</span>
      </span>
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
              borderRadius: popupShellRadius,
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
                      borderRadius: popupItemRadius,
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
                        primary={(
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                            {renderOptionGlyph(option.iconSrc)}
                            <Box
                              component="span"
                              sx={{
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {option.label}
                            </Box>
                          </Box>
                        )}
                        primaryTypographyProps={{
                          component: 'div',
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
                          fontSize: '1rem',
                          color: 'var(--text-main)',
                          opacity: selected ? 0.98 : 0.18,
                          p: 0.4,
                          borderRadius: '999px',
                          background: selected
                            ? 'color-mix(in srgb, var(--accent-color) 26%, transparent)'
                            : 'transparent',
                          border: '1px solid color-mix(in srgb, var(--accent-color) 28%, transparent)'
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
            borderRadius: popupShellRadius,
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
                borderRadius: popupItemRadius,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0, flex: '1 1 auto' }}>
                  {renderOptionGlyph(option.iconSrc)}
                  <span
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {option.label}
                  </span>
                </Box>
                <CheckIcon
                  sx={{
                    flex: '0 0 auto',
                    fontSize: '1rem',
                    color: 'var(--text-main)',
                    opacity: selected ? 0.98 : 0.18,
                    p: 0.4,
                    borderRadius: '999px',
                    background: selected
                      ? 'color-mix(in srgb, var(--accent-color) 26%, transparent)'
                      : 'transparent',
                    border: '1px solid color-mix(in srgb, var(--accent-color) 28%, transparent)'
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
