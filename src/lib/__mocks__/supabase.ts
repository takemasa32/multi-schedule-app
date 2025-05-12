// Jest用Supabaseクライアントのモック
// 必要な関数やオブジェクトをダミーでエクスポート

export const supabase = {
  from: () => ({
    select: () => ({ data: [], error: null }),
    insert: () => ({ data: [], error: null }),
    update: () => ({ data: [], error: null }),
    delete: () => ({ data: [], error: null }),
    eq: () => ({ data: [], error: null }),
  }),
};

export const createSupabaseAdmin = () => supabase;
export const createSupabaseClient = jest.fn(() => supabase);
