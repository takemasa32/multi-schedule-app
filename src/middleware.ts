import { NextRequest, NextResponse } from 'next/server';

/**
 * LINEアプリ内ブラウザの判定ロジック
 * @param userAgent - User-Agentヘッダーの値
 * @returns LINEアプリ内ブラウザかどうか
 */
export function isLineInAppBrowser(userAgent: string): boolean {
  // LINEアプリのUser-Agentパターン：
  // - Line/[version] (例: Line/11.1.0)
  // - Line App (デスクトップ版)
  return userAgent.includes('Line/') || userAgent.includes('Line App');
}

/**
 * LINEアプリ内ブラウザでのアクセスを検知し、
 * `openExternalBrowser=1` を付与してリダイレクトするミドルウェア。
 *
 * @param request - Next.jsリクエストオブジェクト
 * @returns NextResponse（リダイレクトまたは続行）
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  // API や Next.js 内部リクエスト、静的ファイルは除外
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  const userAgent = request.headers.get('user-agent') || '';

  // LINEアプリ内ブラウザの判定
  if (!isLineInAppBrowser(userAgent)) {
    return NextResponse.next();
  }

  // 既にopenExternalBrowserパラメータが設定されている場合はスキップ
  const openExternal = searchParams.get('openExternalBrowser');
  if (openExternal === '1') {
    return NextResponse.next();
  }

  // openExternalBrowser=1を付与してリダイレクト
  const url = request.nextUrl.clone();
  url.searchParams.set('openExternalBrowser', '1');

  // 本番環境でのみ必要最低限のログを出力
  if (process.env.NODE_ENV === 'production') {
    console.log(`[Middleware] LINE redirect: ${pathname}`);
  }

  return NextResponse.redirect(url, 302);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - logo (logo files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|logo).*)',
  ],
};
