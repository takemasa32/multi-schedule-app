// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventFormClient from '../event-form-client';

// useRouterのモックを追加
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    refresh: jest.fn(),
  }),
}));

// createEvent をモック
jest.mock('@/lib/actions', () => ({
  createEvent: jest.fn(),
}));
import { createEvent } from '@/lib/actions';

describe('EventFormClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('タイトル未入力時はバリデーションエラーを表示する', async () => {
    render(<EventFormClient />);
    fireEvent.click(screen.getByTestId('create-next'));
    const errors = await screen.findAllByText(/タイトルは必須です/);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('入力方式未選択時はバリデーションエラーを表示する', async () => {
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: 'テストイベント' },
    });
    fireEvent.click(screen.getByTestId('create-next'));
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
    expect(await screen.findByText(/入力方式を選択してください/)).toBeInTheDocument();
  });

  it('候補日程未設定時はバリデーションエラーを表示する', async () => {
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: 'テストイベント' },
    });
    fireEvent.click(screen.getByTestId('create-next'));
    fireEvent.click(screen.getByTestId('input-mode-auto'));
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
    const errors = await screen.findAllByText(/少なくとも1つの時間枠を設定してください/);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('利用規約未同意時はバリデーションエラーを表示する', async () => {
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: 'テストイベント' },
    });
    fireEvent.click(screen.getByTestId('create-next'));
    fireEvent.click(screen.getByTestId('input-mode-auto'));
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));

    const startDateInputs = screen.getAllByLabelText(/開始日/);
    const startDateInput = startDateInputs.find(
      (el) => el.tagName === 'INPUT' && el.getAttribute('type') === 'date',
    );
    const endDateInputs = screen.getAllByLabelText(/終了日/);
    const endDateInput = endDateInputs.find(
      (el) => el.tagName === 'INPUT' && el.getAttribute('type') === 'date',
    );
    fireEvent.change(startDateInput!, { target: { value: '2099-01-01' } });
    fireEvent.change(endDateInput!, { target: { value: '2099-01-01' } });

    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
    fireEvent.click(screen.getByRole('button', { name: /イベントを作成/ }));
    expect(await screen.findByText(/利用規約への同意が必要です/)).toBeInTheDocument();
  });

  it('正常入力時にcreateEventが呼ばれる', async () => {
    (createEvent as jest.Mock).mockResolvedValue({
      success: true,
      publicToken: 'testtoken',
      adminToken: '123e4567-e89b-12d3-a456-426614174001',
      redirectUrl: '/event/testtoken',
    });
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: 'テストイベント' },
    });
    fireEvent.click(screen.getByTestId('create-next'));
    fireEvent.click(screen.getByTestId('input-mode-auto'));
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));

    const startDateInputs = screen.getAllByLabelText(/開始日/);
    const startDateInput = startDateInputs.find(
      (el) => el.tagName === 'INPUT' && el.getAttribute('type') === 'date',
    );
    const endDateInputs = screen.getAllByLabelText(/終了日/);
    const endDateInput = endDateInputs.find(
      (el) => el.tagName === 'INPUT' && el.getAttribute('type') === 'date',
    );
    fireEvent.change(startDateInput!, { target: { value: '2099-01-01' } });
    fireEvent.change(endDateInput!, { target: { value: '2099-01-01' } });

    const startTimeInput = screen.getAllByLabelText(/各日の開始時刻/)[0] as HTMLInputElement;
    const endTimeInput = screen.getAllByLabelText(/各日の終了時刻/)[0] as HTMLInputElement;
    expect(startTimeInput.value).toBe('08:00');
    expect(endTimeInput.value).toBe('18:00');
    fireEvent.change(startTimeInput, { target: { value: '09:00' } });
    fireEvent.change(endTimeInput, { target: { value: '10:00' } });

    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole('button', { name: /イベントを作成/ }));
    await waitFor(() => {
      expect(createEvent).toHaveBeenCalled();
    });
  });

  it('確認から戻っても手動選択が保持される', async () => {
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: 'テストイベント' },
    });
    fireEvent.click(screen.getByTestId('create-next'));
    fireEvent.click(screen.getByTestId('input-mode-manual'));
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));

    const startDateInputs = screen.getAllByLabelText(/開始日/);
    const startDateInput = startDateInputs.find(
      (el) => el.tagName === 'INPUT' && el.getAttribute('type') === 'date',
    );
    const endDateInputs = screen.getAllByLabelText(/終了日/);
    const endDateInput = endDateInputs.find(
      (el) => el.tagName === 'INPUT' && el.getAttribute('type') === 'date',
    );
    fireEvent.change(startDateInput!, { target: { value: '2099-01-01' } });
    fireEvent.change(endDateInput!, { target: { value: '2099-01-01' } });

    fireEvent.change(screen.getAllByLabelText(/各日の開始時刻/)[0], {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getAllByLabelText(/各日の終了時刻/)[0], {
      target: { value: '10:00' },
    });

    fireEvent.click(screen.getByRole('button', { name: /カレンダーへ/ }));

    const cell = await screen.findByTestId('slot-cell');
    fireEvent.pointerDown(cell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(cell, { pointerId: 1, pointerType: 'mouse' });

    await waitFor(() => {
      expect(cell).toHaveAttribute('aria-label', '選択済み');
    });

    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
    fireEvent.click(await screen.findByRole('button', { name: /戻る/ }));

    const cellAfter = await screen.findByTestId('slot-cell');
    await waitFor(() => {
      expect(cellAfter).toHaveAttribute('aria-label', '選択済み');
    });
  });

  it.skip('サーバーエラー時はエラーメッセージを表示する', async () => {
    (createEvent as jest.Mock).mockResolvedValue({
      success: false,
      message: 'サーバーエラー',
    });
    render(<EventFormClient />);
    fireEvent.change(screen.getByLabelText(/イベントタイトル/), {
      target: { value: 'テストイベント' },
    });
    fireEvent.click(screen.getByTestId('create-next'));
    fireEvent.click(screen.getByTestId('input-mode-auto'));
    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));

    const startDateInput = screen.getAllByLabelText(/開始日/)[0] as HTMLInputElement;
    const endDateInput = screen.getAllByLabelText(/終了日/)[0] as HTMLInputElement;
    fireEvent.change(startDateInput, { target: { value: '2099-01-01' } });
    fireEvent.change(endDateInput, { target: { value: '2099-01-01' } });

    const startTimeInput = screen.getAllByLabelText(/各日の開始時刻/)[0] as HTMLInputElement;
    const endTimeInput = screen.getAllByLabelText(/各日の終了時刻/)[0] as HTMLInputElement;
    expect(startTimeInput.value).toBe('08:00');
    expect(endTimeInput.value).toBe('18:00');
    fireEvent.change(startTimeInput, { target: { value: '09:00' } });
    fireEvent.change(endTimeInput, { target: { value: '10:00' } });

    fireEvent.click(screen.getByRole('button', { name: /次へ/ }));
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole('button', { name: /イベントを作成/ }));
    await waitFor(() => {
      expect(screen.queryByText(/少なくとも1つの時間枠を設定してください/)).not.toBeInTheDocument();
    });
    const errors = await screen.findAllByText(/サーバーエラー/);
    expect(errors.length).toBeGreaterThan(0);
  });
});
