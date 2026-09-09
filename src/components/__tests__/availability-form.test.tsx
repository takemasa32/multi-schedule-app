if (!window.HTMLFormElement.prototype.requestSubmit) {
  window.HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from 'react';
import { render, screen, fireEvent, waitFor, within, createEvent } from '@testing-library/react';
import AvailabilityForm from '../availability-form';
import { trackEvent } from '@/components/analytics/google-analytics';

const mockRouterReplace = jest.fn();
const mockRouterPush = jest.fn();

jest.mock('@/lib/actions', () => ({
  submitAvailability: jest.fn(),
  checkParticipantExists: jest.fn(),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

jest.mock('@/components/analytics/google-analytics', () => ({
  trackEvent: jest.fn(),
  toAnalyticsBoolean: (value: boolean) => (value ? 'yes' : 'no'),
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
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
    document.body.style.overscrollBehavior = '';
    (checkParticipantExists as jest.Mock).mockResolvedValue({ exists: false });
    (submitAvailability as jest.Mock).mockResolvedValue({ success: true, participantId: 'part-1' });
    (trackEvent as jest.Mock).mockReturnValue(true);
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

  it('曜日一括入力では適用対象と次画面で調整できることを案内する', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);
    goToWeeklyStepAsGuest();
    expect(
      screen.getByText('まだ予定が入っていない日程を、曜日ごとにまとめて入力できます。'),
    ).toBeInTheDocument();
    expect(screen.getByText('次の画面で日付ごとに調整できます。')).toBeInTheDocument();
  });

  it('曜日一括入力は候補外セルを無効化し、候補セルをキーボード操作できる', () => {
    const singleDateEvent = [
      {
        id: 'date1',
        start_time: '2025-05-12T09:00:00.000Z',
        end_time: '2025-05-12T10:00:00.000Z',
      },
    ];
    render(
      <AvailabilityForm
        {...defaultProps}
        eventDates={singleDateEvent}
        mode="new"
        isAuthenticated={false}
      />,
    );

    goToWeeklyStepAsGuest();

    const weeklySection = screen.getByTestId('availability-step-weekly');
    const candidateCell = weeklySection.querySelector<HTMLElement>(
      'td[data-day="月"][data-time-slot]',
    );
    if (!candidateCell) throw new Error('候補セルが見つかりません');
    const timeSlot = candidateCell.getAttribute('data-time-slot');
    if (!timeSlot) throw new Error('候補セルの時間帯が見つかりません');
    const unavailableCell = weeklySection.querySelector<HTMLElement>(
      `td[data-day="火"][data-time-slot="${timeSlot}"]`,
    );
    if (!unavailableCell) throw new Error('候補外セルが見つかりません');

    expect(candidateCell).toHaveAttribute('role', 'button');
    expect(candidateCell).toHaveAttribute('tabindex', '0');
    expect(candidateCell).toHaveAttribute('aria-label', expect.stringMatching(/^月 .* 未選択$/));
    expect(unavailableCell).toHaveAttribute('role', 'button');
    expect(unavailableCell).toHaveAttribute('aria-disabled', 'true');
    expect(unavailableCell).not.toHaveAttribute('tabindex');
    expect(unavailableCell).not.toHaveAttribute('data-selection-key');
    expect(unavailableCell).toHaveTextContent('-');

    fireEvent.keyDown(candidateCell, { key: 'Enter' });

    expect(candidateCell).toHaveAttribute('aria-pressed', 'true');
    expect(candidateCell).toHaveTextContent('○');
  });

  it('曜日一括入力は見出しを重複させず、表と操作案内を連続した順序で表示する', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);

    goToWeeklyStepAsGuest();

    const section = screen.getByTestId('availability-step-weekly');
    const progress = screen.getByTestId('availability-step-progress');
    const title = screen.getByRole('heading', { name: '曜日一括入力' });
    const description = section.querySelector('.availability-step-description');
    const table = section.querySelector('table');
    const guide = section.querySelector('.availability-operation-guide');
    const nextButton = screen.getByRole('button', { name: '次へ' });
    const timeHeader = within(section).getByRole('columnheader', { name: '時間' });

    expect(screen.getAllByRole('heading', { name: '曜日一括入力' })).toHaveLength(1);
    expect(description).not.toBeNull();
    expect(table).not.toBeNull();
    expect(guide).not.toBeNull();
    if (!description || !table || !guide) {
      throw new Error('曜日一括入力の表示要素が見つかりません');
    }

    const orderedElements = [progress, title, description, table, guide, nextButton];
    orderedElements.slice(0, -1).forEach((element, index) => {
      expect(element.compareDocumentPosition(orderedElements[index + 1])).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      );
    });
    expect(timeHeader).toHaveClass('availability-time-column');
    expect(timeHeader).not.toHaveAttribute('data-selection-key');
    expect(section.querySelector('.availability-selection-cell-content')).toHaveClass(
      'availability-selection-cell-content',
    );
    expect(screen.getByTestId('availability-weekly-scroller')).toHaveClass(
      'availability-table-region',
      'overflow-x-hidden',
    );
    expect(screen.getByTestId('availability-weekly-scroller')).not.toHaveClass('overflow-x-auto');
  });

  it('回答画面のセル操作はbodyをロックせず、ヒートマップはbuttonとして操作できる', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);

    goToWeeklyStepAsGuest();
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const heatmapCell = document.querySelector<HTMLButtonElement>('[data-selection-key="date1"]');
    if (!heatmapCell) throw new Error('ヒートマップセルが見つかりません');

    expect(heatmapCell.tagName).toBe('BUTTON');
    expect(heatmapCell).toHaveAttribute('tabindex', '0');
    expect(heatmapCell).toHaveAttribute('aria-label', expect.stringContaining('未選択'));
    expect(heatmapCell).toHaveClass('availability-selection-cell');

    const pointerDown = createEvent.pointerDown(heatmapCell, {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerId: 1,
      pointerType: 'touch',
    });
    fireEvent(heatmapCell, pointerDown);

    expect(pointerDown.defaultPrevented).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(document.body.style.touchAction).toBe('');

    fireEvent.pointerUp(heatmapCell, { pointerId: 1, pointerType: 'touch' });
  });

  it('時刻列には選択イベントを付けず、ヒートマップの左右スクロールを無効にする', () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);

    goToWeeklyStepAsGuest();
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const scroller = screen.getByTestId('availability-heatmap-scroller');
    expect(scroller).toHaveClass('availability-table-region', 'overflow-x-hidden');

    const timeColumns = scroller.querySelectorAll<HTMLElement>('.availability-time-column');
    expect(timeColumns.length).toBeGreaterThan(0);
    timeColumns.forEach((column) => {
      expect(column).not.toHaveAttribute('data-selection-key');
      expect(column).not.toHaveAttribute('aria-pressed');
    });
  });

  it('ログイン済みの曜日一括入力でも同じ案内を表示する', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated requireWeeklyStep />);

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    expect(
      await screen.findByText('まだ予定が入っていない日程を、曜日ごとにまとめて入力できます。'),
    ).toBeInTheDocument();
    expect(screen.getByText('次の画面で日付ごとに調整できます。')).toBeInTheDocument();
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

  it('0:00開始の候補は24:00ではなく0:00として読み上げる', async () => {
    const midnightStartEventDates = [
      {
        id: 'midnight-start-date',
        start_time: '2025-05-12T00:00:00',
        end_time: '2025-05-12T01:00:00',
      },
    ];
    const weekdayNumber = new Date(midnightStartEventDates[0].start_time).getDay();
    const weekdayLabel = ['日', '月', '火', '水', '木', '金', '土'][weekdayNumber];

    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated
        requireWeeklyStep
        eventDates={midnightStartEventDates}
      />,
    );

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));

    const weeklySection = await screen.findByTestId('availability-step-weekly');
    const candidateCell = weeklySection.querySelector<HTMLElement>(
      `td[data-day="${weekdayLabel}"][data-time-slot="00:00-01:00"]`,
    );

    expect(candidateCell).toHaveAccessibleName(`${weekdayLabel} 0:00〜1:00 未選択`);
    expect(candidateCell).not.toHaveAccessibleName(/24:00〜1:00/);
  });

  it('参加可能枠が未選択の場合は候補日程追加への確認を表示できる', async () => {
    render(<AvailabilityForm {...defaultProps} mode="new" isAuthenticated={false} />);
    goToWeeklyStepAsGuest();
    await applyWeeklyAndGoHeatmap();

    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    expect(screen.getByText('参加可能な候補日程が選択されていません。')).toBeInTheDocument();
    expect(
      screen.getByText('どこも参加できない場合は、イベントページから候補日程を追加できます。'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('availability-step-confirm')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '候補日程を追加' }));
    expect(screen.getByRole('dialog', { name: '候補日程を追加しますか？' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'イベントページへ移動すると、現在入力中のデータが消えますがよろしいですか。',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '予定入力に戻る' })).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: '候補日程を追加' }).at(-1)!);
    expect(mockRouterPush).toHaveBeenCalledWith('/event/token1?action=add-dates');
  });

  it('編集回答は曜日一括入力を表示せず2ステップで遷移できる', () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="edit"
        initialParticipant={{ id: 'p1', name: '既存ユーザー' }}
        initialAvailabilities={{ date1: true }}
      />,
    );

    expect(screen.getByTestId('availability-step-heatmap')).toBeInTheDocument();
    expect(screen.queryByTestId('availability-step-weekly')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
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

  it('最終送信時は同期範囲モーダルを出さず完了ページへ遷移する', async () => {
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

    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
    });
    const formDataArg = (submitAvailability as jest.Mock).mock.calls[0][0] as FormData;
    expect(screen.queryByText('回答後の保存方法')).not.toBeInTheDocument();
    expect(formDataArg.get('sync_scope')).toBeNull();
    expect(formDataArg.get('sync_defer')).toBeNull();
    expect(mockRouterReplace).toHaveBeenCalledWith(
      '/event/token1/input/complete?participant_id=part-1',
    );
    expect(trackEvent).toHaveBeenCalledWith('answer_submitted', {
      auth_state: 'authenticated',
      weekly_used: 'no',
    });
    expect(
      (trackEvent as jest.Mock).mock.calls.filter(([name]) => name === 'answer_submitted'),
    ).toHaveLength(1);
  });

  it('他イベント反映対象がある場合も回答送信だけを先に完了する', async () => {
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

    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
    });
    const formDataArg = (submitAvailability as jest.Mock).mock.calls[0][0] as FormData;
    expect(screen.queryByText('回答後の保存方法')).not.toBeInTheDocument();
    expect(formDataArg.get('sync_scope')).toBeNull();
    expect(formDataArg.get('sync_defer')).toBeNull();
    expect(mockRouterReplace).toHaveBeenCalledWith(
      '/event/token1/input/complete?participant_id=part-1',
    );
  });

  it('編集回答の保存成功では answer_edited を送り、新規回答イベントを送らない', async () => {
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="edit"
        isAuthenticated
        initialParticipant={{ id: 'p1', name: '既存ユーザー' }}
        initialAvailabilities={{ date1: true }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole('button', { name: '回答を更新する' }));

    await waitFor(() => {
      expect(submitAvailability).toHaveBeenCalled();
      expect(mockRouterReplace).toHaveBeenCalledWith(
        '/event/token1/input/complete?participant_id=part-1',
      );
    });
    expect(trackEvent).toHaveBeenCalledWith('answer_edited', {
      auth_state: 'authenticated',
      weekly_used: 'no',
    });
    expect(trackEvent).not.toHaveBeenCalledWith('answer_submitted', expect.anything());
  });

  it('回答保存が失敗した場合は成功イベントを送らない', async () => {
    (submitAvailability as jest.Mock).mockResolvedValue({
      success: false,
      message: '保存に失敗しました',
    });
    render(
      <AvailabilityForm
        {...defaultProps}
        mode="new"
        isAuthenticated
        initialAvailabilities={{ date1: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText(/お名前/), { target: { value: 'テスト太郎' } });
    fireEvent.click(screen.getByRole('button', { name: '次へ' }));
    fireEvent.click(screen.getByRole('button', { name: '確認へ進む' }));
    fireEvent.click(screen.getByLabelText(/利用規約/));
    fireEvent.click(screen.getByRole('button', { name: '回答を送信' }));

    await waitFor(() => {
      expect(screen.getByText('保存に失敗しました')).toBeInTheDocument();
    });
    expect(trackEvent).not.toHaveBeenCalledWith('answer_submitted', expect.anything());
    expect(mockRouterReplace).not.toHaveBeenCalled();
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
