"use client";

import { useState } from "react";
import Card from "@/components/layout/Card";

interface EventHeaderProps {
  title: string;
  description: string | null;
  isFinalized: boolean;
  isAdmin?: boolean;
  finalDate?: {
    date_time: string;
  } | null;
}

export function EventHeader({
  title,
  description,
  isFinalized,
  isAdmin,
}: EventHeaderProps) {
  const [copied, setCopied] = useState(false);

  // 現在のURLをコピーする
  const copyEventLink = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => console.error("URLのコピーに失敗しました", err)
    );
  };

  return (
    <Card className="mb-8" isHighlighted={isFinalized}>
      <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">
            {isFinalized && <span className="text-success mr-2">✓</span>}
            {title}
          </h1>
          {isFinalized && (
            <div className="badge badge-success badge-lg mb-4">
              日程確定済み
            </div>
          )}
          {description && (
            <p className="text-base-content/70 whitespace-pre-line mt-2">
              {description}
            </p>
          )}
        </div>

        <button
          className={`btn ${
            copied ? "btn-success" : "btn-primary"
          } btn-sm sm:btn-md btn-animated`}
          onClick={copyEventLink}
        >
          {copied ? (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              コピー完了
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5"
                />
              </svg>
              共有リンクをコピー
            </>
          )}
        </button>
      </div>

      {!isFinalized && isAdmin && (
        <div className="alert bg-info/10 text-info border-l-4 border-info text-sm">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>
            管理者として閲覧中です。十分な回答が集まったら、下部の「この日程で確定」ボタンを押して日程を確定できます。
          </span>
        </div>
      )}
    </Card>
  );
}
