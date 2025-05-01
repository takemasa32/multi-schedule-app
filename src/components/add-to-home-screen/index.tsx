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
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-primary text-primary-content z-50 animate-slideUp">
      <div className="container mx-auto relative max-w-xl">
        <button
          onClick={closeBanner}
          className="btn btn-sm btn-circle btn-ghost text-primary-content absolute top-2 right-2"
          aria-label="閉じる"
        >
          ✕
        </button>
        <div className="pr-4">
          <h3 className="font-bold text-lg mb-1">ホーム画面に追加しよう！</h3>
          {isIOSDevice ? (
            <div className="text-sm">
              <p className="mb-2">iPhoneでより快適にご利用いただくには：</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>
                  画面下部の
                  <span className="inline-flex items-center">
                    {/* 正しい共有アイコン（四角＋上矢印） */}
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
            <div className="text-sm">
              <p className="mb-2">より快適にご利用いただくには：</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>ブラウザの設定メニュー（⋮）をタップ</li>
                <li>「ホーム画面に追加」を選択</li>
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
