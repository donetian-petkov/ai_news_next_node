'use client';

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { UiButton } from '../design-system/UiButton';
import { UiSelect } from '../design-system/UiSelect';
import { useTopMenuContext } from './context/useTopMenuContext';

export function TopMenuControlsQuickRow() {
  const {
    labels,
    controls: {
      model: { deleteAgeAll, quickRow },
      actions
    }
  } = useTopMenuContext();
  const presetStoryCounts = useMemo(() => [5, 10, 15, 20], []);
  const storiesPerColumn = quickRow.storiesPerColumn;
  const [customStoriesDraft, setCustomStoriesDraft] = useState(String(storiesPerColumn));

  const onDeleteAgeChange = (e: ChangeEvent<HTMLSelectElement>) => actions.onDeleteAgeAllChange(e.target.value as typeof deleteAgeAll);
  const selectedStoryPreset = presetStoryCounts.includes(storiesPerColumn) ? String(storiesPerColumn) : 'custom';
  const parsedCustomStories = Math.floor(Number(customStoriesDraft));
  const customStoriesValid = Number.isFinite(parsedCustomStories) && parsedCustomStories >= 1;

  useEffect(() => {
    setCustomStoriesDraft(String(storiesPerColumn));
  }, [storiesPerColumn]);

  return (
    <div className="controlsCompactRow controlsRow">
      <div className="controlGroup">
        <UiButton id="resetBtn" onClick={actions.onResetAllNewest}>{labels.resetAllToNewestTen}</UiButton>
        <UiButton id="showMoreNewsAllBtn" onClick={actions.onShowMoreNewsAll}>
          {labels.showMoreNewsAll}
        </UiButton>
        <UiButton id="resetNewsShownAllBtn" onClick={actions.onResetNewsShownAll}>
          {labels.resetNewsShownAll}
        </UiButton>
        <UiSelect
          id="storiesPerColumnSelect"
          label={labels.storiesPerColumnPrefix}
          labelId="storiesPerColumnPrefix"
          title="Set the maximum stories shown per column"
          value={selectedStoryPreset}
          onChange={e => {
            const value = e.target.value;
            if (value === 'custom') return;
            actions.onSetStoriesPerColumn(Number(value) || storiesPerColumn);
          }}
        >
          {presetStoryCounts.map(count => (
            <option key={count} value={String(count)}>{count}</option>
          ))}
          <option value="custom">{labels.storiesCustom}</option>
        </UiSelect>
        <label className="checkbox" title="Set a custom stories-per-column limit">
          <span>{labels.storiesCustom}</span>
          <input
            id="storiesPerColumnCustom"
            className="input"
            type="number"
            min="1"
            step="1"
            value={customStoriesDraft}
            placeholder={labels.storiesCustomPlaceholder}
            onChange={e => setCustomStoriesDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter' || !customStoriesValid) return;
              actions.onSetStoriesPerColumn(parsedCustomStories);
            }}
          />
        </label>
        <UiButton
          id="storiesPerColumnApplyBtn"
          onClick={() => {
            if (!customStoriesValid) return;
            actions.onSetStoriesPerColumn(parsedCustomStories);
          }}
          disabled={!customStoriesValid || parsedCustomStories === storiesPerColumn}
        >
          {labels.applyStoriesLimit}
        </UiButton>
        <UiSelect
          id="deleteAgeSelect"
          label={labels.deleteAgePrefix}
          labelId="deleteAgePrefix"
          title="Delete old news by age from all columns"
          value={deleteAgeAll}
          onChange={onDeleteAgeChange}
        >
          <option value="yesterday">{labels.ageYesterday}</option>
          <option value="week">{labels.agePastWeek}</option>
          <option value="month">{labels.agePastMonth}</option>
          <option value="year">{labels.agePastYear}</option>
        </UiSelect>
        <UiButton id="deleteAgeAllBtn" variant="danger" onClick={actions.onDeleteOldAllColumns}>{labels.deleteOldAllColumns}</UiButton>
        <label className="checkbox" title="Embeddings matching, AI dedupe, summaries, research">
          {quickRow.aiAvailable ? (
            <>
              <input
                id="aiEnabled"
                type="checkbox"
                checked={quickRow.aiEnabled}
                disabled={!quickRow.aiAvailable}
                onChange={e => actions.onToggleAiEnabled(e.target.checked)}
              />
              <span id="aiEnabledLabel">{labels.aiEnabledLabel}</span>
            </>
          ) : (
            <span id="aiUnavailableLabel">{labels.aiUnavailable}</span>
          )}
        </label>
        <UiButton id="helpBtn" onClick={actions.onOpenHelp}>{labels.helpTitle}</UiButton>
      </div>
    </div>
  );
}
