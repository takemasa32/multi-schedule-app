import Script from "next/script";

/**
 * LINEアプリ内ブラウザでアクセスされた場合、
 * openExternalBrowser=1 クエリを自動付与してリダイレクトする
 */
export default function LineExternalBrowserRedirector() {
  const script = `(
    function() {
      const ua = navigator.userAgent.toLowerCase();
      if (!ua.includes('line')) return;
      const url = new URL(window.location.href);
      if (url.searchParams.get('openExternalBrowser') === '1') return;
      url.searchParams.set('openExternalBrowser', '1');
      window.location.replace(url.toString());
    }
  )();`;
  return (
    <Script
      id="line-external-browser-redirector"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
