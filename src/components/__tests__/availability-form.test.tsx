if (!window.HTMLFormElement.prototype.requestSubmit) {
  window.HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import AvailabilityForm from '../availability-form';

jest.mock('@/lib/actions', () => ({
  submitAvailability: jest.fn(),
  checkParticipantExists: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

import { submitAvailability, checkParticipantExists } from '@/lib/actions';

describe('AvailabilityForm', () => {
  const eventDates = [
    {
      id: 'date1',
      start_time: '2025-05-12T09:00:00.000Z',
      end_time: '2025-05-12T10:00:00.000Z',
      label: '午前枠',
    },
    {
      id: 'date2',
      start_time: '2025-05-13T09:00:00.000Z',
      end_time: '2025-05-13T10:00:00.000Z',
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
    Object.defineProperty(window, 'scrollTo', {
      value: jest.fn(),
      writable: true,
      configurable: true,
    });
    localStorage.clear();
    (checkParticipantExists as jest.Mock).mockResolvedValue({ exists: false });
    (submitAvailability as jest.Mock).mockResolvedValue({ success: true });
  });

  const goToWeeklyStepAsGuest = () => {
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: 'テスト太郎' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ログインせずに進む' }));
    fireEvent.click(screen.getByRole('button', { name: 'ログインせず回答' }));
  };

  const applyWeeklyAndGoHeatmap = async () => {
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
  };

  it('新規回答は4ステップ遷移できる', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);

    expect(screen.getByTestId('availability-step-1')).toBeInTheDocument();
    goToWeeklyStepAsGuest();
    expect(screen.getByTestId('availability-step-weekly')).toBeInTheDocument();

    await applyWeeklyAndGoHeatmap();
    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();

    const heatmapCell = document.querySelector<HTMLElement>('[data-selection-key="date1"]');
    if (!heatmapCell) throw new Error('ヒートマップセルが見つかりません');
    fireEvent.pointerDown(heatmapCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(heatmapCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));

    expect(screen.getByTestId('availability-step-confirm')).toBeInTheDocument();
  });

  it('確認画面への遷移時に回答ウィザード見出しまでスクロールする', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);

    goToWeeklyStepAsGuest();
    await applyWeeklyAndGoHeatmap();

    const heatmapCell = document.querySelector<HTMLElement>('[data-selection-key="date1"]');
    if (!heatmapCell) throw new Error('ヒートマップセルが見つかりません');
    fireEvent.pointerDown(heatmapCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(heatmapCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));

    expect(await screen.findByTestId('availability-step-confirm')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
  });

  it('ドラッグ中に再描画されても最初のセルの選択意図を維持する', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated={false}
        initialAvailabilities={{ date1: false, date2: true }}
      />,
    );

    goToWeeklyStepAsGuest();
    await applyWeeklyAndGoHeatmap();

    const cell1 = document.querySelector<HTMLElement>('[data-selection-key="date1"]');
    const cell2 = document.querySelector<HTMLElement>('[data-selection-key="date2"]');
    if (!cell1 || !cell2) {
      throw new Error('ヒートマップセルが見つかりません');
    }

    expect(cell1).toHaveTextContent('×');
    expect(cell2).toHaveTextContent('○');

    fireEvent.pointerDown(cell1, { buttons: 1, pointerId: 11, pointerType: 'mouse' });
    await waitFor(() => {
      expect(cell1).toHaveTextContent('○');
    });

    fireEvent.pointerEnter(cell2, { buttons: 1, pointerId: 11, pointerType: 'mouse' });
    fireEvent.pointerUp(cell2, { pointerId: 11, pointerType: 'mouse' });

    await waitFor(() => {
      expect(cell1).toHaveTextContent('○');
      expect(cell2).toHaveTextContent('○');
    });
    expect(
      document.querySelector<HTMLInputElement>('input[name="availability_date2"]'),
    ).toBeInTheDocument();
  });

  it('未ログイン導線の文言を表示する', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);
    expect(screen.getByRole('button', { name: 'ログインして進む' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログインせずに進む' })).toBeInTheDocument();
  });

  it('未ログインで進むと確認ダイアログにログイン導線を表示する', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: 'テスト太郎' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ログインせずに進む' }));

    expect(screen.getByText('ログイン方法を選択してください')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログインして回答' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログインせず回答' })).toBeInTheDocument();
  });

  it('ログイン済みで再描画するとステップ1を再評価表示する', () => {
    const { rerender } = render(
      <AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />,
    );
    goToWeeklyStepAsGuest();
    expect(screen.getByTestId('availability-step-weekly')).toBeInTheDocument();

    rerender(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated />);
    expect(screen.getByTestId('availability-step-1')).toBeInTheDocument();
    expect(screen.getByText('まずは名前を入力してください。')).toBeInTheDocument();
  });

  it('ログイン済みかつ未充足日が0日の場合はStep2を表示しない', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated uncoveredDayCount={0} />);
    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.queryByTestId('availability-step-weekly')).not.toBeInTheDocument();
    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
  });

  it('曜日一括入力はスキップして次へ進める', () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated={false}
        requireWeeklyStep
        uncoveredDayCount={7}
      />,
    );
    goToWeeklyStepAsGuest();
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
  });

  it('未ログイン時の曜日一括入力では入力案内文言を表示する', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);
    goToWeeklyStepAsGuest();
    expect(screen.getByText('各曜日の予定を入力してください。')).toBeInTheDocument();
  });

  it('ログイン済みかつ長い未入力期間がある場合は一時的な曜日入力案内を表示する', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated requireWeeklyStep />);

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(
      await screen.findByText(
        '日付ごとのアカウント予定で補えない期間が長いため、曜日ごとにまとめて入力してください。ここでの入力はこの回答だけに反映されます。',
      ),
    ).toBeInTheDocument();
  });

  it('曜日一括入力で時間区切りの最下段に終了時刻を表示する', () => {
    const multiSlotEventDates = [
      {
        id: 'date1',
        start_time: '2025-05-12T09:00:00.000Z',
        end_time: '2025-05-12T10:00:00.000Z',
      },
      {
        id: 'date2',
        start_time: '2025-05-12T10:00:00.000Z',
        end_time: '2025-05-12T11:00:00.000Z',
      },
    ];
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated={false}
        eventDates={multiSlotEventDates}
      />,
    );

    goToWeeklyStepAsGuest();

    const weeklySection = screen.getByTestId('availability-step-weekly');
    const slotKeys = Array.from(
      new Set(
        Array.from(weeklySection.querySelectorAll<HTMLTableCellElement>('td[data-time-slot]'))
          .map((cell) => cell.getAttribute('data-time-slot') ?? '')
          .filter((slot): slot is string => slot.length > 0),
      ),
    ).sort();

    expect(slotKeys.length).toBe(2);

    const [firstStart, firstEnd] = slotKeys[0].split('-');
    const [, lastEndRaw] = slotKeys[slotKeys.length - 1].split('-');
    const toDisplayTime = (value: string) => value.replace(/^0/, '');
    const lastEnd = lastEndRaw === '00:00' ? '24:00' : toDisplayTime(lastEndRaw);

    expect(within(weeklySection).getByText(toDisplayTime(firstStart))).toBeInTheDocument();
    expect(within(weeklySection).getByText(toDisplayTime(firstEnd))).toBeInTheDocument();
    expect(within(weeklySection).getByText(lastEnd)).toBeInTheDocument();
  });

  it('予定確認・修正で時間区切りの最下段に終了時刻を表示する', async () => {
    const multiSlotEventDates = [
      {
        id: 'date1',
        start_time: '2025-05-12T09:00:00.000Z',
        end_time: '2025-05-12T10:00:00.000Z',
      },
      {
        id: 'date2',
        start_time: '2025-05-12T10:00:00.000Z',
        end_time: '2025-05-12T11:00:00.000Z',
      },
    ];
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated={false}
        eventDates={multiSlotEventDates}
      />,
    );

    goToWeeklyStepAsGuest();
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const heatmapSection = await screen.findByTestId('availability-step-heatmap');
    const slotKeys = Array.from(
      new Set(
        Array.from(heatmapSection.querySelectorAll<HTMLTableCellElement>('td[data-time-slot]'))
          .map((cell) => cell.getAttribute('data-time-slot') ?? '')
          .filter((slot): slot is string => slot.length > 0),
      ),
    ).sort();
    const [, lastEndRaw] = slotKeys[slotKeys.length - 1].split('-');
    const expectedLastEnd = lastEndRaw === '00:00' ? '24:00' : lastEndRaw.replace(/^0/, '');

    expect(within(heatmapSection).getByText(expectedLastEnd)).toBeInTheDocument();
  });

  it('24:00終端の候補は曜日一括入力で00:00終端枠として表示される', async () => {
    const midnightEventDates = [
      {
        id: 'midnight-date',
        start_time: '2025-05-12T23:00:00',
        end_time: '2025-05-13T00:00:00',
      },
    ];
    const weekdayNumber = new Date(midnightEventDates[0].start_time).getDay();
    const weekdayLabel = ['日', '月', '火', '水', '木', '金', '土'][weekdayNumber];

    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated
        requireWeeklyStep
        eventDates={midnightEventDates}
      />,
    );

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const weeklySection = await screen.findByTestId('availability-step-weekly');
    const selectedCell = weeklySection.querySelector<HTMLDivElement>(
      `td[data-day="${weekdayLabel}"][data-time-slot="23:00-00:00"] div`,
    );

    expect(selectedCell).not.toBeNull();
    expect(selectedCell).toHaveTextContent('×');
  });

  it('ヒートマップで○が0件のままは確認へ進めない', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);
    goToWeeklyStepAsGuest();
    await applyWeeklyAndGoHeatmap();

    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    expect(
      screen.getByText('少なくとも1つの参加可能枠（○）を選択してください'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('availability-step-confirm')).not.toBeInTheDocument();
  });

  it('編集回答は3ステップで遷移できる', () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="edit"
        initialParticipant={{ id: 'p1', name: '既存ユーザー' }}
        initialAvailabilities={{ date1: true }}
      />,
    );

    expect(screen.getByTestId('availability-step-weekly')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    expect(screen.getByTestId('availability-step-confirm')).toBeInTheDocument();
  });

  it('ログイン時の曜日一括入力はアカウント週予定に保存せず次へ進む', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated requireWeeklyStep />);
    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    await waitFor(() => {
      expect(screen.getByTestId('availability-step-weekly')).toBeInTheDocument();
    });

    const weeklyCell = document.querySelector<HTMLElement>('td[data-day][data-time-slot]');
    if (!weeklyCell) throw new Error('曜日一括セルが見つかりません');
    fireEvent.pointerDown(weeklyCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(weeklyCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.queryByText('週予定の更新')).not.toBeInTheDocument();
    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
  });

  it('各日予定で反映済みの枠は曜日一括入力で上書きしない', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated
        requireWeeklyStep
        initialAvailabilities={{ date1: true }}
        dailyAutoFillDateIds={['date1']}
      />,
    );

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    await waitFor(() => {
      expect(screen.getByTestId('availability-step-weekly')).toBeInTheDocument();
    });

    const weeklyCell = document.querySelector<HTMLElement>('td[data-day="月"][data-time-slot]');
    if (!weeklyCell) throw new Error('曜日一括セルが見つかりません');
    fireEvent.pointerDown(weeklyCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(weeklyCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
    expect(
      document.querySelector<HTMLInputElement>('input[name="availability_date1"]'),
    ).toBeInTheDocument();
  });

  it('曜日セルを○→×に戻した曜日は未選択扱いになり、週予定更新モーダルを出さずに進める', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated requireWeeklyStep />);

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    await waitFor(() => {
      expect(screen.getByTestId('availability-step-weekly')).toBeInTheDocument();
    });

    const weeklyCell = document.querySelector<HTMLElement>('td[data-day][data-time-slot]');
    if (!weeklyCell) throw new Error('曜日一括セルが見つかりません');
    fireEvent.pointerDown(weeklyCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(weeklyCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerDown(weeklyCell, { pointerId: 2, pointerType: 'mouse' });
    fireEvent.pointerUp(weeklyCell, { pointerId: 2, pointerType: 'mouse' });

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(screen.queryByText('週予定の更新')).not.toBeInTheDocument();
    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
  });

  it('編集モードで曜日セルを○→×にした場合はヒートマップの選択にも反映される', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="edit"
        isAuthenticated={false}
        initialParticipant={{ id: 'p1', name: '既存ユーザー' }}
        initialAvailabilities={{ date1: true }}
      />,
    );

    expect(screen.getByTestId('availability-step-weekly')).toBeInTheDocument();
    const weeklyCell = document.querySelector<HTMLElement>('td[data-day="月"][data-time-slot]');
    if (!weeklyCell) throw new Error('曜日一括セルが見つかりません');
    fireEvent.pointerDown(weeklyCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(weeklyCell, { pointerId: 1, pointerType: 'mouse' });

    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const heatmapSection = await screen.findByTestId('availability-step-heatmap');
    expect(heatmapSection).toBeInTheDocument();
    expect(
      document.querySelector<HTMLInputElement>('input[name="availability_date1"]'),
    ).not.toBeInTheDocument();
    const date1Cell = heatmapSection.querySelector<HTMLElement>('[data-selection-key="date1"]');
    expect(date1Cell).not.toBeNull();
    expect(date1Cell).toHaveTextContent('×');
  });

  it('競合枠セルの上書き確認が動作する', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated={false}
        lockedDateIds={['date1']}
      />,
    );

    goToWeeklyStepAsGuest();
    await applyWeeklyAndGoHeatmap();

    const lockedCell = document.querySelector<HTMLElement>('[data-selection-key="date1"]');
    if (!lockedCell) throw new Error('競合セルが見つかりません');
    fireEvent.click(lockedCell);
    expect(screen.getByRole('dialog', { name: '重複する予定枠を選択' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'この枠を選択する' }));

    await waitFor(() => {
      expect(
        document.querySelector<HTMLInputElement>('input[name="availability_date1"]'),
      ).toBeInTheDocument();
    });
  });

  it('最終送信時に同期範囲モーダルを表示し sync_scope=current で送信できる', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated
        hasSyncTargetEvents
        initialAvailabilities={{ date1: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    const weeklyNext = screen.queryByRole('button', { name: '次へ' });
    if (weeklyNext) {
      fireEvent.click(weeklyNext);
      const saveWeekly = await screen.findByRole('button', { name: '更新せず次へ' });
      fireEvent.click(saveWeekly);
    }
    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole('button', { name: '回答を送信' }));

    expect(await screen.findByText('回答後の保存方法')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'このイベントのみ' }));
    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
    });
    const formDataArg = (submitAvailability as jest.Mock).mock.calls[0][0] as FormData;
    expect(formDataArg.get('sync_scope')).toBe('current');
    expect(formDataArg.get('sync_defer')).toBeNull();
  });

  it('最終送信時に同期範囲モーダルから sync_scope=all と sync_defer=true で送信できる', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated
        hasSyncTargetEvents
        initialAvailabilities={{ date1: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    const weeklyNext = screen.queryByRole('button', { name: '次へ' });
    if (weeklyNext) {
      fireEvent.click(weeklyNext);
      const saveWeekly = await screen.findByRole('button', { name: '更新せず次へ' });
      fireEvent.click(saveWeekly);
    }
    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole('button', { name: '回答を送信' }));

    expect(await screen.findByText('回答後の保存方法')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'アカウント予定に保存して反映' }));
    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
    });
    const formDataArg = (submitAvailability as jest.Mock).mock.calls[0][0] as FormData;
    expect(formDataArg.get('sync_scope')).toBe('all');
    expect(formDataArg.get('sync_defer')).toBe('true');
  });

  it('同期範囲モーダルで確認へ戻るを選ぶと送信せず確認ステップへ戻る', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated
        hasSyncTargetEvents
        initialAvailabilities={{ date1: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    const weeklyNext = screen.queryByRole('button', { name: '次へ' });
    if (weeklyNext) {
      fireEvent.click(weeklyNext);
      const skipWeeklySave = await screen.findByRole('button', { name: '更新せず次へ' });
      fireEvent.click(skipWeeklySave);
    }
    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole('button', { name: '回答を送信' }));

    expect(await screen.findByText('回答後の保存方法')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '確認へ戻る' }));

    await waitFor(() => {
      expect(screen.queryByText('回答後の保存方法')).not.toBeInTheDocument();
    });
    expect(screen.getByTestId('availability-step-confirm')).toBeInTheDocument();
    expect(submitAvailability).not.toHaveBeenCalled();
  });

  it('確認画面の名前欄は重複エラー時のみ表示する', async () => {
    (checkParticipantExists as jest.Mock).mockResolvedValue({ exists: true });
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated={false}
        initialAvailabilities={{ date1: true }}
      />,
    );

    goToWeeklyStepAsGuest();
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    fireEvent.click(screen.getByLabelText(/利用規約/));

    expect(document.getElementById('participant_name_confirm')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '回答を送信' }));
    expect(
      await screen.findByText('同じ名前の回答が既に存在します。お名前を変更してください。'),
    ).toBeInTheDocument();
    expect(document.getElementById('participant_name_confirm')).toBeInTheDocument();
    expect(submitAvailability).not.toHaveBeenCalled();
  });
});
