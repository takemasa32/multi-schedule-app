import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EventOpenForm from '@/components/event-open-form';

// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

describe('EventOpenForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('タイトルと説明文が表示される', () => {
    render(<EventOpenForm />);
    expect(screen.getByText('イベントURL/IDから開く')).toBeInTheDocument();
    expect(
      screen.getByText('イベントのURLまたはIDを入力すると、該当イベントページをすぐに開けます。'),
    ).toBeInTheDocument();
  });

  it('イベントURL/IDから開くフォームのバリデーション（空欄・不正値・正しいID/URL）', () => {
    render(<EventOpenForm />);
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

    Object.defineProperty(window, 'location', { value: originalLocation });
  });
});
