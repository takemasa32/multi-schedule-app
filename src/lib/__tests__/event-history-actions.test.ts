import { syncEventHistory } from '@/lib/event-history-actions';
import { getAuthSession } from '@/lib/auth';
import { createSupabaseAdmin } from '@/lib/supabase';

jest.mock('@/lib/auth', () => ({
  getAuthSession: jest.fn(),
}));

jest.mock('@/lib/supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}));

const mockedGetAuthSession = getAuthSession as jest.Mock;
const mockedCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock;

const createHistoryQueryChain = (result: { data: unknown; error: unknown }) => ({
  select: jest.fn(() => ({
    eq: jest.fn(() => ({
      order: jest.fn(() => ({
        limit: jest.fn(() => Promise.resolve(result)),
      })),
    })),
  })),
});

describe('syncEventHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('未ログイン時はローカル履歴をそのまま返す', async () => {
    mockedGetAuthSession.mockResolvedValue(null);

    const localHistory = [
      {
        id: 'tok-1',
        title: 'イベント1',
        createdAt: '2026-02-27T00:00:00.000Z',
        isCreatedByMe: false,
      },
    ];

    const result = await syncEventHistory(localHistory);
    expect(result).toEqual(localHistory);
    expect(mockedCreateSupabaseAdmin).not.toHaveBeenCalled();
  });

  it('ログイン時は履歴をbulk RPCで同期する', async () => {
    mockedGetAuthSession.mockResolvedValue({ user: { id: 'user-1' } });
    const rpcMock = jest.fn().mockResolvedValue({ error: null });
    const fromMock = jest.fn().mockReturnValue(createHistoryQueryChain({ data: [], error: null }));
    mockedCreateSupabaseAdmin.mockReturnValue({
      rpc: rpcMock,
      from: fromMock,
    });

    const localHistory = [
      {
        id: 'tok-1',
        title: 'イベント1',
        createdAt: '2026-02-27T00:00:00.000Z',
        isCreatedByMe: true,
      },
      {
        id: 'tok-2',
        title: 'イベント2',
        createdAt: '2026-02-27T01:00:00.000Z',
        isCreatedByMe: false,
      },
    ];

    const result = await syncEventHistory(localHistory);

    expect(rpcMock).toHaveBeenCalledWith('upsert_event_access_histories_bulk', {
      p_user_id: 'user-1',
      p_items: [
        {
          event_public_token: 'tok-1',
          event_title: 'イベント1',
          is_created_by_me: true,
          accessed_at: '2026-02-27T00:00:00.000Z',
        },
        {
          event_public_token: 'tok-2',
          event_title: 'イベント2',
          is_created_by_me: false,
          accessed_at: '2026-02-27T01:00:00.000Z',
        },
      ],
    });
    expect(result).toEqual([]);
  });

  it('同期結果に skipped_count がある場合は警告ログを出す', async () => {
    mockedGetAuthSession.mockResolvedValue({ user: { id: 'user-1' } });
    const rpcMock = jest
      .fn()
      .mockResolvedValue({ data: [{ processed_count: 1, skipped_count: 1 }], error: null });
    const fromMock = jest.fn().mockReturnValue(createHistoryQueryChain({ data: [], error: null }));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockedCreateSupabaseAdmin.mockReturnValue({
      rpc: rpcMock,
      from: fromMock,
    });

    const localHistory = [
      {
        id: 'tok-1',
        title: 'イベント1',
        createdAt: '2026-02-27T00:00:00.000Z',
        isCreatedByMe: true,
      },
    ];

    await syncEventHistory(localHistory);

    expect(warnSpy).toHaveBeenCalledWith('イベント履歴の一括同期でスキップが発生しました:', {
      skippedCount: 1,
    });
    warnSpy.mockRestore();
  });
});
