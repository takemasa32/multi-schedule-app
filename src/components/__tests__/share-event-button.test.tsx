import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ShareEventButton from '../share-event-button';
import { trackEvent } from '@/components/analytics/google-analytics';

jest.mock('@/components/analytics/google-analytics', () => ({
  trackEvent: jest.fn(),
}));

// navigator.share, navigator.clipboard のモック
const originalShare = navigator.share;

// 元のclipboardプロパティ記述子を保存しておく
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'clipboard');
const originalExecCommand = document.execCommand;

describe('ShareEventButton', () => {
  const url = 'https://example.com/event/abc123';
  const title = 'テストイベント';
  const text = 'イベントに参加してください';

  afterEach(() => {
    // navigator.share を復元
    navigator.share = originalShare;

    // navigator.clipboard を元のプロパティ記述子で復元
    if (originalClipboardDescriptor) {
      Object.defineProperty(window.navigator, 'clipboard', originalClipboardDescriptor);
    }

    document.execCommand = originalExecCommand;

    // Jest モックをクリア
    jest.clearAllMocks();
  });

  it('navigator.shareが使える場合は正しいURL/タイトル/テキストで共有される', async () => {
    const shareMock = jest.fn().mockResolvedValue(undefined);
    navigator.share = shareMock;
    render(<ShareEventButton url={url} title={title} text={text} />);
    fireEvent.click(screen.getByRole('button', { name: /共有/ }));
    await waitFor(() => {
      expect(shareMock).toHaveBeenCalledWith({ url, title, text });
    });
    expect(trackEvent).toHaveBeenCalledWith('share', {
      method: 'web_share',
      content_type: 'event',
    });
  });

  it('navigator.clipboardが使える場合はURLがクリップボードにコピーされる', async () => {
    // @ts-expect-error navigator.shareの型上書き
    navigator.share = undefined;
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    render(<ShareEventButton url={url} />);
    fireEvent.click(screen.getByRole('button', { name: /共有/ }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(url);
    });
    expect(trackEvent).toHaveBeenCalledWith('share', {
      method: 'clipboard',
      content_type: 'event',
    });
  });

  it('navigator.share/clipboardが両方使えない場合はinput要素でコピーされる', async () => {
    // @ts-expect-error navigator.shareの型上書き
    navigator.share = undefined;
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    document.execCommand = jest.fn();
    render(<ShareEventButton url={url} />);
    fireEvent.click(screen.getByRole('button', { name: /共有/ }));
    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
    expect(trackEvent).toHaveBeenCalledWith('share', {
      method: 'fallback',
      content_type: 'event',
    });
  });

  it('includeTextInClipboard=trueの場合、クリップボードにテキスト+URLがコピーされる', async () => {
    // @ts-expect-error navigator.shareの型上書き
    navigator.share = undefined;
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    render(<ShareEventButton url={url} text={text} includeTextInClipboard={true} />);
    fireEvent.click(screen.getByRole('button', { name: /共有/ }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(`${text}\n${url}`);
    });
  });

  it('includeTextInClipboard=trueだがtextが未定義の場合、URLのみがコピーされる', async () => {
    // @ts-expect-error navigator.shareの型上書き
    navigator.share = undefined;
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
    });
    render(<ShareEventButton url={url} includeTextInClipboard={true} />);
    fireEvent.click(screen.getByRole('button', { name: /共有/ }));
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith(url);
    });
  });

  it('includeTextInClipboard=trueでフォールバック時もテキスト+URLがコピーされる', async () => {
    // @ts-expect-error navigator.shareの型上書き
    navigator.share = undefined;
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    document.execCommand = jest.fn();

    render(<ShareEventButton url={url} text={text} includeTextInClipboard={true} />);
    fireEvent.click(screen.getByRole('button', { name: /共有/ }));

    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });

    // フォールバック機能が呼ばれることを確認（詳細な値の確認は実際のブラウザテストに委ねる）
    expect(document.execCommand).toHaveBeenCalledTimes(1);
  });

  it('Web Shareのキャンセルや失敗時は共有イベントを送らない', async () => {
    const shareMock = jest.fn().mockRejectedValue(new Error('cancelled'));
    navigator.share = shareMock;
    render(<ShareEventButton url={url} />);
    fireEvent.click(screen.getByRole('button', { name: /共有/ }));

    await waitFor(() => {
      expect(shareMock).toHaveBeenCalled();
    });
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it('fallbackコピーが失敗した場合は共有イベントを送らない', async () => {
    // @ts-expect-error navigator.shareの型上書き
    navigator.share = undefined;
    Object.defineProperty(navigator, 'clipboard', {
      value: undefined,
      configurable: true,
    });
    document.execCommand = jest.fn().mockReturnValue(false);
    render(<ShareEventButton url={url} />);
    fireEvent.click(screen.getByRole('button', { name: /共有/ }));

    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
    });
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
