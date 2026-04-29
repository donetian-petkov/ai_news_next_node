'use client';

import { useMemo } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from '@mui/material';
import { useTopMenuContext } from './context/useTopMenuContext';
import { formatTopMenuTimestamp } from './topMenu.services';

const NOTIFICATION_TONES = {
  success: {
    borderColor: 'rgba(190, 242, 204, 0.28)',
    accent: 'rgba(134, 239, 172, 0.98)',
    background: 'linear-gradient(135deg, rgba(20, 54, 34, 0.9), rgba(14, 29, 24, 0.84))'
  },
  error: {
    borderColor: 'rgba(255, 214, 214, 0.3)',
    accent: 'rgba(252, 165, 165, 0.98)',
    background: 'linear-gradient(135deg, rgba(71, 21, 34, 0.92), rgba(30, 15, 24, 0.86))'
  },
  warning: {
    borderColor: 'rgba(255, 233, 181, 0.32)',
    accent: 'rgba(253, 224, 71, 0.98)',
    background: 'linear-gradient(135deg, rgba(78, 47, 14, 0.92), rgba(31, 21, 12, 0.86))'
  },
  info: {
    borderColor: 'rgba(206, 226, 255, 0.28)',
    accent: 'rgba(125, 211, 252, 0.98)',
    background: 'linear-gradient(135deg, rgba(15, 40, 78, 0.92), rgba(11, 22, 39, 0.86))'
  }
} as const;

export function NotificationsDialog() {
  const { notifications, labels, isMobile, language, timezone, dateFormat } = useTopMenuContext();
  const orderedItems = useMemo(() => [...notifications.items].reverse(), [notifications.items]);
  const locale = language === 'bg' ? 'bg-BG' : 'en-US';
  const title = labels.notificationsInbox || labels.notificationsSummary || 'Notifications';
  const emptyLabel = labels.notificationsEmpty || 'No notifications yet.';
  const dismissAllLabel = labels.dismissAllNotifications || 'Dismiss all';
  const dismissLabel = labels.dismissNotification || 'Dismiss notification';
  const closeLabel = labels.close || 'Close';

  return (
    <Dialog
      open={notifications.open}
      onClose={notifications.onClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      PaperProps={{
        className: 'desktopOverlayPaper',
        sx: {
          border: '1px solid var(--panel-border)',
          borderRadius: isMobile ? 0 : '28px',
          boxShadow: '0 28px 70px rgba(0,0,0,0.46)',
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1.5,
          borderBottom: '1px solid var(--panel-border)',
          px: { xs: 2, sm: 2.5 },
          py: 2
        }}
      >
        <Stack direction="row" spacing={1.2} alignItems="center">
          <Typography component="span" variant="h6" sx={{ fontWeight: 900 }}>
            {title}
          </Typography>
          <Box
            component="span"
            sx={{
              minWidth: 28,
              px: 1,
              py: 0.35,
              borderRadius: 999,
              fontSize: '0.78rem',
              fontWeight: 900,
              lineHeight: 1,
              color: 'var(--text-main)',
              background: 'color-mix(in srgb, var(--panel-bg) 72%, var(--accent-color) 28%)',
              border: '1px solid var(--panel-border)'
            }}
          >
            {notifications.items.length}
          </Box>
        </Stack>
        <IconButton aria-label={closeLabel} onClick={notifications.onClose} sx={{ color: 'var(--text-main)' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          borderColor: 'var(--panel-border)',
          px: { xs: 1.5, sm: 2 },
          py: { xs: 1.5, sm: 2 },
          maxHeight: isMobile ? undefined : 'min(68vh, 720px)'
        }}
      >
        {orderedItems.length ? (
          <Stack spacing={1.2}>
            {orderedItems.map(item => {
              const tone = NOTIFICATION_TONES[item.kind];
              return (
                <Box
                  key={item.id}
                  sx={{
                    border: `1px solid ${tone.borderColor}`,
                    background: tone.background,
                    borderRadius: '22px',
                    px: { xs: 1.4, sm: 1.6 },
                    py: { xs: 1.3, sm: 1.45 },
                    boxShadow: '0 16px 34px rgba(0,0,0,0.22)'
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        mt: 0.7,
                        borderRadius: '999px',
                        flex: '0 0 auto',
                        background: tone.accent,
                        boxShadow: `0 0 0 6px color-mix(in srgb, ${tone.accent} 18%, transparent)`
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mb: 0.45,
                          color: 'var(--text-dim)',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase'
                        }}
                      >
                        {formatTopMenuTimestamp(item.createdAt, locale, timezone, dateFormat)}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: 'var(--text-main)',
                          fontWeight: 700,
                          lineHeight: 1.5,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word'
                        }}
                      >
                        {item.message}
                      </Typography>
                    </Box>
                    <IconButton
                      aria-label={dismissLabel}
                      onClick={() => notifications.onDismiss(item.id)}
                      sx={{
                        color: 'var(--text-main)',
                        mt: -0.4,
                        mr: -0.5,
                        background: 'rgba(255,255,255,0.04)'
                      }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Box
            sx={{
              minHeight: isMobile ? '40vh' : 260,
              display: 'grid',
              placeItems: 'center',
              px: 2,
              textAlign: 'center'
            }}
          >
            <Typography variant="body1" sx={{ color: 'var(--text-main)', fontWeight: 800 }}>
              {emptyLabel}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: { xs: 2, sm: 2.5 }, py: 1.6, borderTop: '1px solid var(--panel-border)' }}>
        <Button onClick={notifications.onDismissAll} disabled={!notifications.items.length}>
          {dismissAllLabel}
        </Button>
        <Button variant="outlined" onClick={notifications.onClose}>
          {closeLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
