'use client';

import type { ReactNode } from 'react';
import { Badge, Button, Tooltip } from '@mui/material';
import { useTopMenuContext } from './context/useTopMenuContext';

type TopMenuActionButtonProps = {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  badgeContent?: number;
  menuItemsAsIcons?: boolean;
  onBeforeClick?: () => void;
};

export function TopMenuActionButton({
  id,
  label,
  icon,
  badgeContent,
  menuItemsAsIcons,
  onClick,
  onBeforeClick
}: TopMenuActionButtonProps) {
  const topMenu = useTopMenuContext();
  const iconMode = menuItemsAsIcons ?? topMenu.menuItemsAsIcons;
  const beforeClick = onBeforeClick ?? topMenu.onPlayToggleSound;
  const hasBadge = typeof badgeContent === 'number' && badgeContent > 0;
  const iconNode = hasBadge ? (
    <Badge
      badgeContent={badgeContent > 99 ? '99+' : badgeContent}
      color="secondary"
      overlap="circular"
      sx={{
        '& .MuiBadge-badge': {
          minWidth: 18,
          height: 18,
          px: 0.5,
          fontSize: '0.7rem',
          fontWeight: 900,
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 8px 18px rgba(0,0,0,0.25)'
        }
      }}
    >
      <span>{icon}</span>
    </Badge>
  ) : icon;

  const onActionClick = () => {
    beforeClick?.();
    onClick();
  };

  if (!iconMode) {
    return (
      <Button id={id} className="btn ghost" size="small" variant="outlined" type="button" onClick={onActionClick}>
        {label}
      </Button>
    );
  }

  return (
    <Tooltip title={label}>
      <Button
        id={id}
        className="btn ghost topMenuActionBtnIconOnly"
        size="small"
        variant="outlined"
        type="button"
        aria-label={label}
        onClick={onActionClick}
      >
        {iconNode}
      </Button>
    </Tooltip>
  );
}
