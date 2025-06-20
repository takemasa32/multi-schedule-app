import { createClient } from '@supabase/supabase-js';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ client: true })),
}));

describe('supabase.ts', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    (createClient as jest.Mock).mockClear();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('環境変数不足時はエラー', async () => {
    delete process.env.SUPABASE_URL;
    const { createSupabaseAdmin } = await import('../supabase');
    expect(() => createSupabaseAdmin()).toThrow();
  });

  it('adminクライアントを生成する', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
    const { createSupabaseAdmin } = await import('../supabase');
    const client = createSupabaseAdmin();
    expect(client).toEqual({ client: true });
  });

  it('anonクライアントを生成する', async () => {
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon';
    const { createSupabaseClient } = await import('../supabase');
    const client = createSupabaseClient();
    expect(client).toEqual({ client: true });
  });
});
