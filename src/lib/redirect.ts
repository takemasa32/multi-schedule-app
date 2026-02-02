/**
 * callbackUrl を安全な相対パスに正規化する
 * @param rawUrl callbackUrl の生値
 * @returns 安全な相対パス
 */
export const normalizeCallbackUrl = (rawUrl?: string | null): string => {
  if (!rawUrl) return '/';
  if (rawUrl.startsWith('/') && !rawUrl.startsWith('//')) {
    return rawUrl;
  }
  return '/';
};
