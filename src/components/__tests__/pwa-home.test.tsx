// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PwaHomePage from '@/app/home/page';

const FavoriteEventsMock = () => <div>お気に入りイベント一覧Mock</div>;
FavoriteEventsMock.displayName = 'FavoriteEventsMock';
const EventHistoryMock = () => <div>最近アクセスMock</div>;
EventHistoryMock.displayName = 'EventHistoryMock';
const AddToHomeScreenMock = () => <div>PWAバナーMock</div>;
AddToHomeScreenMock.displayName = 'AddToHomeScreenMock';

jest.mock('@/components/favorite-events', () => {
  const Mock = () => <div>お気に入りイベント一覧Mock</div>;
  Mock.displayName = 'FavoriteEventsMock';
  return Mock;
});
jest.mock('@/components/event-history', () => {
  const Mock = () => <div>最近アクセスMock</div>;
  Mock.displayName = 'EventHistoryMock';
  return Mock;
});
jest.mock('@/components/add-to-home-screen', () => {
  const Mock = () => <div>PWAバナーMock</div>;
  Mock.displayName = 'AddToHomeScreenMock';
  return Mock;
});

// siteConfigのモック
jest.mock('@/lib/site-config', () => ({
  name: { full: 'テストサービス', tagline: 'テストキャッチフレーズ' },
}));

describe('PwaHomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('サービス名・キャッチフレーズが表示される', () => {
    render(<PwaHomePage />);
    expect(screen.getByText('テストサービス')).toBeInTheDocument();
    expect(screen.getByText('テストキャッチフレーズ')).toBeInTheDocument();
  });

  it('新規イベント作成ボタンが表示され、/createに遷移する', () => {
    render(<PwaHomePage />);
    const btn = screen.getByRole('link', { name: /新しいイベントを作成する/ });
    expect(btn).toHaveAttribute('href', '/create');
  });

  it('お気に入りイベント一覧が表示される', () => {
    render(<PwaHomePage />);
    expect(screen.getByText('お気に入りイベント一覧Mock')).toBeInTheDocument();
  });

  it('最近アクセスイベント一覧が表示される', () => {
    render(<PwaHomePage />);
    expect(screen.getByText('最近アクセスMock')).toBeInTheDocument();
  });

  it('イベントURL/IDから開くフォームのバリデーション（空欄・不正値・正しいID/URL）', () => {
    render(<PwaHomePage />);
    const input = screen.getByLabelText(/イベントURLまたはID/);
    const button = screen.getByRole('button', { name: /開く/ });
    // 空欄
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(button);
    expect(screen.getByText(/URLまたはIDを入力してください/)).toBeInTheDocument();
    // 不正値
    fireEvent.change(input, { target: { value: 'abc' } });
    fireEvent.click(button);
    expect(screen.getByText(/有効なイベントIDまたはURLを入力してください/)).toBeInTheDocument();
    // 正しいID
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    });
    fireEvent.change(input, { target: { value: 'abcdefgh' } });
    fireEvent.click(button);
    expect(window.location.href).toBe('/event/abcdefgh');
    // 正しいURL
    fireEvent.change(input, {
      target: { value: 'https://example.com/event/ijklmnop' },
    });
    fireEvent.click(button);
    expect(window.location.href).toBe('/event/ijklmnop');
    // 後始末
    Object.defineProperty(window, 'location', { value: originalLocation });
  });
});
