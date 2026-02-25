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
jest.mock('@/lib/schedule-actions', () => ({
  upsertWeeklyTemplatesFromWeekdaySelections: jest.fn(),
  fetchUserScheduleTemplates: jest.fn(),
}));

import { submitAvailability, checkParticipantExists } from '@/lib/actions';
import { upsertWeeklyTemplatesFromWeekdaySelections } from '@/lib/schedule-actions';
import { fetchUserScheduleTemplates } from '@/lib/schedule-actions';

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
    localStorage.clear();
    (checkParticipantExists as jest.Mock).mockResolvedValue({ exists: false });
    (submitAvailability as jest.Mock).mockResolvedValue({ success: true });
    (fetchUserScheduleTemplates as jest.Mock).mockResolvedValue({
      manual: [],
      learned: [],
    });
    (upsertWeeklyTemplatesFromWeekdaySelections as jest.Mock).mockResolvedValue({
      success: true,
      updatedCount: 1,
    });
  });

  const goToWeeklyStepAsGuest = () => {
    fireEvent.change(screen.getByLabelText(/お名前/), {
      target: { value: 'テスト太郎' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'ログインせずに進む' }));
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

  it('未ログイン導線の文言を表示する', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);
    expect(screen.getByRole('button', { name: 'ログインして進む' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログインせずに進む' })).toBeInTheDocument();
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

  it('ログイン時の曜日一括入力で差分がある場合は週予定更新確認を表示できる', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated uncoveredDayCount={1} />);
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

    expect(await screen.findByText('週予定の更新')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '更新して次へ' }));
    await waitFor(() => {
      expect(upsertWeeklyTemplatesFromWeekdaySelections).toHaveBeenCalled();
    });
    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
  });

  it('各日予定で反映済みの枠は曜日一括入力で上書きしない', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated
        uncoveredDayCount={1}
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

    const skipWeeklySave = await screen
      .findByRole('button', { name: '更新せず次へ' })
      .catch(() => null);
    if (skipWeeklySave) {
      fireEvent.click(skipWeeklySave);
    }

    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
    expect(
      document.querySelector<HTMLInputElement>('input[name="availability_date1"]'),
    ).toBeInTheDocument();
  });

  it('曜日セルを○→×に戻した曜日は未選択扱いになり、週予定更新モーダルを出さずに進める', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated uncoveredDayCount={1} />);

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

  it('競合枠セルの上書き確認が動作する', async () => {
    const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(true);
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
    expect(confirmMock).toHaveBeenCalled();

    await waitFor(() => {
      expect(
        document.querySelector<HTMLInputElement>('input[name="availability_date1"]'),
      ).toBeInTheDocument();
    });
    confirmMock.mockRestore();
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
