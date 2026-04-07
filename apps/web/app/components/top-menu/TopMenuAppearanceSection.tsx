'use client';

import { Alert } from '@mui/material';
import { TopMenuSelectField } from './TopMenuSelectField';
import {
  buildButtonModeOptions,
  buildColorModeOptions,
  buildDateFormatOptions,
  buildEffectIntensityOptions,
  buildFontOptions,
  buildFontSizeOptions,
  buildLanguageOptions,
  buildMenuHintOptions,
  buildSchemeOptions,
  buildSoundThemeOptions,
  buildToggleOptions,
  buildTimezoneOptions,
  buildVibeOptions
} from './topMenuOptionBuilders';
import { useTopMenuContext } from './context/useTopMenuContext';

export function TopMenuAppearanceSection() {
  const {
    labels,
    controls: {
      model: { appearance },
      actions
    }
  } = useTopMenuContext();

  return (
    <details className="controlSection controlSectionAppearance" open>
      <summary id="appearanceSummary">{labels.appearanceSummary}</summary>
      <div className="controlGroup controlGroupAppearance topMenuFieldGrid" id="appearanceGroup">
        <TopMenuSelectField
          id="fontSelect"
          title="Change UI font"
          label={labels.fontPrefix}
          value={appearance.font}
          onChange={next => actions.onSetAppearance({ font: next })}
          options={buildFontOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="fontSizeSelect"
          title="Scale text size"
          label={labels.fontSizePrefix}
          value={appearance.fontSize}
          onChange={next => actions.onSetAppearance({ fontSize: next })}
          options={buildFontSizeOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="schemeSelect"
          title="Column accent scheme"
          label={labels.schemePrefix}
          value={appearance.scheme}
          onChange={next => actions.onSetAppearance({ scheme: next })}
          options={buildSchemeOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="btnModeSelect"
          title="Item buttons look"
          label={labels.buttonsPrefix}
          value={appearance.buttonMode}
          onChange={next => actions.onSetAppearance({ buttonMode: next })}
          options={buildButtonModeOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="timezoneSelect"
          title="Date/time timezone"
          label={labels.timezonePrefix}
          value={appearance.timezone}
          onChange={next => actions.onSetAppearance({ timezone: next })}
          options={buildTimezoneOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="dateFormatSelect"
          title="Date format"
          label={labels.dateFormatPrefix}
          value={appearance.dateFormat}
          onChange={next => actions.onSetAppearance({ dateFormat: next })}
          options={buildDateFormatOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="newsCoversSelect"
          title="Story cover images"
          label={labels.newsCoversPrefix || 'News covers:'}
          value={appearance.showNewsCovers ? 'on' : 'off'}
          onChange={next => actions.onSetAppearance({ showNewsCovers: next === 'on' })}
          options={buildToggleOptions(labels.newsCoversOn || 'ON', labels.newsCoversOff || 'OFF')}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="menuHintsSelect"
          title="Top menu hint style"
          label={labels.menuHints}
          value={appearance.menuHintMode}
          onChange={next => actions.onSetAppearance({ menuHintMode: next })}
          options={buildMenuHintOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="effectIntensitySelect"
          title="Visual ornament intensity"
          label={labels.effectIntensity}
          value={appearance.effectIntensity}
          disabled={appearance.performanceMode}
          onChange={next => actions.onSetAppearance({ effectIntensity: next })}
          options={buildEffectIntensityOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="soundThemeSelect"
          title="Audio vibe profile"
          label={labels.soundTheme}
          value={appearance.soundTheme}
          disabled={appearance.performanceMode}
          onChange={next => actions.onSetAppearance({ soundTheme: next })}
          options={buildSoundThemeOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="soundEnabledSelect"
          title="Sound playback toggle"
          label={labels.sound}
          value={appearance.soundEnabled ? 'on' : 'off'}
          disabled={appearance.performanceMode}
          onChange={next => actions.onSetAppearance({ soundEnabled: next === 'on' })}
          options={buildToggleOptions(labels.soundOn, labels.soundOff)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="vibeSelect"
          title="Visual vibe preset"
          label={labels.vibePrefix}
          value={appearance.vibe}
          onChange={next => actions.onSetAppearance({ vibe: next })}
          options={buildVibeOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="interfaceLang"
          title="Interface language"
          label={labels.interfacePrefix}
          value={appearance.language}
          onChange={actions.onSetLanguage}
          options={buildLanguageOptions()}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="colorModeSelect"
          title="Theme source"
          label={labels.colorMode}
          value={appearance.colorMode}
          onChange={next => actions.onSetAppearance({ colorMode: next })}
          options={buildColorModeOptions(labels)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        <TopMenuSelectField
          id="performanceModeSelect"
          title="Performance mode"
          label={labels.perfMode}
          value={appearance.performanceMode ? 'on' : 'off'}
          onChange={next => actions.onSetAppearance({ performanceMode: next === 'on' })}
          options={buildToggleOptions(labels.perfOn, labels.perfOff)}
          layout="stacked"
          wrapperClassName="topMenuField"
        />

        {appearance.performanceMode ? (
          <Alert severity="info" sx={{ py: 0 }} className="topMenuFieldGridFull">
            {labels.perfFxSoundHidden}
          </Alert>
        ) : null}
      </div>
    </details>
  );
}
