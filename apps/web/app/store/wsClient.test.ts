import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type AnyAction = { type: string; payload?: unknown };

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  public readyState = MockWebSocket.CONNECTING;
  public url: string;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent<string>) => void) | null = null;

  public sent: string[] = [];

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.({} as CloseEvent);
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.({} as Event);
  }

  emitError() {
    this.onerror?.({} as Event);
  }

  emitMessage(payload: unknown) {
    this.onmessage?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }
}

describe('wsClient', () => {
  beforeEach(() => {
    vi.resetModules();
    MockWebSocket.instances = [];
    (globalThis as { WebSocket?: unknown }).WebSocket = MockWebSocket as unknown as typeof WebSocket;
  });

  afterEach(async () => {
    const mod = await import('./wsClient');
    mod.stopWsConnection();
  });

  it('dispatches connection status lifecycle', async () => {
    const mod = await import('./wsClient');
    const actions: AnyAction[] = [];
    const dispatch = (action: AnyAction) => {
      actions.push(action);
      return action;
    };

    mod.startWsConnection(dispatch as never, 'ws://unit-test');
    expect(actions.at(-1)).toMatchObject({ type: 'connection/setStatus', payload: 'connecting' });

    const sock = MockWebSocket.instances[0];
    expect(sock.url).toBe('ws://unit-test');

    sock.emitOpen();
    expect(actions.at(-1)).toMatchObject({ type: 'connection/setStatus', payload: 'connected' });

    sock.emitError();
    expect(actions.at(-1)).toMatchObject({ type: 'connection/setStatus', payload: 'error' });

    sock.close();
    expect(actions.at(-1)).toMatchObject({ type: 'connection/setStatus', payload: 'disconnected' });
  });

  it('maps config and ai usage messages into feed/news state actions', async () => {
    const mod = await import('./wsClient');
    const actions: AnyAction[] = [];
    const dispatch = (action: AnyAction) => {
      actions.push(action);
      return action;
    };

    mod.startWsConnection(dispatch as never, 'ws://unit-test');
    const sock = MockWebSocket.instances[0];
    sock.emitOpen();

    sock.emitMessage({
      type: 'config',
      keywords: ['war', 'energy'],
      aiAvailable: true,
      aiEnabled: true,
      aiProvider: 'claude',
      summaryLang: 'bg',
      researchLang: 'en',
      summaryModel: 'claude-3-5-haiku-latest',
      researchModel: 'claude-3-7-sonnet-latest',
      askModel: 'claude-3-5-haiku-latest',
      availableModels: {
        openai: {
          summary: ['gpt-4.1-nano'],
          research: ['gpt-4.1-mini'],
          ask: ['gpt-4.1-nano']
        },
        claude: {
          summary: ['claude-3-5-haiku-latest'],
          research: ['claude-3-7-sonnet-latest'],
          ask: ['claude-3-5-haiku-latest']
        },
        openrouter: {
          summary: ['openai/gpt-4.1-mini'],
          research: ['openai/gpt-4.1'],
          ask: ['openai/gpt-4.1-mini']
        }
      },
      feeds: [
        { url: 'https://a', label: 'A', kind: 'rss', intervalSec: 45 },
        { url: '__filtered__', label: 'Filtered', kind: 'rss', intervalSec: 45 }
      ],
      feedSettings: {
        'https://a': {
          summaryEnabled: true,
          translationEnabled: false,
          researchEnabled: true,
          budget: 'high',
          sortMode: 'matched',
          filters: {
            onlyMatches: true,
            onlyResearched: true,
            onlySummaries: false
          }
        }
      },
      hiddenIds: ['hid-1'],
      aiUsageInputTokens: 10,
      aiUsageOutputTokens: 20,
      aiUsageTotalTokens: 30,
      aiUsageRuntimeStartedAt: 1234,
      aiUsageByKind: {
        summary: { requests: 1, inputTokens: 3, outputTokens: 4, totalTokens: 7 },
        research: { requests: 2, inputTokens: 5, outputTokens: 6, totalTokens: 11 },
        ask: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
      },
      aiUsageRecent: [
        {
          id: 'usage-1',
          kind: 'summary',
          model: 'claude-3-5-haiku-latest',
          label: 'Summary: A',
          inputTokens: 3,
          outputTokens: 4,
          totalTokens: 7,
          createdAt: 555
        }
      ]
    });

    const setFeedsAction = actions.find(a => a.type === 'feeds/setFeeds');
    expect(setFeedsAction).toBeTruthy();
    expect(setFeedsAction?.payload).toEqual([
      {
        url: 'https://a',
        label: 'A',
        kind: 'rss',
        intervalSec: 45,
        summaryEnabled: true,
        translationEnabled: false,
        researchEnabled: true,
        budget: 'high',
        sortMode: 'matched',
        filters: {
          onlyMatches: true,
          onlyResearched: true,
          onlySummaries: false
        }
      }
    ]);

    expect(actions.find(a => a.type === 'news/setHiddenIds')?.payload).toEqual(['hid-1']);
    expect(actions.find(a => a.type === 'ui/setKeywords')?.payload).toEqual(['war', 'energy']);
    expect(actions.find(a => a.type === 'ui/setAiSettings')?.payload).toMatchObject({
      aiAvailable: true,
      aiEnabled: true,
      aiProvider: 'claude',
      summaryLang: 'bg',
      researchLang: 'en',
      summaryModel: 'claude-3-5-haiku-latest',
      researchModel: 'claude-3-7-sonnet-latest',
      askModel: 'claude-3-5-haiku-latest',
      availableModels: {
        claude: {
          summary: ['claude-3-5-haiku-latest']
        }
      }
    });
    expect(actions.find(a => a.type === 'aiUsage/setUsage')?.payload).toEqual({
      inputTokens: 10,
      outputTokens: 20,
      totalTokens: 30,
      runtimeStartedAt: 1234,
      byKind: {
        summary: { requests: 1, inputTokens: 3, outputTokens: 4, totalTokens: 7 },
        research: { requests: 2, inputTokens: 5, outputTokens: 6, totalTokens: 11 },
        ask: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
      },
      recent: [
        {
          id: 'usage-1',
          kind: 'summary',
          model: 'claude-3-5-haiku-latest',
          label: 'Summary: A',
          inputTokens: 3,
          outputTokens: 4,
          totalTokens: 7,
          createdAt: 555
        }
      ]
    });

    sock.emitMessage({
      type: 'ai_usage',
      inputTokens: 1,
      outputTokens: 2,
      totalTokens: 3,
      runtimeStartedAt: 999,
      byKind: {
        summary: { requests: 1, inputTokens: 1, outputTokens: 2, totalTokens: 3 },
        research: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        ask: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
      },
      recent: []
    });
    expect(actions.at(-1)).toMatchObject({
      type: 'aiUsage/setUsage',
      payload: {
        inputTokens: 1,
        outputTokens: 2,
        totalTokens: 3,
        runtimeStartedAt: 999,
        byKind: {
          summary: { requests: 1, inputTokens: 1, outputTokens: 2, totalTokens: 3 },
          research: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 },
          ask: { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }
        },
        recent: []
      }
    });
  });

  it('dispatches ask replies and blocks hidden news upserts', async () => {
    const mod = await import('./wsClient');
    const actions: AnyAction[] = [];
    const dispatch = (action: AnyAction) => {
      actions.push(action);
      return action;
    };

    mod.startWsConnection(dispatch as never, 'ws://unit-test');
    const sock = MockWebSocket.instances[0];
    sock.emitOpen();

    sock.emitMessage({ type: 'config', feeds: [], hiddenIds: ['n-1'] });

    sock.emitMessage({
      type: 'ask_agent_reply',
      id: 'n-2',
      feedUrl: 'https://a',
      question: 'Q?',
      answer: 'A',
      used: 2,
      remaining: 3
    });
    expect(actions.at(-1)).toMatchObject({
      type: 'news/receiveAskReply',
      payload: {
        id: 'n-2',
        feedUrl: 'https://a',
        question: 'Q?',
        answer: 'A',
        used: 2,
        remaining: 3
      }
    });

    const before = actions.length;
    sock.emitMessage({
      type: 'news',
      id: 'n-1',
      title: 'Hidden title',
      feedUrl: 'https://a',
      publishedMs: 1,
      isMatch: false
    });
    expect(actions).toHaveLength(before);

    sock.emitMessage({
      type: 'news',
      id: 'n-2',
      title: 'Visible title',
      feedUrl: 'https://a',
      publishedMs: 2,
      isMatch: true,
      mood: 'uncertainty',
      newsType: 'science'
    });
    await new Promise(resolve => setTimeout(resolve, 70));
    const batchAction = actions.find(a => a.type === 'news/upsertNewsBatch');
    expect(batchAction).toBeTruthy();
    expect(Array.isArray(batchAction?.payload)).toBe(true);
    expect((batchAction?.payload as Array<{ id: string; title: string; feedUrl: string }>)[0]).toMatchObject({
      id: 'n-2',
      title: 'Visible title',
      feedUrl: 'https://a',
      mood: 'uncertainty',
      newsType: 'science'
    });
  });

  it('maps feed errors into stackable toast actions', async () => {
    const mod = await import('./wsClient');
    const actions: AnyAction[] = [];
    const dispatch = (action: AnyAction) => {
      actions.push(action);
      return action;
    };

    mod.startWsConnection(dispatch as never, 'ws://unit-test');
    const sock = MockWebSocket.instances[0];
    sock.emitOpen();

    sock.emitMessage({
      type: 'feed_error',
      feedLabel: 'A feed',
      error: 'HTTP 429'
    });

    expect(actions.at(-1)).toMatchObject({
      type: 'ui/enqueueToast',
      payload: {
        kind: 'error',
        message: 'A feed: HTTP 429'
      }
    });
  });

  it('notifies ack subscribers for ok and error messages', async () => {
    const mod = await import('./wsClient');
    const events: Array<{ kind: 'ok' | 'error'; message: string }> = [];
    const unsubscribe = mod.subscribeWsAcks(event => {
      events.push(event);
    });
    const dispatch = vi.fn();

    mod.startWsConnection(dispatch as never, 'ws://unit-test');
    const sock = MockWebSocket.instances[0];
    sock.emitOpen();

    sock.emitMessage({ type: 'ok', message: 'Added feed: r/movies' });
    sock.emitMessage({ type: 'error', message: 'Invalid URL' });

    expect(events).toEqual([
      { kind: 'ok', message: 'Added feed: r/movies' },
      { kind: 'error', message: 'Invalid URL' }
    ]);

    unsubscribe();
  });

  it('sendWsMessage succeeds only when socket is open', async () => {
    const mod = await import('./wsClient');
    const dispatch = vi.fn();

    mod.startWsConnection(dispatch as never, 'ws://unit-test');
    const sock = MockWebSocket.instances[0];

    expect(mod.sendWsMessage({ type: 'x' })).toBe(false);

    sock.emitOpen();
    expect(mod.sendWsMessage({ type: 'y', hello: 'world' })).toBe(true);
    expect(sock.sent).toHaveLength(1);
    expect(JSON.parse(sock.sent[0])).toEqual({ type: 'y', hello: 'world' });
  });
});
