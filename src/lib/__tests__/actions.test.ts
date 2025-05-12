// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function() {
    this.submit();
  };
}
import { createEvent, submitAvailability, finalizeEvent } from '../../app/actions';
import { createSupabaseAdmin, createSupabaseClient } from '../supabase';

jest.mock('../supabase');
const mockedCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock;
const mockedCreateSupabaseClient = createSupabaseClient as jest.Mock;

jest.mock("@/lib/supabase", () => ({
  createSupabaseClient: jest.fn(() => ({ from: jest.fn() })),
  createSupabaseAdmin: jest.fn(() => ({ from: jest.fn() })),
}));

// 汎用的なSupabaseチェーンモック
function createSupabaseChainMock(result: Record<string, unknown> = { data: [], error: null }) {
  // チェーン用の型を定義
  type SupabaseChain = {
    insert: (data?: Record<string, unknown>) => SupabaseChain;
    select: (columns?: string) => SupabaseChain;
    eq: (column: string, value: unknown) => SupabaseChain;
    in: (column: string, values: unknown[]) => SupabaseChain;
    single: () => Promise<Record<string, unknown>>;
    maybeSingle: () => Promise<Record<string, unknown>>;
    order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) => SupabaseChain;
    delete: () => SupabaseChain;
    update: (data: Record<string, unknown>) => SupabaseChain;
    range: (from: number, to: number) => SupabaseChain;
    then: (resolve: (v: unknown) => unknown) => Promise<unknown>;
    catch: (reject: (err: unknown) => unknown) => SupabaseChain;
  };

  const chain: SupabaseChain = {
    insert: jest.fn((): SupabaseChain => chain),
    select: jest.fn((): SupabaseChain => chain),
    eq: jest.fn((): SupabaseChain => chain),
    in: jest.fn((): SupabaseChain => chain),
    single: jest.fn(() => Promise.resolve(result)),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    order: jest.fn((): SupabaseChain => chain),
    delete: jest.fn((): SupabaseChain => chain),
    update: jest.fn((): SupabaseChain => chain),
    range: jest.fn((): SupabaseChain => chain),
    then: jest.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)),
    catch: jest.fn((): SupabaseChain => chain),
  };
  return chain;
}

describe('createEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock({
        data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token' }],
        error: null,
      }),
    }));
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock(),
    }));
  });

  it('正常な入力でイベントが作成される', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    formData.append('startDates', '2025-05-10');
    formData.append('startTimes', '10:00');
    formData.append('endDates', '2025-05-10');
    formData.append('endTimes', '11:00');
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({
            data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token' }],
            error: null,
          })),
        })),
      }),
    }));
    const uuidRegex = /^[0-9a-fA-F-]{36}$/;
    const result = await createEvent(formData);
    expect(result.success).toBe(true);
    expect(result.publicToken).toMatch(uuidRegex);
    expect(result.adminToken).toMatch(uuidRegex);
    expect(result.redirectUrl).toContain(`/event/${result.publicToken}?admin=${result.adminToken}`);
  });

  it('タイトル未入力時はバリデーションエラー', async () => {
    const formData = new FormData();
    formData.append('startDates', '2025-05-10');
    formData.append('startTimes', '10:00');
    formData.append('endDates', '2025-05-10');
    formData.append('endTimes', '11:00');
    const result = await createEvent(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/タイトル/);
  });

  it('候補日程未入力時はバリデーションエラー', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    const result = await createEvent(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/候補日程/);
  });

  it('候補日程の形式不正時はエラー', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    formData.append('startDates', '2025-05-10');
    // 時刻が足りない
    const result = await createEvent(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/候補日程/);
  });

  it('DBエラー時はエラーメッセージが返る', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    formData.append('startTimes', '2025-05-10T10:00:00.000Z');
    formData.append('endTimes', '2025-05-10T11:00:00.000Z');
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (_table: string) => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: null, error: { message: 'DBエラー' } }))
          }))
        })),
      }),
    }));
    const result = await createEvent(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/DBエラー/);
  });
});

describe('submitAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock({
        data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
        error: null,
      }),
    }));
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock(),
    }));
  });

  it('正常な入力で回答が保存される', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => Promise.resolve({
              data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
              error: null,
            })),
          };
        }
        if (table === 'participants') {
          return {
            select: jest.fn(() => Promise.resolve({ data: [], error: null })),
            insert: jest.fn(() => ({ select: jest.fn(() => Promise.resolve({ data: [{ id: 'partid', name: 'テスト太郎' }], error: null })) })),
            delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }
        if (table === 'availabilities') {
          return {
            insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }
        return {};
      },
    }));
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtok');
    formData.set('participant_name', 'テスト太郎');
    formData.append('availability_date1', 'on');
    formData.append('availability_date2', '');
    const result = await submitAvailability(formData);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/回答/);
  });

  it('必須項目未入力時はエラー', async () => {
    const formData = new FormData();
    const result = await submitAvailability(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/必須項目/);
  });

  it('イベントが存在しない場合はエラー', async () => {
    // すべてのテーブルでチェーンモックを返す
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (_table: string) => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }),
    }));
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtok');
    formData.set('participant_name', 'テスト太郎');
    formData.append('availability_date1', 'on');
    const result = await submitAvailability(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/イベント/);
  });

  it('回答が1件もない場合はエラー', async () => {
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtok');
    formData.set('participant_name', 'テスト太郎');
    // availability系の入力なし
    const result = await submitAvailability(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/少なくとも/);
  });

  it('既存参加者の上書き保存ができる', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => Promise.resolve({
              data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
              error: null,
            })),
          };
        }
        if (table === 'participants') {
          return {
            select: jest.fn(() => Promise.resolve({ data: [{ id: 'partid', name: 'テスト太郎' }], error: null })),
            delete: jest.fn(() => Promise.resolve({ data: [], error: null })),
            insert: jest.fn(() => ({ select: jest.fn(() => Promise.resolve({ data: [{ id: 'partid', name: 'テスト太郎' }], error: null })) })),
          };
        }
        if (table === 'availabilities') {
          return {
            insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }
        return {};
      },
    }));
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtok');
    formData.set('participant_name', 'テスト太郎');
    formData.append('availability_date1', 'on');
    const result = await submitAvailability(formData);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/回答/);
  });
});

describe('finalizeEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock({
        data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
        error: null,
      }),
    }));
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock(),
    }));
  });

  it('必須パラメータ不足時はエラー', async () => {
    const result = await finalizeEvent('', []);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/必須パラメータ/);
  });

  it('イベントが存在しない場合はエラー', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }
        if (table === 'event_dates') {
          return {
            select: jest.fn(() => Promise.resolve({ data: null, error: null })),
          };
        }
        return {};
      },
    }));
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/選択された日程/);
  });

  it('日程が不正な場合はエラー', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => Promise.resolve({
              data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
              error: null,
            })),
          };
        }
        if (table === 'event_dates') {
          return {
            select: jest.fn(() => Promise.resolve({ data: null, error: null })),
          };
        }
        return {};
      },
    }));
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/選択された日程/);
  });

  it('DBエラー時はエラーメッセージが返る', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => Promise.resolve({
              data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
              error: null,
            })),
          };
        }
        if (table === 'event_dates') {
          return {
            select: jest.fn(() => Promise.resolve({ data: null, error: { message: 'DBエラー' } })),
          };
        }
        return {};
      },
    }));
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/選択された日程/);
  });

  // finalizeEventの正常系も個別にチェーンを上書き
  it('正常な入力で日程が確定できる', async () => {
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({ data: { id: 'eventid', public_token: 'pubtok' }, error: null }))
              }))
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null }))
            })),
          };
        }
        if (table === 'event_dates') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => Promise.resolve({ data: [{ id: 'dateid' }], error: null }))
              }))
            })),
          };
        }
        if (table === 'finalized_dates') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null }))
            })),
            insert: jest.fn(() => Promise.resolve({ error: null })),
          };
        }
        return createSupabaseChainMock();
      },
    }));
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(true);
  });
});

// describe('Server Actions', () => {
//   it('createEvent: 正常な入力でイベントが作成される', async () => {
//     // 実装予定
//   });
//   it('submitAvailability: 正常な入力で回答が保存される', async () => {
//     // 実装予定
//   });
//   it('finalizeEvent: 管理トークン一致時のみ確定できる', async () => {
//     // 実装予定
//   });
// });
