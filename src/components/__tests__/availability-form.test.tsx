// --- JSDOMのrequestSubmit未実装対策（テスト安定化のため最上部で必ず定義）
if (!window.HTMLFormElement.prototype.requestSubmit) {
  window.HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AvailabilityForm from '../availability-form';

jest.mock('@/lib/actions', () => ({
  submitAvailability: jest.fn(),
  checkParticipantExists: jest.fn(),
}));
import { submitAvailability, checkParticipantExists } from '@/lib/actions';

beforeAll(() => {
  (checkParticipantExists as jest.Mock).mockResolvedValue({ exists: false });
  // window.location.hrefのモック
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { href: '' },
  });
});

afterAll(() => {
  // locationのモックをリセット
  // @ts-expect-error テスト用リセット
  delete window.location;
});

describe('AvailabilityForm', () => {
  const eventDates = [
    {
      id: 'date1',
      start_time: '2025-05-10T10:00:00.000Z',
      end_time: '2025-05-10T11:00:00.000Z',
      label: '午前枠',
    },
    {
      id: 'date2',
      start_time: '2025-05-11T15:00:00.000Z',
      end_time: '2025-05-11T16:00:00.000Z',
      label: '午後枠',
    },
  ];
  const defaultProps = {
    eventId: 'event1',
    publicToken: 'token1',
    eventDates,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('名前未入力時はバリデーションエラーを表示する', async () => {
    render(<AvailabilityForm {...defaultProps} />);
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole('button', { name: /回答を送信/ }));
    const alert = await screen.findByRole('alert');
    await waitFor(() => {
      expect(alert).toHaveTextContent('お名前を入力してください');
    });
  });

  it('利用規約未同意時はバリデーションエラーを表示する', async () => {
    render(<AvailabilityForm {...defaultProps} />);
    // 名前入力
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: 'テスト太郎' },
    });
    // 送信
    fireEvent.click(screen.getByRole('button', { name: /回答を送信/ }));
    // エラー領域を取得し、文言を検証
    const alert = await screen.findByRole('alert');
    await waitFor(() => {
      expect(alert).toHaveTextContent('利用規約への同意が必要です');
    });
  });

  it('正常入力時にsubmitAvailabilityが呼ばれる', async () => {
    (submitAvailability as jest.Mock).mockResolvedValue({ success: true });
    render(<AvailabilityForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: 'テスト太郎' },
    });
    fireEvent.change(screen.getByLabelText(/コメント・メモ/), {
      target: { value: 'テストコメント' },
    });
    fireEvent.click(screen.getByLabelText(/利用規約/));
    // 1つ目の日程を○にする
    const firstCell = screen.getAllByText('×')[0];
    fireEvent.pointerDown(firstCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(firstCell, { pointerId: 1, pointerType: 'mouse' });
    // 送信
    fireEvent.click(screen.getByRole('button', { name: /回答を送信/ }));
    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
    });
    const formDataArg = (submitAvailability as jest.Mock).mock.calls[0][0] as FormData;
    expect(formDataArg.get('comment')).toBe('テストコメント');
  });

  it('サーバーエラー時はエラーメッセージを表示する', async () => {
    (submitAvailability as jest.Mock).mockResolvedValue({
      success: false,
      message: 'サーバーエラー',
    });
    render(<AvailabilityForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: 'テスト太郎' },
    });
    fireEvent.click(screen.getByLabelText(/利用規約/));
    // 1つ目の日程を○にする
    const firstCell = screen.getAllByText('×')[0];
    fireEvent.pointerDown(firstCell, { pointerId: 2, pointerType: 'mouse' });
    fireEvent.pointerUp(firstCell, { pointerId: 2, pointerType: 'mouse' });
    // 送信
    fireEvent.click(screen.getByRole('button', { name: /回答を送信/ }));
    expect(await screen.findByText(/サーバーエラー/)).toBeInTheDocument();
  });

  it('ドラッグで通過していないセルは変更されない', async () => {
    const extendedDates = [
      {
        id: 'date1',
        start_time: '2025-06-10T10:00:00.000Z',
        end_time: '2025-06-10T11:00:00.000Z',
        label: '午前枠1',
      },
      {
        id: 'date2',
        start_time: '2025-06-11T10:00:00.000Z',
        end_time: '2025-06-11T11:00:00.000Z',
        label: '午前枠2',
      },
      {
        id: 'date3',
        start_time: '2025-06-12T10:00:00.000Z',
        end_time: '2025-06-12T11:00:00.000Z',
        label: '午前枠3',
      },
    ];

    const { container } = render(<AvailabilityForm {...defaultProps} eventDates={extendedDates} />);

    const cell1 = container.querySelector<HTMLElement>('[data-selection-key="date1"]');
    const cell2 = container.querySelector<HTMLElement>('[data-selection-key="date2"]');
    const cell3 = container.querySelector<HTMLElement>('[data-selection-key="date3"]');

    if (!cell1 || !cell2 || !cell3) {
      throw new Error('対象セルが見つかりません');
    }

    expect(cell1.textContent).toBe('×');
    expect(cell2.textContent).toBe('×');
    expect(cell3.textContent).toBe('×');

    fireEvent.pointerDown(cell1, { pointerId: 5, pointerType: 'mouse' });
    fireEvent.pointerEnter(cell3, { pointerId: 5, pointerType: 'mouse', buttons: 1 });
    fireEvent.pointerUp(cell3, { pointerId: 5, pointerType: 'mouse' });

    await waitFor(() => {
      expect(cell1.textContent).toBe('○');
      expect(cell2.textContent).toBe('×');
      expect(cell3.textContent).toBe('○');
    });
  });

  it('判定外からドラッグしても通過セルが反転する', async () => {
    const extendedDates = [
      {
        id: 'date1',
        start_time: '2025-07-01T10:00:00.000Z',
        end_time: '2025-07-01T11:00:00.000Z',
        label: '午前枠1',
      },
      {
        id: 'date2',
        start_time: '2025-07-02T10:00:00.000Z',
        end_time: '2025-07-02T11:00:00.000Z',
        label: '午前枠2',
      },
    ];

    const { container } = render(
      <AvailabilityForm {...defaultProps} eventDates={extendedDates} />,
    );

    const cell1 = container.querySelector<HTMLElement>('[data-selection-key="date1"]');
    const cell2 = container.querySelector<HTMLElement>('[data-selection-key="date2"]');

    if (!cell1 || !cell2) {
      throw new Error('対象セルが見つかりません');
    }

    expect(cell1.textContent).toBe('×');
    expect(cell2.textContent).toBe('×');

    const createPointerEvent = (type: string, options: MouseEventInit & { pointerId?: number }) => {
      const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...options });
      if (options.pointerId !== undefined) {
        Object.defineProperty(event, 'pointerId', { value: options.pointerId });
      }
      return event;
    };

    const originalElementFromPoint = document.elementFromPoint;
    const elementFromPointMock = jest.fn(() => cell1 as unknown as Element);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: elementFromPointMock,
    });

    try {
      window.dispatchEvent(createPointerEvent('pointermove', { buttons: 1, pointerId: 21 }));
      await waitFor(() => {
        expect(cell1.textContent).toBe('○');
      });

      elementFromPointMock.mockReturnValue(cell2 as unknown as Element);
      window.dispatchEvent(createPointerEvent('pointermove', { buttons: 1, pointerId: 21 }));
      await waitFor(() => {
        expect(cell2.textContent).toBe('○');
      });

      window.dispatchEvent(createPointerEvent('pointerup', { pointerId: 21 }));
    } finally {
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: originalElementFromPoint,
      });
    }
  });
});
