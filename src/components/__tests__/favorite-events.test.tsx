/**
 * @file お気に入りイベント機能のユニットテスト雛形
 * @see src/components/favorite-events-context.tsx
 */

// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FavoriteEventsProvider } from '../favorite-events-context';
import FavoriteEvents from '../favorite-events';
import FavoriteToggle from '../favorite-toggle';

// テスト用イベントデータ
const TEST_EVENT = { id: 'test-1234', title: 'テストイベント' };

describe('お気に入りイベント機能', () => {
  it('お気に入り追加・削除が一覧に即時反映される', async () => {
    render(
      <FavoriteEventsProvider>
        <FavoriteToggle eventId={TEST_EVENT.id} title={TEST_EVENT.title} />
        <FavoriteEvents />
      </FavoriteEventsProvider>,
    );
    // 初期同期後: お気に入りなし
    expect(await screen.findByText('お気に入りイベントはありません。')).toBeInTheDocument();
    // 追加
    fireEvent.click(screen.getByRole('button', { name: 'お気に入り登録' }));
    expect(screen.getByText(TEST_EVENT.title)).toBeInTheDocument();
    // 解除（「お気に入り解除」ボタンをクリック）
    fireEvent.click(screen.getByRole('button', { name: 'お気に入り解除' }));
    expect(await screen.findByText('お気に入りイベントはありません。')).toBeInTheDocument();
  });
});
