import { getEvent, touchEventLastAccessedIfStale } from '../actions';
import { createSupabaseAdmin } from '../supabase';
import { EventNotFoundError, EventFetchError } from '../errors';

jest.mock('../supabase', () => ({
  createSupabaseAdmin: jest.fn(),
}));
const mockedCreateSupabaseAdmin = createSupabaseAdmin as jest.Mock;

// 汎用的なSupabaseチェーンモック
function createSupabaseChainMock(result: Record<string, unknown> = { data: null, error: null }) {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    methods.forEach((m) => {
      chain[m] = jest.fn(() => makeChain(res));
    });
    chain.single = jest.fn(() => Promise.resolve(res));
    chain.maybeSingle = jest.fn(() => Promise.resolve(res));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    chain.then = jest.fn((onFulfilled: any) => Promise.resolve(res).then(onFulfilled));
    return chain;
  }
  return makeChain(result);
}

describe('getEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('正常にイベントを取得できる', async () => {
    const selectChain = createSupabaseChainMock({
      data: { id: 'e1', public_token: 'tok' },
      error: null,
    });
    const fromMock = jest.fn().mockReturnValueOnce(selectChain);
    mockedCreateSupabaseAdmin.mockImplementation(() => ({ from: fromMock }));

    const event = await getEvent('tok');
    expect(event.id).toBe('e1');
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it('行が存在しない場合は EventNotFoundError', async () => {
    const chain = createSupabaseChainMock({
      data: null,
      error: { code: 'PGRST116', message: 'no rows' },
    });
    mockedCreateSupabaseAdmin.mockImplementation(() => ({ from: () => chain }));
    await expect(getEvent('none')).rejects.toBeInstanceOf(EventNotFoundError);
  });

  it('Supabase エラー時は EventFetchError', async () => {
    const chain = createSupabaseChainMock({
      data: null,
      error: { code: '500', message: 'server error' },
    });
    mockedCreateSupabaseAdmin.mockImplementation(() => ({ from: () => chain }));
    await expect(getEvent('tok-error')).rejects.toBeInstanceOf(EventFetchError);
  });

  it('データが null の場合も EventNotFoundError', async () => {
    const chain = createSupabaseChainMock({ data: null, error: null });
    mockedCreateSupabaseAdmin.mockImplementation(() => ({ from: () => chain }));
    await expect(getEvent('tok-null')).rejects.toBeInstanceOf(EventNotFoundError);
  });
});

describe('touchEventLastAccessedIfStale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('更新間隔を超えていれば最終アクセス時刻を更新する', async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({
      data: { id: 'event-1', last_accessed_at: '2000-01-01T00:00:00.000Z' },
      error: null,
    });
    const selectEqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectEqMock });
    const updateEqMock = jest.fn().mockResolvedValue({ error: null });
    const updateMock = jest.fn().mockReturnValue({ eq: updateEqMock });
    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ update: updateMock });
    mockedCreateSupabaseAdmin.mockImplementation(() => ({ from: fromMock }));

    await touchEventLastAccessedIfStale('tok');

    expect(updateEqMock).toHaveBeenCalledWith('id', 'event-1');
  });

  it('更新間隔内なら最終アクセス更新をスキップする', async () => {
    const nowIso = new Date().toISOString();
    const maybeSingleMock = jest.fn().mockResolvedValue({
      data: { id: 'event-1', last_accessed_at: nowIso },
      error: null,
    });
    const selectEqMock = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const selectMock = jest.fn().mockReturnValue({ eq: selectEqMock });
    const updateMock = jest.fn();
    const fromMock = jest
      .fn()
      .mockReturnValueOnce({ select: selectMock })
      .mockReturnValueOnce({ update: updateMock });
    mockedCreateSupabaseAdmin.mockImplementation(() => ({ from: fromMock }));

    await touchEventLastAccessedIfStale('tok');

    expect(updateMock).not.toHaveBeenCalled();
  });
});
