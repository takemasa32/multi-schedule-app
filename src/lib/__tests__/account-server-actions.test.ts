import { deleteAccount } from '@/lib/account-server-actions';
import { authPool, getAuthSession } from '@/lib/auth';

jest.mock('@/lib/auth', () => ({
  authPool: { connect: jest.fn() },
  getAuthSession: jest.fn(),
}));

type MockClient = {
  query: jest.Mock;
  release: jest.Mock;
};

const buildClient = (queryImpl?: (sql: string) => Promise<unknown>): MockClient => {
  return {
    query: jest.fn((sql: string) => (queryImpl ? queryImpl(sql) : Promise.resolve({}))),
    release: jest.fn(),
  };
};

describe('deleteAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('確認文字が一致しない場合は失敗する', async () => {
    const formData = new FormData();
    formData.set('confirmation', '違う');

    const result = await deleteAccount(formData);

    expect(result).toEqual({ success: false, message: '確認文字が一致しません。' });
    expect(getAuthSession).not.toHaveBeenCalled();
  });

  it('未ログインの場合は失敗する', async () => {
    (getAuthSession as jest.Mock).mockResolvedValueOnce(null);

    const formData = new FormData();
    formData.set('confirmation', '削除');

    const result = await deleteAccount(formData);

    expect(result).toEqual({ success: false, message: 'ログインしてください。' });
    expect(authPool.connect).not.toHaveBeenCalled();
  });

  it('削除が成功した場合は成功を返す', async () => {
    (getAuthSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'user-1' } });

    const client = buildClient(async (sql) => {
      if (sql === 'DELETE FROM authjs.users WHERE id = $1') {
        return { rowCount: 1 };
      }
      return {};
    });
    (authPool.connect as jest.Mock).mockResolvedValueOnce(client);

    const formData = new FormData();
    formData.set('confirmation', '削除');

    const result = await deleteAccount(formData);

    expect(result).toEqual({ success: true });
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('DELETE FROM authjs.users WHERE id = $1', ['user-1']);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('削除対象が見つからない場合は失敗する', async () => {
    (getAuthSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'user-2' } });

    const client = buildClient(async (sql) => {
      if (sql === 'DELETE FROM authjs.users WHERE id = $1') {
        return { rowCount: 0 };
      }
      return {};
    });
    (authPool.connect as jest.Mock).mockResolvedValueOnce(client);

    const formData = new FormData();
    formData.set('confirmation', '削除');

    const result = await deleteAccount(formData);

    expect(result).toEqual({ success: false, message: '削除対象のアカウントが見つかりません。' });
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('例外発生時はロールバックして失敗する', async () => {
    (getAuthSession as jest.Mock).mockResolvedValueOnce({ user: { id: 'user-3' } });

    const client = buildClient(async (sql) => {
      if (sql === 'DELETE FROM authjs.users WHERE id = $1') {
        throw new Error('fail');
      }
      return {};
    });
    (authPool.connect as jest.Mock).mockResolvedValueOnce(client);

    const formData = new FormData();
    formData.set('confirmation', '削除');

    const result = await deleteAccount(formData);

    expect(result).toEqual({ success: false, message: 'アカウント削除に失敗しました。' });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});
