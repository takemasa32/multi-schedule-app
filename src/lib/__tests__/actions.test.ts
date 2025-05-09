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
  const chain: {
    insert: jest.Mock;
    select: jest.Mock;
    eq: jest.Mock;
    in: jest.Mock;
    single: jest.Mock;
    maybeSingle: jest.Mock;
    order: jest.Mock;
    delete: jest.Mock;
    update: jest.Mock;
    range: jest.Mock;
    then: jest.Mock;
    catch: jest.Mock;
  } = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    in: jest.fn(() => chain),
    single: jest.fn(() => chain),
    maybeSingle: jest.fn(() => chain),
    order: jest.fn(() => chain),
    delete: jest.fn(() => chain),
    update: jest.fn(() => chain),
    range: jest.fn(() => chain),
    then: jest.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)),
    catch: jest.fn(() => chain),
  };
  return chain;
}

describe('createEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトは正常系の返却値
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
    await expect(createEvent(formData)).rejects.toThrow('タイトルを入力してください');
  });

  it('候補日程未入力時はバリデーションエラー', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    await expect(createEvent(formData)).rejects.toThrow('候補日程の情報が正しくありません');
  });

  it('DBエラー時はエラーメッセージが返る', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    formData.append('startDates', '2025-05-10');
    formData.append('startTimes', '10:00');
    formData.append('endDates', '2025-05-10');
    formData.append('endTimes', '11:00');
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (_table: string) => ({
        insert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ data: null, error: { message: 'DBエラー' } })),
        })),
      }),
    }));
    // createEventはエラー時throwする実装なので、try-catchでcatchしsuccess: falseを返すようにmock
    let result: { success: boolean; message: string };
    try {
      result = await createEvent(formData) as { success: boolean; message: string; publicToken?: string; adminToken?: string; redirectUrl?: string };
    } catch (e: unknown) {
      result = { success: false, message: e instanceof Error ? e.message : String(e) };
    }
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/イベントの作成に失敗しました/);
  });
});

describe('submitAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトは正常系の返却値
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
    expect(result.message).toMatch(/回答を送信しました/);
  });

  it('必須項目未入力時はエラー', async () => {
    const formData = new FormData();
    const result = await submitAvailability(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/必須項目が未入力/);
  });

  it('イベントが存在しない場合はエラー', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => Promise.resolve({ data: [], error: null })),
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
    // submitAvailabilityはイベントが見つからない場合success: falseを返す
    const result = await submitAvailability(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/イベントが見つかりません/);
  });

  it('回答が1件もない場合はエラー', async () => {
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtok');
    formData.set('participant_name', 'テスト太郎');
    // availability系の入力なし
    const result = await submitAvailability(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/少なくとも1つの回答/);
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
    expect(result.message).toMatch(/回答を送信しました/);
  });

  it('submitAvailability: 正常な入力で回答が保存される', async () => {
    // 正常系のmock
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({
            data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
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
    }));
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtoken');
    formData.set('participant_name', 'テスト太郎');
    formData.append('availability_date1', 'on');
    formData.append('availability_date2', '');
    const result = await submitAvailability(formData);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/回答を送信しました/);
  });
});

describe('finalizeEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトは正常系の返却値
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
    expect(result.message).toMatch(/必須パラメータが不足/);
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
    // finalizeEventはイベントが見つからない場合success: false, message: 'イベントが見つかりません'を返す
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/イベントが見つかりません/);
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
    expect(result.message).toMatch(/選択された日程が見つかりません/);
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
    // finalizeEventは日程取得エラー時success: false, message: 'イベント確定に失敗しました'を返す
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/イベント確定に失敗しました/);
  });

  it('正常な入力で日程が確定できる', async () => {
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return {
            select: jest.fn(() => Promise.resolve({
              data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
              error: null,
            })),
            update: jest.fn(() => Promise.resolve({ data: [{ id: 'eventid', is_finalized: true, final_date_id: 'dateid' }], error: null })),
          };
        }
        if (table === 'event_dates') {
          return {
            select: jest.fn(() => Promise.resolve({
              data: [{ id: 'dateid', event_id: 'eventid', start_time: '2025-05-10T10:00:00Z', end_time: '2025-05-10T11:00:00Z' }],
              error: null,
            })),
          };
        }
        if (table === 'participants') {
          return {
            select: jest.fn(() => Promise.resolve({ data: [], error: null })),
          };
        }
        return {};
      },
    }));
    // finalizeEventは正常時success: trueを返す
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(true);
  });

  it('finalizeEvent: 正常な入力で日程が確定できる', async () => {
    // 正常系のmock
    mockedCreateSupabaseAdmin.mockImplementation(() => ({
      from: (table: string) => {
        if (table === 'events') {
          return createSupabaseChainMock({
            data: [{ id: 'eventid', public_token: 'mock-public-token', admin_token: 'mock-admin-token', is_finalized: false }],
            error: null,
            update: jest.fn(() => Promise.resolve({ data: [{ id: 'eventid', is_finalized: true, final_date_id: 'dateid' }], error: null })),
          });
        }
        if (table === 'event_dates') {
          return createSupabaseChainMock({
            data: [{ id: 'dateid', event_id: 'eventid', start_time: '2025-05-10T10:00:00Z', end_time: '2025-05-10T11:00:00Z' }],
            error: null,
          });
        }
        if (table === 'participants') {
          return createSupabaseChainMock({ data: [], error: null });
        }
        return createSupabaseChainMock();
      },
    }));
    // finalizeEventは正常時success: trueを返す
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(true);
  });
});

describe('Server Actions', () => {
  it('createEvent: 正常な入力でイベントが作成される', async () => {
    // 実装予定
  });
  it('submitAvailability: 正常な入力で回答が保存される', async () => {
    // 実装予定
  });
  it('finalizeEvent: 管理トークン一致時のみ確定できる', async () => {
    // 実装予定
  });
});
