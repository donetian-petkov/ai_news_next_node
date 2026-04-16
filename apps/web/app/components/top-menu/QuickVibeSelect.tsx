'use client';

import { TopMenuSelectField } from './TopMenuSelectField';
import { useTopMenuContext } from './context/useTopMenuContext';

type VibeValue = 'default' | 'anime' | 'arcade' | 'cinema' | 'newspaper' | 'cyberwitch' | 'fantasy' | 'scifi';

type QuickVibeSelectProps = {
  value?: VibeValue;
  labels?: Record<string, string>;
  fullWidth?: boolean;
  onChange?: (value: VibeValue) => void;
};

export function QuickVibeSelect({ value, labels, fullWidth = false, onChange }: QuickVibeSelectProps) {
  const topMenu = useTopMenuContext();
  const resolvedValue = value ?? topMenu.vibe;
  const resolvedLabels = labels ?? topMenu.labels;
  const resolvedOnChange = onChange ?? topMenu.onChangeVibe;
  const wrapperClassName = ['topQuickLabel', fullWidth ? 'topQuickLabelFull' : ''].filter(Boolean).join(' ');
  const options: Array<{ value: VibeValue; label: string; iconSrc: string }> = [
    { value: 'default', label: resolvedLabels.defaultVibe, iconSrc: '/ornaments/default/glyph.svg' },
    { value: 'anime', label: resolvedLabels.anime, iconSrc: '/ornaments/anime/glyph.svg' },
    { value: 'arcade', label: resolvedLabels.arcade, iconSrc: '/ornaments/arcade/glyph.svg' },
    { value: 'cinema', label: resolvedLabels.cinema, iconSrc: '/ornaments/cinema/glyph.svg' },
    { value: 'newspaper', label: resolvedLabels.newspaper, iconSrc: '/ornaments/newspaper/glyph.svg' },
    { value: 'cyberwitch', label: resolvedLabels.cyberwitch, iconSrc: '/ornaments/cyberwitch/glyph.svg' },
    { value: 'fantasy', label: resolvedLabels.fantasy, iconSrc: '/ornaments/fantasy/glyph.svg' },
    { value: 'scifi', label: resolvedLabels.scifi, iconSrc: '/ornaments/scifi/glyph.svg' }
  ];

  return (
    <TopMenuSelectField
        id="quickVibeSelect"
        label={resolvedLabels.vibe}
        title={resolvedLabels.vibe}
        value={resolvedValue}
        onChange={resolvedOnChange}
        options={options}
        wrapperClassName={wrapperClassName}
      />
  );
}
