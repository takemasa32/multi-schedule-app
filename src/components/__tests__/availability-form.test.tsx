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
  linkMyParticipantAnswerByName: jest.fn(),
}));
jest.mock('@/lib/schedule-actions', () => ({
  upsertWeeklyTemplatesFromWeekdaySelections: jest.fn(),
  fetchUserScheduleTemplates: jest.fn(),
}));
import {
  submitAvailability,
  checkParticipantExists,
  linkMyParticipantAnswerByName,
} from '@/lib/actions';
import { upsertWeeklyTemplatesFromWeekdaySelections } from '@/lib/schedule-actions';
import { fetchUserScheduleTemplates } from '@/lib/schedule-actions';

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

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: 'テスト太郎' },
    });
    fireEvent.click(screen.getByLabelText(/利用規約/));
    const firstCell = screen.getAllByText('×')[0];
    fireEvent.pointerDown(firstCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(firstCell, { pointerId: 1, pointerType: 'mouse' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (upsertWeeklyTemplatesFromWeekdaySelections as jest.Mock).mockResolvedValue({
      success: true,
      updatedCount: 1,
    });
    (fetchUserScheduleTemplates as jest.Mock).mockResolvedValue({
      manual: [],
      learned: [],
    });
    (linkMyParticipantAnswerByName as jest.Mock).mockResolvedValue({
      success: false,
      status: 'not_found',
      message: 'この名前の既存回答は見つかりませんでした',
    });
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

  it('ログイン済みでも同期対象イベントがない場合は同期範囲モーダルを表示しない', async () => {
    (submitAvailability as jest.Mock).mockResolvedValue({ success: true });
    render(<AvailabilityForm {...defaultProps} isAuthenticated hasSyncTargetEvents={false} />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /回答を送信/ }));

    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
    });
    expect(screen.queryByText('変更の反映範囲')).not.toBeInTheDocument();
  });

  it('ログイン済みで同期対象イベントがある場合は同期範囲モーダルを表示する', async () => {
    (submitAvailability as jest.Mock).mockResolvedValue({ success: true });
    render(<AvailabilityForm {...defaultProps} isAuthenticated hasSyncTargetEvents />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole('button', { name: /回答を送信/ }));

    expect(await screen.findByText('変更の反映範囲')).toBeInTheDocument();
    expect(submitAvailability).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'このイベントのみ' }));
    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
    });
  });

  it('ログイン済み新規回答では既存回答の紐づけ導線を表示し、検索を実行できる', async () => {
    render(<AvailabilityForm {...defaultProps} isAuthenticated mode="new" />);

    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: 'テスト太郎' },
    });

    fireEvent.click(screen.getByRole('button', { name: '既存回答を探して紐づける' }));

    await waitFor(() => {
      expect(linkMyParticipantAnswerByName).toHaveBeenCalledWith({
        eventId: 'event1',
        participantName: 'テスト太郎',
      });
    });
  });

  it('新規回答時は過去の予定から反映モーダルを表示し、反映を適用できる', async () => {
    const { container } = render(
      <AvailabilityForm
        {...defaultProps}
        isAuthenticated
        mode="new"
        autoFillAvailabilities={{ date1: true, date2: false }}
      />,
    );

    expect(await screen.findByText('過去の予定から反映しますか？')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '反映する（推奨）' }));

    await waitFor(() => {
      expect(screen.queryByText('過去の予定から反映しますか？')).not.toBeInTheDocument();
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="availability_date1"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector<HTMLInputElement>('input[name="availability_date2"]'),
    ).not.toBeInTheDocument();
  });

  it('過去の予定から反映モーダルでスキップを選ぶと初期状態を維持する', async () => {
    const { container } = render(
      <AvailabilityForm
        {...defaultProps}
        isAuthenticated
        mode="new"
        autoFillAvailabilities={{ date1: true, date2: true }}
      />,
    );

    expect(await screen.findByText('過去の予定から反映しますか？')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'まっさらで始める' }));

    await waitFor(() => {
      expect(screen.queryByText('過去の予定から反映しますか？')).not.toBeInTheDocument();
    });

    expect(
      container.querySelector<HTMLInputElement>('input[name="availability_date1"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector<HTMLInputElement>('input[name="availability_date2"]'),
    ).not.toBeInTheDocument();
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

    const { container } = render(<AvailabilityForm {...defaultProps} eventDates={extendedDates} />);

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

  it('曜日ごとの設定適用時に保存オプションを選ぶと週次テンプレ更新を呼び出す', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        isAuthenticated
        initialAvailabilities={{
          date1: true,
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /曜日ごとの時間帯設定/ }));
    fireEvent.click(screen.getByRole('button', { name: '設定を適用する' }));

    expect(await screen.findByText('適用方法を選択してください')).toBeInTheDocument();
    const applyButton = await screen.findByRole('button', { name: /ユーザ設定.*適用/ });
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(upsertWeeklyTemplatesFromWeekdaySelections).toHaveBeenCalled();
    });
  });

  it('ログイン中に曜日設定を開くと週テンプレを曜日マトリクスへ反映する', async () => {
    const templateDates = [
      {
        id: 'mon-1',
        start_time: '2025-05-12T09:00:00.000Z',
        end_time: '2025-05-12T10:00:00.000Z',
      },
      {
        id: 'tue-1',
        start_time: '2025-05-13T09:00:00.000Z',
        end_time: '2025-05-13T10:00:00.000Z',
      },
    ];
    const toTimeParts = (startIso: string, endIso: string) => {
      const start = new Date(startIso);
      const end = new Date(endIso);
      const pad = (value: number) => String(value).padStart(2, '0');
      return {
        startTime: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
        endTime: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
      };
    };
    const { startTime, endTime } = toTimeParts(templateDates[0].start_time, templateDates[0].end_time);

    (fetchUserScheduleTemplates as jest.Mock).mockResolvedValue({
      manual: [
        {
          id: 'tpl-mon',
          weekday: 1,
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
          availability: true,
          source: 'manual',
          sample_count: 1,
        },
      ],
      learned: [],
    });

    const { container } = render(
      <AvailabilityForm {...defaultProps} eventDates={templateDates} isAuthenticated />,
    );

    fireEvent.click(screen.getByRole('button', { name: /曜日ごとの時間帯設定/ }));

    await waitFor(() => {
      expect(fetchUserScheduleTemplates).toHaveBeenCalled();
    });
    const timeKey = `${startTime}-${endTime}`;
    const monCell = container.querySelector<HTMLElement>(
      `[data-day="月"][data-time-slot="${timeKey}"]`,
    );
    const tueCell = container.querySelector<HTMLElement>(
      `[data-day="火"][data-time-slot="${timeKey}"]`,
    );

    expect(monCell?.textContent).toContain('○');
    expect(tueCell?.textContent).toContain('×');
  });

  it('未ログイン時は曜日設定の確認モーダルを表示せずに今回のみ適用する', async () => {
    render(<AvailabilityForm {...defaultProps} isAuthenticated={false} />);

    fireEvent.click(screen.getByRole('button', { name: /曜日ごとの時間帯設定/ }));
    fireEvent.click(screen.getByRole('button', { name: '設定を適用する' }));

    await waitFor(() => {
      expect(screen.queryByText('適用方法を選択してください')).not.toBeInTheDocument();
    });
    expect(fetchUserScheduleTemplates).not.toHaveBeenCalled();
    expect(upsertWeeklyTemplatesFromWeekdaySelections).not.toHaveBeenCalled();
  });
});
