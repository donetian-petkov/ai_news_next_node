import { configureStore } from '@reduxjs/toolkit';
import connectionReducer from './slices/connectionSlice';
import feedsReducer from './slices/feedsSlice';
import newsReducer from './slices/newsSlice';
import uiReducer from './slices/uiSlice';
import aiUsageReducer from './slices/aiUsageSlice';
import briefingReducer from './slices/briefingSlice';

export const store = configureStore({
  reducer: {
    connection: connectionReducer,
    feeds: feedsReducer,
    news: newsReducer,
    ui: uiReducer,
    aiUsage: aiUsageReducer,
    briefing: briefingReducer
  }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
