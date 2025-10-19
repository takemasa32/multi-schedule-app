import { getEvent } from '../actions';
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
    const updateChain = createSupabaseChainMock({ data: null, error: null });
    const fromMock = jest.fn().mockReturnValueOnce(selectChain).mockReturnValueOnce(updateChain);
    mockedCreateSupabaseAdmin.mockImplementation(() => ({ from: fromMock }));

    const event = await getEvent('tok');
    expect(event.id).toBe('e1');
    expect(fromMock).toHaveBeenCalledTimes(2);
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
    await expect(getEvent('tok')).rejects.toBeInstanceOf(EventFetchError);
  });

  it('データが null の場合も EventNotFoundError', async () => {
    const chain = createSupabaseChainMock({ data: null, error: null });
    mockedCreateSupabaseAdmin.mockImplementation(() => ({ from: () => chain }));
    await expect(getEvent('tok')).rejects.toBeInstanceOf(EventNotFoundError);
  });
});
