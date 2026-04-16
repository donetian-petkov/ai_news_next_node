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

  return (
    <TopMenuSelectField
      id="quickVibeSelect"
      label={resolvedLabels.vibe}
      title={resolvedLabels.vibe}
      value={resolvedValue}
      onChange={resolvedOnChange}
      options={[
        { value: 'default', label: resolvedLabels.defaultVibe },
        { value: 'anime', label: resolvedLabels.anime },
        { value: 'arcade', label: resolvedLabels.arcade },
        { value: 'cinema', label: resolvedLabels.cinema },
        { value: 'newspaper', label: resolvedLabels.newspaper },
        { value: 'cyberwitch', label: resolvedLabels.cyberwitch },
        { value: 'fantasy', label: resolvedLabels.fantasy },
        { value: 'scifi', label: resolvedLabels.scifi }
      ]}
      wrapperClassName={wrapperClassName}
    />
  );
}
