'use client';

import { useTopMenuContext } from './context/useTopMenuContext';

export function TopMenuNotificationsSection() {
  const {
    labels,
    controls: {
      model: { notifications },
      actions
    }
  } = useTopMenuContext();

  return (
    <details className="controlSection controlSectionNotifications" open>
      <summary id="notificationsSummary">{labels.notificationsSummary}</summary>
      <div className="controlGroup controlGroupNotifications">
        <label className="checkbox">
          <input
            id="notifyEnabled"
            type="checkbox"
            checked={notifications.notifyEnabled}
            onChange={e => actions.onNotifyEnabledChange(e.target.checked)}
          />
          <span id="notifyEnabledLabel">{labels.notifyEnabledLabel}</span>
        </label>
        <label className="checkbox">
          <span id="notifyPrefix">{labels.notifyPrefix}</span>
          <select
            id="notifyMode"
            className="select"
            value={notifications.notifyMode}
            onChange={e => actions.onNotifyModeChange(e.target.value as typeof notifications.notifyMode)}
          >
            <option value="matched">{labels.notifyOnlyMatched}</option>
            <option value="matched_pinned">{labels.notifyMatchedPinned}</option>
            <option value="pinned">{labels.notifyOnlyPinned}</option>
            <option value="all">{labels.notifyAllColumns}</option>
          </select>
        </label>
      </div>
    </details>
  );
}
