'use client';

import { useEffect, useState } from 'react';
import { isIOS, isMobileDevice, isStandalone } from '@/lib/utils';

export default function AddToHomeScreenBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // クライアントサイドでのみ実行
    const mobile = isMobileDevice();
    const ios = isIOS();
    const standalone = isStandalone();

    // ローカルストレージから以前に閉じた日時を取得
    const lastClosed = localStorage.getItem('add_to_home_banner_closed');
    const lastClosedDate = lastClosed ? new Date(parseInt(lastClosed)) : null;
    const now = new Date();

    // 7日間（604800000ミリ秒）経過していれば再表示
    const shouldShowAgain = !lastClosedDate || now.getTime() - lastClosedDate.getTime() > 604800000;

    setIsIOSDevice(ios);
    // モバイルデバイスで、すでにホーム画面に追加されていなくて、最近閉じていなければ表示
    if (mobile && !standalone && shouldShowAgain) {
      // すぐには表示せず、少し時間を置いてから表示
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000); // 3秒後に表示

      return () => clearTimeout(timer);
    }
  }, []);

  // バナーを閉じる処理
  const closeBanner = () => {
    setShowBanner(false);
    // 閉じた時間をローカルストレージに保存
    localStorage.setItem('add_to_home_banner_closed', Date.now().toString());
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="bg-primary/95 text-primary-content border-primary-focus fixed bottom-0 left-0 right-0 z-[100] animate-slideUp rounded-t-2xl border-t-4 px-4 pb-6 pt-4 shadow-2xl transition-all duration-200">
      <div className="container relative mx-auto flex max-w-xl flex-col items-center">
        {/* ドラッグバー風アクセント */}
        <div className="bg-primary-content/40 mb-3 h-1.5 w-12 rounded-full" />
        <button
          onClick={closeBanner}
          className="btn btn-md btn-circle btn-ghost text-primary-content absolute right-2 top-2"
          aria-label="閉じる"
        >
          ✕
        </button>
        <div className="flex w-full flex-col items-center pr-2">
          <h3 className="mb-2 text-center text-lg font-bold tracking-wide drop-shadow-sm">
            ホーム画面に追加しよう！
          </h3>
          {isIOSDevice ? (
            <div className="text-center text-sm">
              <p className="mb-2 font-medium">iPhoneでより快適にご利用いただくには：</p>
              <ol className="mx-auto inline-block list-decimal space-y-1 pl-5 text-left">
                <li>
                  画面下部の
                  <span className="inline-flex items-center font-semibold">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-1 h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        d="M12 3v12m0-12l-4 4m4-4l4 4"
                        stroke="#000"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                      <rect
                        x="4"
                        y="13"
                        width="16"
                        height="8"
                        rx="2"
                        fill="#000"
                        fillOpacity="0.1"
                      />
                    </svg>
                    共有
                  </span>
                  ボタンをタップ
                </li>
                <li>「ホーム画面に追加」をタップ</li>
                <li>右上の「追加」をタップして完了</li>
              </ol>
            </div>
          ) : (
            <div className="text-center text-sm">
              <p className="mb-2 font-medium">より快適にご利用いただくには：</p>
              <ol className="mx-auto inline-block list-decimal space-y-1 pl-5 text-left">
                <li>
                  ブラウザの設定メニュー（<span className="font-bold">⋮</span>
                  ）をタップ
                </li>
                <li>「ホーム画面に追加」を選択</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
