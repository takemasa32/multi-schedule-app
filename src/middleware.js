import { NextResponse } from 'next/server';

/**
 * LINEアプリ内ブラウザでのアクセスを検知し、
 * `openExternalBrowser=1` を付与してリダイレクトするミドルウェア。
 * Next.js 15では、middlewareファイルはsrcディレクトリ内に配置する必要があります。
 */
export function middleware(request) {
  const { pathname, searchParams } = request.nextUrl;
  
  // API や Next.js 内部リクエスト、静的ファイルは除外
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const ua = request.headers.get('user-agent') || '';
  
  // LINEアプリ内ブラウザの判定
  const isLineApp = ua.includes('Line/');
  
  if (!isLineApp) {
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
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
