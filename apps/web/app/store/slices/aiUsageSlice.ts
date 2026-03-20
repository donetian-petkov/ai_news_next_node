import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type AiUsageKind = 'summary' | 'research' | 'ask';
type AiUsageKindStats = {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};
type AiUsageEntry = {
  id: string;
  kind: AiUsageKind;
  model: string;
  label: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  createdAt: number;
};

type AiUsageState = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  runtimeStartedAt: number;
  byKind: Record<AiUsageKind, AiUsageKindStats>;
  recent: AiUsageEntry[];
};

const initialState: AiUsageState = {
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  runtimeStartedAt: 0,
  byKind: {
    summary: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    research: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    ask: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  },
  recent: []
};

const aiUsageSlice = createSlice({
  name: 'aiUsage',
  initialState,
  reducers: {
    setUsage(state, action: PayloadAction<AiUsageState>) {
      state.inputTokens = action.payload.inputTokens;
      state.outputTokens = action.payload.outputTokens;
      state.totalTokens = action.payload.totalTokens;
      state.runtimeStartedAt = action.payload.runtimeStartedAt;
      state.byKind = action.payload.byKind;
      state.recent = action.payload.recent;
    }
  }
});

export const { setUsage } = aiUsageSlice.actions;
export default aiUsageSlice.reducer;
