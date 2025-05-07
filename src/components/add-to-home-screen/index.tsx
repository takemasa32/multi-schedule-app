"use client";

import { useEffect, useState } from "react";
import { isIOS, isMobileDevice, isStandalone } from "@/lib/utils";

export default function AddToHomeScreenBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // クライアントサイドでのみ実行
    const mobile = isMobileDevice();
    const ios = isIOS();
    const standalone = isStandalone();

    // ローカルストレージから以前に閉じた日時を取得
    const lastClosed = localStorage.getItem("add_to_home_banner_closed");
    const lastClosedDate = lastClosed ? new Date(parseInt(lastClosed)) : null;
    const now = new Date();

    // 7日間（604800000ミリ秒）経過していれば再表示
    const shouldShowAgain =
      !lastClosedDate || now.getTime() - lastClosedDate.getTime() > 604800000;

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
    localStorage.setItem("add_to_home_banner_closed", Date.now().toString());
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 px-4 pb-6 pt-4 bg-primary/95 text-primary-content z-[100] animate-slideUp shadow-2xl rounded-t-2xl border-t-4 border-primary-focus transition-all duration-200">
      <div className="container mx-auto relative max-w-xl flex flex-col items-center">
        {/* ドラッグバー風アクセント */}
        <div className="w-12 h-1.5 bg-primary-content/40 rounded-full mb-3" />
        <button
          onClick={closeBanner}
          className="btn btn-md btn-circle btn-ghost text-primary-content absolute top-2 right-2"
          aria-label="閉じる"
        >
          ✕
        </button>
        <div className="pr-2 w-full flex flex-col items-center">
          <h3 className="font-bold text-lg mb-2 text-center tracking-wide drop-shadow-sm">
            ホーム画面に追加しよう！
          </h3>
          {isIOSDevice ? (
            <div className="text-sm text-center">
              <p className="mb-2 font-medium">
                iPhoneでより快適にご利用いただくには：
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-left inline-block mx-auto">
                <li>
                  画面下部の
                  <span className="inline-flex items-center font-semibold">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 mr-1"
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
            <div className="text-sm text-center">
              <p className="mb-2 font-medium">より快適にご利用いただくには：</p>
              <ol className="list-decimal pl-5 space-y-1 text-left inline-block mx-auto">
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
