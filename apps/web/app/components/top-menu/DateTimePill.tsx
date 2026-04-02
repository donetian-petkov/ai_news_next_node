'use client';

import { useEffect, useState } from 'react';
import { Chip } from '@mui/material';
import { formatTopMenuDateTimeText } from './topMenu.services';
import { useTopMenuContext } from './context/useTopMenuContext';

export function DateTimePill() {
  const { language, timezone, dateFormat } = useTopMenuContext();
  const locale = language === 'bg' ? 'bg-BG' : 'en-GB';
  const [dateTimeText, setDateTimeText] = useState('--:--:-- · --/--/--');

  useEffect(() => {
    const updateDateTime = () => {
      setDateTimeText(formatTopMenuDateTimeText(Date.now(), locale, timezone, dateFormat));
    };

    updateDateTime();
    const intervalId = window.setInterval(updateDateTime, 1000);
    return () => window.clearInterval(intervalId);
  }, [dateFormat, locale, timezone]);

  return (
    <Chip
      id="dateTime"
      className="statusPill statusPillDateTime"
      size="medium"
      label={dateTimeText}
      variant="outlined"
    />
  );
}
