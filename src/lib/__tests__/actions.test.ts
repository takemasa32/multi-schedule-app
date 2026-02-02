import {
  createEvent,
  submitAvailability,
  finalizeEvent,
  addEventDates,
  getFinalizedDateIds,
} from '@/lib/actions';
import { createSupabaseAdmin, createSupabaseClient } from '../supabase';

jest.mock('../supabase');
jest.mock('@/lib/auth', () => ({
  getAuthSession: jest.fn(() => Promise.resolve(null)),
}));
const mockedCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock;
const mockedCreateSupabaseClient = createSupabaseClient as jest.Mock;

jest.mock('@/lib/supabase', () => ({
  createSupabaseClient: jest.fn(() => ({ from: jest.fn() })),
  createSupabaseAdmin: jest.fn(() => ({ from: jest.fn() })),
}));

// 汎用的なSupabaseチェーンモック（多段チェーン対応・再帰的）
function createSupabaseChainMock(result: Record<string, unknown> = { data: [], error: null }) {
  const methods = [
    'insert',
    'select',
    'eq',
    'in',
    'order',
    'update',
    'delete',
    'range',
    'from',
    'not',
    'or',
    'like',
    'ilike',
    'limit',
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function makeChain(res: any) {
    // 新しいチェーンオブジェクト
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    methods.forEach((m) => {
      chain[m] = jest.fn(() => makeChain(res));
    });
    chain.single = jest.fn(() => Promise.resolve(res));
    chain.maybeSingle = jest.fn(() => Promise.resolve(res));
    chain.then = jest.fn((onFulfilled) => Promise.resolve(res).then(onFulfilled));
    chain.catch = jest.fn((onRejected) => {
      if (res.error) return Promise.reject(res.error).catch(onRejected);
      return Promise.resolve(res);
    });
    return chain;
  }
  return makeChain(result);
}

describe('createEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) =>
        createSupabaseChainMock({
          data: [{ id: 'eventid', public_token: 'AbCdEf123456', admin_token: 'mock-admin-token' }],
          error: null,
        }),
      rpc: jest.fn(() =>
        Promise.resolve({
          data: [
            {
              event_id: 'eventid',
              public_token: 'AbCdEf123456',
              admin_token: 'mock-admin-token',
            },
          ],
          error: null,
        }),
      ),
    }));
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock(),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
  });

  it('正常な入力でイベントが作成される', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    formData.append('startDates', '2025-05-10');
    formData.append('startTimes', '10:00');
    formData.append('endDates', '2025-05-10');
    formData.append('endTimes', '11:00');
    // データは12桁の英数字形式で返す
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) =>
        createSupabaseChainMock({
          data: [
            {
              id: 'eventid',
              public_token: 'ZyxwvU987654',
              admin_token: '123e4567-e89b-12d3-a456-426614174001',
            },
          ],
          error: null,
        }),
      rpc: jest.fn(() =>
        Promise.resolve({
          data: [
            {
              event_id: 'eventid',
              public_token: 'ZyxwvU987654',
              admin_token: '123e4567-e89b-12d3-a456-426614174001',
            },
          ],
          error: null,
        }),
      ),
    }));
    const publicTokenRegex = /^[0-9A-Za-z]{12}$/;
    const adminTokenRegex = /^[0-9a-fA-F-]{36}$/;
    const result = await createEvent(formData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.publicToken).toMatch(publicTokenRegex);
      expect(result.adminToken).toMatch(adminTokenRegex);
      expect(result.redirectUrl).toBe(`/event/${result.publicToken}`);
    }
  });

  it('タイトル未入力時はバリデーションエラー', async () => {
    const formData = new FormData();
    formData.append('startDates', '2025-05-10');
    formData.append('startTimes', '10:00');
    formData.append('endDates', '2025-05-10');
    formData.append('endTimes', '11:00');
    const result = await createEvent(formData);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('バリデーションエラーが返りませんでした');
    }
    expect(result.message).toMatch(/タイトル/);
  });

  it('候補日程未入力時はバリデーションエラー', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    const result = await createEvent(formData);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('バリデーションエラーが返りませんでした');
    }
    expect(result.message).toMatch(/候補日程/);
  });

  it('候補日程の形式不正時はエラー', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    formData.append('startDates', '2025-05-10');
    // 時刻が足りない
    const result = await createEvent(formData);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('バリデーションエラーが返りませんでした');
    }
    expect(result.message).toMatch(/候補日程/);
  });

  it('DBエラー時はエラーメッセージが返る', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    formData.append('startTimes', '2025-05-10T10:00:00.000Z');
    formData.append('endTimes', '2025-05-10T11:00:00.000Z');
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) =>
        createSupabaseChainMock({ data: null, error: { message: 'DBエラー' } }),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: { message: 'DBエラー' } })),
    }));
    const result = await createEvent(formData);
    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error('エラーメッセージが返りませんでした');
    }
    expect(result.message).toMatch(/DBエラー/);
  });
});

describe('submitAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({
            data: [
              {
                id: 'eventid',
                public_token: 'AbCdEf123456',
                admin_token: 'mock-admin-token',
                is_finalized: false,
              },
            ],
            error: null,
          });
        }
        if (table === 'participants') {
          return createSupabaseChainMock({ data: [], error: null });
        }
        if (table === 'availabilities') {
          return createSupabaseChainMock({ data: [], error: null });
        }
        return createSupabaseChainMock();
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock(),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
  });

  it('正常な入力で回答が保存される', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({
            data: [
              {
                id: 'eventid',
                public_token: 'AbCdEf123456',
                admin_token: 'mock-admin-token',
                is_finalized: false,
              },
            ],
            error: null,
          });
        }
        if (table === 'participants') {
          return createSupabaseChainMock({ data: [], error: null });
        }
        return createSupabaseChainMock({ data: [], error: null });
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
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
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({ data: null, error: null });
        }
        return createSupabaseChainMock();
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
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
          return createSupabaseChainMock({
            data: [
              {
                id: 'eventid',
                public_token: 'AbCdEf123456',
                admin_token: 'mock-admin-token',
                is_finalized: false,
              },
            ],
            error: null,
          });
        }
        if (table === 'participants') {
          return createSupabaseChainMock({
            data: [{ id: 'partid', name: 'テスト太郎' }],
            error: null,
          });
        }
        if (table === 'availabilities') {
          return createSupabaseChainMock({ data: [], error: null });
        }
        return createSupabaseChainMock();
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
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

  it('コメント付きで新規参加者が保存される', async () => {
    const selectChain = createSupabaseChainMock({ data: null, error: null });
    const insertChain = createSupabaseChainMock({
      data: { id: 'partid' },
      error: null,
    });
    const participantsFrom = jest
      .fn()
      .mockReturnValueOnce(selectChain)
      .mockReturnValueOnce(insertChain);
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({
            data: [
              {
                id: 'eventid',
                public_token: 'AbCdEf123456',
                admin_token: 'mock-admin-token',
                is_finalized: false,
              },
            ],
            error: null,
          });
        }
        if (table === 'participants') {
          return participantsFrom();
        }
        if (table === 'availabilities') {
          return createSupabaseChainMock({ data: [], error: null });
        }
        return createSupabaseChainMock();
      },
    }));
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtok');
    formData.set('participant_name', 'テスト太郎');
    formData.set('comment', 'コメントテスト');
    formData.append('availability_date1', 'on');
    await submitAvailability(formData);
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ comment: 'コメントテスト' }),
    );
  });
});

describe('finalizeEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({
            data: [
              {
                id: 'eventid',
                public_token: 'AbCdEf123456',
                admin_token: 'mock-admin-token',
                is_finalized: false,
              },
            ],
            error: null,
          });
        }
        if (table === 'event_dates') {
          return createSupabaseChainMock({
            data: [{ id: 'dateid' }],
            error: null,
          });
        }
        return createSupabaseChainMock();
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
    mockedCreateSupabaseClient.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock(),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
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
          return createSupabaseChainMock({ data: [], error: null });
        }
        if (table === 'event_dates') {
          return createSupabaseChainMock({ data: null, error: null });
        }
        return createSupabaseChainMock();
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/選択された日程/);
  });

  it('日程が不正な場合はエラー', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({
            data: [
              {
                id: 'eventid',
                public_token: 'AbCdEf123456',
                admin_token: 'mock-admin-token',
                is_finalized: false,
              },
            ],
            error: null,
          });
        }
        if (table === 'event_dates') {
          return createSupabaseChainMock({ data: null, error: null });
        }
        return createSupabaseChainMock();
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/選択された日程/);
  });

  it('DBエラー時はエラーメッセージが返る', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({
            data: [
              {
                id: 'eventid',
                public_token: 'AbCdEf123456',
                admin_token: 'mock-admin-token',
                is_finalized: false,
              },
            ],
            error: null,
          });
        }
        if (table === 'event_dates') {
          return createSupabaseChainMock({
            data: null,
            error: { message: 'DBエラー' },
          });
        }
        return createSupabaseChainMock();
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: { message: 'DBエラー' } })),
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
                single: jest.fn(() =>
                  Promise.resolve({
                    data: { id: 'eventid', public_token: 'pubtok' },
                    error: null,
                  }),
                ),
              })),
            })),
            update: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
          };
        }
        if (table === 'event_dates') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => Promise.resolve({ data: [{ id: 'dateid' }], error: null })),
              })),
            })),
          };
        }
        if (table === 'finalized_dates') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
            insert: jest.fn(() => Promise.resolve({ error: null })),
          };
        }
        return createSupabaseChainMock();
      },
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(true);
  });
});

// --- イベント日程追加アクションのテスト ---
describe('addEventDates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock(),
      rpc: jest.fn(() => Promise.resolve({ data: null, error: null })),
    }));
  });

  it('正常な入力で日程が追加できる', async () => {
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.append('start', '2025-06-01 10:00:00');
    formData.append('end', '2025-06-01 11:00:00');

    const result = await addEventDates(formData);
    expect(result.success).toBe(true);
  });

  it('既存日程と重複する場合はエラー', async () => {
    // 重複エラーを模擬
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) => createSupabaseChainMock(),
      rpc: jest.fn(() =>
        Promise.resolve({
          data: null,
          error: { message: '既存の日程と重複しています' },
        }),
      ),
    }));

    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.append('start', '2025-06-01 10:00:00');
    formData.append('end', '2025-06-01 11:00:00');

    const result = await addEventDates(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/重複/);
  });

  it('必須項目不足時はエラー', async () => {
    const formData = new FormData();
    // eventIdを省略

    const result = await addEventDates(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/必要な情報が不足/);
  });
});

// --- getFinalizedDateIds のテスト ---
describe('getFinalizedDateIds', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('複数の確定日程IDを取得できる', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'finalized_dates') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() =>
                Promise.resolve({
                  data: [{ event_date_id: 'd1' }, { event_date_id: 'd2' }],
                  error: null,
                }),
              ),
            })),
          };
        }
        return createSupabaseChainMock();
      },
    }));

    const ids = await getFinalizedDateIds('eventid', null);
    expect(ids).toEqual(['d1', 'd2']);
  });

  it('エラー時はfinalDateIdを返す', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'finalized_dates') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ data: null, error: { message: 'error' } })),
            })),
          };
        }
        return createSupabaseChainMock();
      },
    }));

    const ids = await getFinalizedDateIds('eventid', 'legacy');
    expect(ids).toEqual(['legacy']);
  });
});
