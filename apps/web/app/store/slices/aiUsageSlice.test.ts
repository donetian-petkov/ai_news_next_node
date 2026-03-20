import { describe, expect, it } from 'vitest';
import aiUsageReducer, { setUsage } from './aiUsageSlice';

describe('aiUsageSlice', () => {
  it('returns initial state', () => {
    const state = aiUsageReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({
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
    });
  });

  it('replaces token usage snapshot', () => {
    const state = aiUsageReducer(
      undefined,
      setUsage({
        inputTokens: 111,
        outputTokens: 222,
        totalTokens: 333,
        runtimeStartedAt: 444,
        byKind: {
          summary: { requests: 1, inputTokens: 10, outputTokens: 11, totalTokens: 21 },
          research: { requests: 2, inputTokens: 20, outputTokens: 22, totalTokens: 42 },
          ask: { requests: 3, inputTokens: 30, outputTokens: 33, totalTokens: 63 }
        },
        recent: [
          {
            id: 'usage-1',
            kind: 'summary',
            model: 'gpt-4.1-nano',
            label: 'Summary: demo',
            inputTokens: 10,
            outputTokens: 11,
            totalTokens: 21,
            createdAt: 999
          }
        ]
      })
    );
    expect(state).toEqual({
      inputTokens: 111,
      outputTokens: 222,
      totalTokens: 333,
      runtimeStartedAt: 444,
      byKind: {
        summary: { requests: 1, inputTokens: 10, outputTokens: 11, totalTokens: 21 },
        research: { requests: 2, inputTokens: 20, outputTokens: 22, totalTokens: 42 },
        ask: { requests: 3, inputTokens: 30, outputTokens: 33, totalTokens: 63 }
      },
      recent: [
        {
          id: 'usage-1',
          kind: 'summary',
          model: 'gpt-4.1-nano',
          label: 'Summary: demo',
          inputTokens: 10,
          outputTokens: 11,
          totalTokens: 21,
          createdAt: 999
        }
      ]
    });
  });
});
