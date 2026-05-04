'use client';

import { Alert, Box } from '@mui/material';
import { useTopMenuContext } from './context/useTopMenuContext';

const TOAST_TONES = {
  success: {
    background: 'linear-gradient(135deg, rgba(28, 126, 72, 0.98), rgba(52, 168, 94, 0.95))',
    borderColor: 'rgba(190, 242, 204, 0.28)',
    color: 'rgba(247, 255, 249, 0.98)'
  },
  error: {
    background: 'linear-gradient(135deg, rgba(160, 32, 53, 0.99), rgba(239, 68, 68, 0.96))',
    borderColor: 'rgba(255, 214, 214, 0.3)',
    color: 'rgba(255, 246, 246, 0.99)'
  },
  warning: {
    background: 'linear-gradient(135deg, rgba(156, 92, 18, 0.99), rgba(245, 158, 11, 0.96))',
    borderColor: 'rgba(255, 233, 181, 0.32)',
    color: 'rgba(255, 249, 235, 0.99)'
  },
  info: {
    background: 'linear-gradient(135deg, rgba(25, 78, 168, 0.99), rgba(56, 137, 255, 0.95))',
    borderColor: 'rgba(206, 226, 255, 0.28)',
    color: 'rgba(244, 249, 255, 0.99)'
  }
} as const;

export function ToastStack() {
  const { toast } = useTopMenuContext();
  const { toasts, onDismiss } = toast;
  if (!toasts.length) return null;
  const orderedToasts = [...toasts].reverse();

  return (
    <Box
      sx={{
        position: 'fixed',
        right: { xs: 12, sm: 16 },
        bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        zIndex: 2200,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        width: { xs: 'calc(100vw - 24px)', sm: 440 },
        maxHeight: { xs: 'calc(100dvh - 24px)', sm: 'min(70vh, 560px)' },
        overflowY: 'auto',
        pr: 0.25
      }}
    >
      {orderedToasts.map(t => {
        const tone = TOAST_TONES[t.kind];
        return (
          <Alert
            key={t.id}
            severity={t.kind}
            onClose={() => onDismiss(t.id)}
            variant="filled"
            sx={{
              color: tone.color,
              background: tone.background,
              border: `1px solid ${tone.borderColor}`,
              backdropFilter: 'blur(18px)',
              boxShadow: '0 14px 34px rgba(0,0,0,0.34)',
              borderRadius: '22px',
              alignItems: 'center',
              '& .MuiAlert-message': {
                color: 'inherit',
                fontSize: { xs: '1.04rem', sm: '1rem' },
                fontWeight: 700,
                lineHeight: 1.35,
                py: 0.25
              },
              '& .MuiAlert-icon': {
                color: 'inherit',
                opacity: 0.98,
                fontSize: 32,
                alignItems: 'center'
              },
              '& .MuiAlert-action': {
                alignItems: 'center',
                pt: 0.25,
                pr: 0.1
              },
              '& .MuiIconButton-root': {
                color: 'inherit',
                opacity: 0.92
              },
              '& .MuiIconButton-root:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                opacity: 1
              }
            }}
            >
              <Box
                component="span"
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0
                }}
              >
                <Box component="span" sx={{ minWidth: 0 }}>
                  {t.message}
                </Box>
                {(t.count ?? 1) > 1 ? (
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      px: 1,
                      py: 0.25,
                      borderRadius: 999,
                      border: '1px solid rgba(255,255,255,0.42)',
                      backgroundColor: 'rgba(255,255,255,0.12)',
                      color: 'inherit',
                      fontSize: '0.8rem',
                      fontWeight: 800,
                      letterSpacing: '0.02em',
                      lineHeight: 1
                    }}
                  >
                    x{t.count}
                  </Box>
                ) : null}
              </Box>
          </Alert>
        );
      })}
    </Box>
  );
}
