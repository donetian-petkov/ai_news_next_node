'use client';

import { useMemo, useRef, useState } from 'react';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import {
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
  const popupSurfaceBackground = 'linear-gradient(180deg, color-mix(in srgb, var(--bg-main) 90%, var(--accent-color) 10%), color-mix(in srgb, var(--section-bg) 88%, var(--bg-main) 12%))';
  const popupItemBackground = 'linear-gradient(180deg, color-mix(in srgb, var(--field-bg) 84%, var(--bg-main) 16%), color-mix(in srgb, var(--field-bg) 68%, var(--bg-main) 32%))';
  const popupItemActiveBackground = 'linear-gradient(180deg, color-mix(in srgb, var(--accent-color) 24%, var(--field-bg)), color-mix(in srgb, var(--accent-color) 34%, var(--bg-main)))';
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
              background: popupSurfaceBackground,
              color: 'var(--text-main)',
              border: '1px solid var(--panel-border)',
              borderRadius: 4,
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.34), 0 0 0 1px color-mix(in srgb, var(--panel-border) 88%, transparent)',
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
            <List sx={{ py: 0 }}>
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
                      mb: 0.8,
                      border: '1px solid var(--panel-border)',
                      background: selected ? popupItemActiveBackground : popupItemBackground,
                      boxShadow: '0 10px 22px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
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
            background: popupSurfaceBackground,
            color: 'var(--text-main)',
            overflow: 'hidden',
            boxShadow: '0 18px 44px rgba(0, 0, 0, 0.42), 0 0 0 1px color-mix(in srgb, var(--panel-border) 88%, transparent)',
            backdropFilter: 'none',
            isolation: 'isolate'
          }
        }}
        MenuListProps={{
          dense: true,
          sx: {
            p: 0.8,
            background: popupSurfaceBackground
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
                mb: 0.6,
                border: '1px solid var(--panel-border)',
                background: selected ? popupItemActiveBackground : popupItemBackground,
                fontWeight: selected ? 800 : 650,
                letterSpacing: '0.01em',
                boxShadow: '0 10px 22px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06)'
              }}
            >
              {option.label}
            </MenuItem>
          );
        })}
      </Menu>
    </>
  );
}
