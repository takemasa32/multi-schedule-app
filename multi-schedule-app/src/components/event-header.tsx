'use client';

import { useState } from 'react';
import { formatDateTimeWithDay } from '@/lib/utils';

interface EventHeaderProps {
  event: {
    title: string;
    description: string | null;
    is_finalized: boolean;
  };
  isAdmin: boolean;
  finalDate: {
    date_time: string;
  } | null;
}

export function EventHeader({ event, isAdmin, finalDate }: EventHeaderProps) {
  const [copied, setCopied] = useState(false);

  // 現在のURLをコピーする
  const copyEventLink = () => {
    navigator.clipboard.writeText(window.location.href).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      (err) => console.error('URLのコピーに失敗しました', err)
    );
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-start mb-2">
        <h1 className="text-3xl font-bold">{event.title}</h1>
        <button 
          className="btn btn-sm btn-outline"
          onClick={copyEventLink}
        >
          {copied ? '✓ コピー完了' : '共有リンクをコピー'}
        </button>
      </div>
      
      {event.description && (
        <p className="text-gray-600 mb-4 whitespace-pre-line">{event.description}</p>
      )}
      
      {isAdmin && !event.is_finalized && (
        <div className="alert alert-info text-sm mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>
            管理者として閲覧中です。十分な回答が集まったら、下部の「この日程で確定」ボタンを押して日程を確定できます。
          </span>
        </div>
      )}
    </div>
  );
}