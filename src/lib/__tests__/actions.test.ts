import { createEvent, submitAvailability, finalizeEvent } from '../actions';

jest.mock('../supabase', () => ({
  createSupabaseAdmin: jest.fn(() => ({
    from: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    })),
  })),
  createSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
    })),
  })),
}));

describe('createEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常な入力でイベントが作成される', async () => {
    const formData = new FormData();
    formData.set('title', 'テストイベント');
    formData.append('startDates', '2025-05-10');
    formData.append('startTimes', '10:00');
    formData.append('endDates', '2025-05-10');
    formData.append('endTimes', '11:00');

    // supabaseのinsert, select, ...をモック
    const mockInsert = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockResolvedValue({
      data: [{ id: 'eventid', public_token: 'pubtok', admin_token: 'admintok' }],
      error: null,
    });
    const mockFrom = jest.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    }));
    require('../supabase').createSupabaseAdmin.mockReturnValue({ from: mockFrom });
    // event_dates insert
    mockFrom.mockReturnValueOnce({
      insert: mockInsert,
      select: mockSelect,
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    });
    mockFrom.mockReturnValueOnce({
      insert: jest.fn().mockResolvedValue({ error: null }),
    });

    const result = await createEvent(formData);
    expect(result.success).toBe(true);
    expect(result.publicToken).toBe('pubtok');
    expect(result.adminToken).toBe('admintok');
    expect(result.redirectUrl).toContain('/event/pubtok?admin=admintok');
  });

  it('タイトル未入力時はバリデーションエラー', async () => {
    const formData = new FormData();
    formData.append('startDates', '2025-05-10');
    formData.append('startTimes', '10:00');
    formData.append('endDates', '2025-05-10');
    formData.append('endTimes', '11:00');
    await expect(createEvent(formData)).rejects.toThrow('イベントタイトルは必須です');
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
    // supabaseのinsert, select, ...をモック
    const mockInsert = jest.fn().mockReturnThis();
    const mockSelect = jest.fn().mockResolvedValue({ data: null, error: { message: 'DBエラー' } });
    const mockFrom = jest.fn(() => ({
      insert: mockInsert,
      select: mockSelect,
      order: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    }));
    require('../supabase').createSupabaseAdmin.mockReturnValue({ from: mockFrom });
    await expect(createEvent(formData)).rejects.toThrow('イベントの作成に失敗しました: DBエラー');
  });
});

describe('submitAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常な入力で回答が保存される', async () => {
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtoken');
    formData.set('participant_name', 'テスト太郎');
    formData.append('availability_date1', 'on');
    formData.append('availability_date2', '');

    // supabaseのモック
    const mockFrom = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null }),
      insert: jest.fn().mockResolvedValue({ data: { id: 'pid' }, error: null }),
      delete: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      single: jest.fn().mockResolvedValue({ data: { id: 'eventid' }, error: null }),
      order: jest.fn().mockReturnThis(),
    }));
    require('../supabase').createSupabaseClient.mockReturnValue({ from: mockFrom });

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
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtoken');
    formData.set('participant_name', 'テスト太郎');
    require('../supabase').createSupabaseClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      })),
    });
    const result = await submitAvailability(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/イベントが見つかりません/);
  });

  it('回答が1件もない場合はエラー', async () => {
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtoken');
    formData.set('participant_name', 'テスト太郎');
    // availability_が1件もない
    require('../supabase').createSupabaseClient.mockReturnValue({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null }),
        insert: jest.fn().mockResolvedValue({ data: { id: 'pid' }, error: null }),
        delete: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        single: jest.fn().mockResolvedValue({ data: { id: 'eventid' }, error: null }),
        order: jest.fn().mockReturnThis(),
      })),
    });
    const result = await submitAvailability(formData);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/少なくとも1つの回答/);
  });

  it('既存参加者の上書き保存ができる', async () => {
    const formData = new FormData();
    formData.set('eventId', 'eventid');
    formData.set('publicToken', 'pubtoken');
    formData.set('participant_name', 'テスト太郎');
    formData.append('availability_date1', 'on');
    // 既存参加者が存在する場合
    const mockFrom = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'pid' } }),
      insert: jest.fn().mockResolvedValue({ data: { id: 'pid' }, error: null }),
      delete: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      single: jest.fn().mockResolvedValue({ data: { id: 'eventid' }, error: null }),
      order: jest.fn().mockReturnThis(),
    }));
    require('../supabase').createSupabaseClient.mockReturnValue({ from: mockFrom });
    const result = await submitAvailability(formData);
    expect(result.success).toBe(true);
    expect(result.message).toMatch(/回答を送信しました/);
  });
});

describe('finalizeEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('必須パラメータ不足時はエラー', async () => {
    const result = await finalizeEvent('', []);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/必須パラメータが不足/);
  });

  it('イベントが存在しない場合はエラー', async () => {
    const mockFrom = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    }));
    require('../supabase').createSupabaseClient.mockReturnValue({ from: mockFrom });
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/イベントが見つかりません/);
  });

  it('日程が不正な場合はエラー', async () => {
    const mockFrom = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'eventid', public_token: 'pubtok' }, error: null }),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    require('../supabase').createSupabaseClient.mockReturnValue({ from: mockFrom });
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/選択された日程が見つかりません/);
  });

  it('DBエラー時はエラーメッセージが返る', async () => {
    const mockFrom = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'eventid', public_token: 'pubtok' }, error: null }),
      in: jest.fn().mockResolvedValue({ data: [{ id: 'dateid' }], error: null }),
      update: jest.fn().mockResolvedValue({ error: { message: 'update error' } }),
      delete: jest.fn().mockResolvedValue({}),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }));
    require('../supabase').createSupabaseClient.mockReturnValue({ from: mockFrom });
    const result = await finalizeEvent('eventid', ['dateid']);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/イベント確定に失敗しました/);
  });

  it('正常な入力で日程が確定できる', async () => {
    const mockFrom = jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'eventid', public_token: 'pubtok' }, error: null }),
      in: jest.fn().mockResolvedValue({ data: [{ id: 'dateid' }], error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockResolvedValue({}),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }));
    require('../supabase').createSupabaseClient.mockReturnValue({ from: mockFrom });
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
