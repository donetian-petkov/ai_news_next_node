'use client';

import { TopMenuControlsQuickRow } from './TopMenuControlsQuickRow';
import { TopMenuNotificationsSection } from './TopMenuNotificationsSection';
import { TopMenuAiSettingsSection } from './TopMenuAiSettingsSection';
import { TopMenuAppearanceSection } from './TopMenuAppearanceSection';
import { useTopMenuContext } from './context/useTopMenuContext';

export function TopMenuControlsPanel() {
  const { labels } = useTopMenuContext();

  return (
    <div className="controls">
      <TopMenuControlsQuickRow />

      <div className="controlsHint" id="controlsHint">
        {labels.controlsHint}
      </div>

      <div className="controlsGrid">
        <div className="controlsCell controlsCellNotifications">
          <TopMenuNotificationsSection />
        </div>
        <div className="controlsCell controlsCellAi">
          <TopMenuAiSettingsSection />
        </div>
        <div className="controlsCell controlsCellAppearance">
          <TopMenuAppearanceSection />
        </div>
      </div>
    </div>
  );
}
