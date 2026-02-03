describe('authOptions redirect callback', () => {
  let redirect:
    | ((params: { url: string; baseUrl: string }) => string | PromiseLike<string>)
    | undefined;

  beforeAll(async () => {
    process.env.SUPABASE_DB_URL =
      process.env.SUPABASE_DB_URL ?? 'postgresql://localhost:5432/postgres';
    process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'test-secret';
    const { authOptions } = await import('@/lib/auth');
    redirect = authOptions.callbacks?.redirect;
    if (!redirect) {
      throw new Error('redirect callback is not defined');
    }
  });

  it('相対パスは許可する', async () => {
    const result = await Promise.resolve(
      redirect!({ url: '/account', baseUrl: 'http://localhost:3000' }),
    );
    expect(result).toBe('/account');
  });

  it('同一オリジンは許可する', async () => {
    const result = await Promise.resolve(
      redirect!({ url: 'http://localhost:3000/history', baseUrl: 'http://localhost:3000' }),
    );
    expect(result).toBe('http://localhost:3000/history');
  });

  it('異なるオリジンはbaseUrlにフォールバックする', async () => {
    const result = await Promise.resolve(
      redirect!({ url: 'https://example.com', baseUrl: 'http://localhost:3000' }),
    );
    expect(result).toBe('http://localhost:3000');
  });

  it('不正なURLはbaseUrlにフォールバックする', async () => {
    const result = await Promise.resolve(
      redirect!({ url: '::::', baseUrl: 'http://localhost:3000' }),
    );
    expect(result).toBe('http://localhost:3000');
  });
});
