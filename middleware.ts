import { NextRequest, NextResponse } from 'next/server';

/**
 * LINEアプリ内ブラウザでのアクセスを検知し、
 * `openExternalBrowser=1` を付与してリダイレクトするミドルウェア。
 * 既にパラメータがある場合やLINE以外のUAでは何もしません。
 */

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const ua = request.headers.get('user-agent')?.toLowerCase() || '';
  if (!ua.includes('line')) {
    return NextResponse.next();
  }

  if (searchParams.get('openExternalBrowser') === '1') {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.searchParams.set('openExternalBrowser', '1');
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
