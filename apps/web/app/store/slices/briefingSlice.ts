import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { BriefingFormat, DailyBriefingResult } from '../types';

type BriefingState = {
  loading: boolean;
  error: string;
  latest: DailyBriefingResult | null;
};

const initialState: BriefingState = {
  loading: false,
  error: '',
  latest: null
};

function normalizeFormat(value: BriefingFormat | string | undefined): BriefingFormat {
  return value === 'bullets' || value === 'narrative' ? value : 'executive';
}

const briefingSlice = createSlice({
  name: 'briefing',
  initialState,
  reducers: {
    requestBriefing(state) {
      state.loading = true;
      state.error = '';
    },
    receiveBriefing(state, action: PayloadAction<DailyBriefingResult>) {
      state.loading = false;
      state.error = '';
      state.latest = {
        ...action.payload,
        title: String(action.payload.title || '').trim(),
        body: String(action.payload.body || '').trim(),
        audioScript: String(action.payload.audioScript || '').trim(),
        generatedAtMs: Number.isFinite(action.payload.generatedAtMs) ? action.payload.generatedAtMs : Date.now(),
        itemCount: Math.max(0, Math.floor(action.payload.itemCount || 0)),
        delivery: action.payload.delivery === 'email' ? 'email' : 'site',
        email: String(action.payload.email || '').trim() || undefined,
        format: normalizeFormat(action.payload.format),
        feedUrls: Array.isArray(action.payload.feedUrls)
          ? action.payload.feedUrls.map(v => String(v || '').trim()).filter(Boolean)
          : []
      };
    },
    failBriefing(state, action: PayloadAction<string>) {
      state.loading = false;
      state.error = String(action.payload || '').trim() || 'Failed to generate briefing.';
    },
    clearBriefing(state) {
      state.loading = false;
      state.error = '';
      state.latest = null;
    }
  }
});

export const { requestBriefing, receiveBriefing, failBriefing, clearBriefing } = briefingSlice.actions;
export default briefingSlice.reducer;
