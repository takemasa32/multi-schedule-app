'use client';

import { useState } from 'react';

interface EventOpenFormProps {
  title?: string;
  description?: string;
}

/**
 * イベントURL/IDから開くフォーム
 * @param {EventOpenFormProps} props 表示文言のオプション
 * @returns {JSX.Element} フォームUI
 */
export default function EventOpenForm({
  title = 'イベントURL/IDから開く',
  description = 'イベントのURLまたはIDを入力すると、該当イベントページをすぐに開けます。',
}: EventOpenFormProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleOpenEvent = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const value = input.trim();
    if (!value) {
      setError('URLまたはIDを入力してください');
      return;
    }
    let id = value;
    try {
      const url = new URL(value);
      const match = url.pathname.match(/\/event\/([\w-]+)/);
      if (match) id = match[1];
    } catch {
      // 入力がURLでなければそのままIDとして扱う
    }
    if (!id.match(/^[\w-]{8,}$/)) {
      setError('有効なイベントIDまたはURLを入力してください');
      return;
    }
    window.location.assign(`/event/${id}`);
  };

  return (
    <section className="mt-2">
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleOpenEvent}>
        <input
          type="text"
          className="input input-bordered flex-1"
          placeholder="イベントURLまたはIDを入力"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="イベントURLまたはID"
        />
        <button type="submit" className="btn btn-secondary">
          開く
        </button>
      </form>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
      {error && <p className="text-error mt-1 text-sm">{error}</p>}
    </section>
  );
}
