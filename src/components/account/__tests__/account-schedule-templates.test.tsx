import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import AccountScheduleTemplates from '@/components/account/account-schedule-templates';
import {
  applyUserAvailabilitySyncForEvent,
  createManualScheduleTemplate,
  fetchUserAvailabilitySyncPreview,
  fetchUserScheduleBlocks,
  fetchUserScheduleTemplates,
  removeScheduleTemplate,
  removeUserScheduleBlock,
  upsertUserScheduleBlock,
} from '@/lib/schedule-actions';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/schedule-actions', () => ({
  applyUserAvailabilitySyncForEvent: jest.fn(),
  createManualScheduleTemplate: jest.fn(),
  fetchUserAvailabilitySyncPreview: jest.fn(),
  fetchUserScheduleBlocks: jest.fn(),
  fetchUserScheduleTemplates: jest.fn(),
  removeScheduleTemplate: jest.fn(),
  upsertUserScheduleBlock: jest.fn(),
  removeUserScheduleBlock: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;
const mockApplyUserAvailabilitySyncForEvent = applyUserAvailabilitySyncForEvent as jest.Mock;
const mockFetchUserScheduleTemplates = fetchUserScheduleTemplates as jest.Mock;
const mockFetchUserAvailabilitySyncPreview = fetchUserAvailabilitySyncPreview as jest.Mock;
const mockFetchUserScheduleBlocks = fetchUserScheduleBlocks as jest.Mock;
const mockCreateManualScheduleTemplate = createManualScheduleTemplate as jest.Mock;
const mockRemoveScheduleTemplate = removeScheduleTemplate as jest.Mock;
const mockUpsertUserScheduleBlock = upsertUserScheduleBlock as jest.Mock;
const mockRemoveUserScheduleBlock = removeUserScheduleBlock as jest.Mock;

const createLocalTimeRange = (startHour: number, endHour: number) => {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    startHour,
    0,
    0,
    0,
  );
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, 0, 0, 0);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    dateLabel: start.toLocaleDateString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
    }),
    dateKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(
      start.getDate(),
    ).padStart(2, '0')}`,
  };
};

const createFixedLocalTimeRange = (
  year: number,
  monthIndex: number,
  day: number,
  startHour: number,
  endHour: number,
) => {
  const start = new Date(year, monthIndex, day, startHour, 0, 0, 0);
  const end = new Date(year, monthIndex, day, endHour, 0, 0, 0);
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

const toDateKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`;

const toWeekPeriodLabelFromIso = (iso: string) => {
  const base = new Date(iso);
  const diffToMonday = (base.getDay() + 6) % 7;
  const monday = new Date(base.getFullYear(), base.getMonth(), base.getDate() - diffToMonday);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
  return `${monday.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  })} 〜 ${sunday.toLocaleDateString('ja-JP', {
    month: 'numeric',
    day: 'numeric',
  })}`;
};

const createSyncPreviewEvent = (eventId: string, title: string) => {
  const range = createLocalTimeRange(9, 10);
  return {
    eventId,
    publicToken: `${eventId}-token`,
    title,
    isFinalized: false,
    changes: {
      total: 1,
      availableToUnavailable: 0,
      unavailableToAvailable: 1,
      protected: 0,
    },
    dates: [
      {
        eventDateId: `${eventId}-date-1`,
        startTime: range.startIso,
        endTime: range.endIso,
        currentAvailability: false,
        desiredAvailability: true,
        willChange: true,
        isProtected: false,
      },
    ],
  };
};

describe('AccountScheduleTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveScheduleTemplate.mockResolvedValue({ success: true });
    mockFetchUserScheduleBlocks.mockResolvedValue([]);
    mockFetchUserAvailabilitySyncPreview.mockResolvedValue([]);
    mockApplyUserAvailabilitySyncForEvent.mockResolvedValue({
      success: true,
      message: 'イベントを更新しました',
      updatedCount: 1,
    });
    mockUpsertUserScheduleBlock.mockResolvedValue({ success: true });
    mockRemoveUserScheduleBlock.mockResolvedValue({ success: true });
  });

  it('未ログイン時は案内文を表示する', () => {
    mockUseSession.mockReturnValue({ status: 'unauthenticated' });

    render(<AccountScheduleTemplates />);

    expect(screen.getByText('ログインすると予定設定を管理できます。')).toBeInTheDocument();
  });

  it('初期認証済みの場合はセッション読込中でも未ログイン文言を表示しない', async () => {
    mockUseSession.mockReturnValue({ status: 'loading' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([]);

    render(<AccountScheduleTemplates initialIsAuthenticated={true} />);

    expect(screen.queryByText('ログインすると予定設定を管理できます。')).not.toBeInTheDocument();
    await screen.findByRole('heading', { name: '予定一括管理' });
  });

  it('予定一括管理の読み込み中は空データ文言を表示しない', async () => {
    mockUseSession.mockReturnValue({ status: 'loading' });
    let resolveTemplates: ((value: { manual: never[]; learned: never[] }) => void) | null = null;
    let resolveBlocks: ((value: never[]) => void) | null = null;

    mockFetchUserScheduleTemplates.mockReturnValue(
      new Promise((resolve) => {
        resolveTemplates = resolve;
      }),
    );
    mockFetchUserScheduleBlocks.mockReturnValue(
      new Promise((resolve) => {
        resolveBlocks = resolve;
      }),
    );

    render(<AccountScheduleTemplates initialIsAuthenticated={true} />);

    expect(screen.getByText('予定データを読み込んでいます...')).toBeInTheDocument();
    expect(screen.queryByText('予定データはまだありません。')).not.toBeInTheDocument();

    resolveTemplates?.({ manual: [], learned: [] });
    resolveBlocks?.([]);

    await waitFor(() => {
      expect(screen.getByText('予定データはまだありません。')).toBeInTheDocument();
    });
  });

  it('編集して更新するとテンプレを保存できる', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [
        {
          id: 'tpl-1',
          weekday: 1,
          start_time: '09:00:00',
          end_time: '10:00:00',
          availability: true,
          source: 'manual',
          sample_count: 1,
        },
      ],
      learned: [
        {
          id: 'learn-1',
          weekday: 2,
          start_time: '09:00:00',
          end_time: '10:00:00',
          availability: false,
          source: 'learned',
          sample_count: 3,
        },
      ],
    });
    mockCreateManualScheduleTemplate.mockResolvedValue({ success: true });

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    fireEvent.click(screen.getByTestId('account-tab-weekly'));
    await screen.findByRole('heading', { name: '週ごとの用事' });
    expect(screen.queryByText('学')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '編集する' }));
    fireEvent.click(screen.getByRole('button', { name: '月 09:00-10:00' }));
    fireEvent.click(screen.getByTestId('weekly-save-bottom'));

    await waitFor(() => {
      expect(mockCreateManualScheduleTemplate).toHaveBeenCalledTimes(1);
      expect(mockCreateManualScheduleTemplate).toHaveBeenCalledWith({
        weekday: 1,
        startTime: '09:00',
        endTime: '10:00',
        availability: false,
      });
    });
  });

  it('週テンプレに重複開始時刻の混在があっても時間行を分割して表示できる', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [
        {
          id: 'tpl-1',
          weekday: 1,
          start_time: '08:00:00',
          end_time: '09:00:00',
          availability: false,
          source: 'manual',
          sample_count: 1,
        },
        {
          id: 'tpl-2',
          weekday: 1,
          start_time: '08:00:00',
          end_time: '10:00:00',
          availability: false,
          source: 'manual',
          sample_count: 1,
        },
      ],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([]);

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    fireEvent.click(screen.getByTestId('account-tab-weekly'));
    await screen.findByRole('heading', { name: '週ごとの用事' });

    expect(screen.getAllByText('8:00')).toHaveLength(1);
    expect(screen.getByText('9:00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '月 09:00-10:00' })).toHaveTextContent('×');
  });

  it('予定一括管理をカレンダー表示できる', async () => {
    const range = createLocalTimeRange(9, 10);
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([
      {
        id: 'block-1',
        start_time: range.startIso,
        end_time: range.endIso,
        availability: true,
        source: 'event',
        event_id: 'event-1',
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    expect(await screen.findByText(range.dateLabel)).toBeInTheDocument();
    expect(await screen.findByText('○')).toBeInTheDocument();
  });

  it('表示中の週が2時間単位のみなら2時間区切りで表示する', async () => {
    const firstRange = createLocalTimeRange(9, 10);
    const secondRange = createLocalTimeRange(10, 11);
    const mergedLabel = `${firstRange.startIso.slice(11, 16)}-${secondRange.endIso.slice(11, 16)}`;
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([
      {
        id: 'block-1',
        start_time: firstRange.startIso,
        end_time: firstRange.endIso,
        availability: true,
        source: 'event',
        event_id: 'event-1',
      },
      {
        id: 'block-2',
        start_time: secondRange.startIso,
        end_time: secondRange.endIso,
        availability: true,
        source: 'event',
        event_id: 'event-1',
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    await waitFor(() => {
      expect(screen.queryByText('予定データはまだありません。')).not.toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: new RegExp(`${firstRange.dateKey} .*:.*-.*:.*$`) }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button')
        .some((button) => (button.getAttribute('aria-label') ?? '').includes(mergedLabel)),
    ).toBe(true);
  });

  it('予定一括管理の最下段終了時刻は境界線上レイアウトで表示する', async () => {
    const firstRange = createLocalTimeRange(9, 10);
    const secondRange = createLocalTimeRange(10, 11);
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([
      {
        id: 'block-1',
        start_time: firstRange.startIso,
        end_time: firstRange.endIso,
        availability: true,
        source: 'event',
        event_id: 'event-1',
      },
      {
        id: 'block-2',
        start_time: secondRange.startIso,
        end_time: secondRange.endIso,
        availability: true,
        source: 'event',
        event_id: 'event-1',
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    await waitFor(() => {
      expect(screen.queryByText('予定データはまだありません。')).not.toBeInTheDocument();
    });
    const datedTable = screen.getByRole('table');
    const endTimeRow = datedTable.querySelector('tbody tr.h-0');
    const endTimeLabel = endTimeRow?.querySelector('th span');

    expect(endTimeRow).not.toBeNull();
    expect(endTimeRow).toHaveClass('h-0');
    expect(endTimeLabel).not.toBeNull();
    expect(endTimeLabel).toHaveClass('absolute');
  });

  it('予定一括管理の保存時は壁時計時刻で更新する', async () => {
    const range = createLocalTimeRange(9, 10);
    const startClock = range.startIso.slice(11, 16);
    const endClock = range.endIso.slice(11, 16);
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([
      {
        id: 'block-1',
        start_time: range.startIso,
        end_time: range.endIso,
        availability: true,
        source: 'manual',
        event_id: null,
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    await waitFor(() => {
      expect(screen.queryByText('予定データを読み込んでいます...')).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('dated-edit'));
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`${range.dateKey} ${startClock}-${endClock}$`),
      }),
    );
    fireEvent.click(screen.getByTestId('dated-save-bottom'));

    await waitFor(() => {
      expect(mockUpsertUserScheduleBlock).toHaveBeenCalledWith({
        startTime: `${range.dateKey}T${startClock}:00`,
        endTime: `${range.dateKey}T${endClock}:00`,
        availability: false,
        replaceBlockId: 'block-1',
      });
    });
  });

  it('予定一括管理の保存時に 23:00-24:00 は翌日 00:00 終了として更新する', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateKey = toDateKey(today);
    const nextDateKey = toDateKey(tomorrow);

    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([
      {
        id: 'block-midnight',
        start_time: `${dateKey}T23:00:00Z`,
        end_time: `${nextDateKey}T00:00:00Z`,
        availability: true,
        source: 'manual',
        event_id: null,
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    fireEvent.click(screen.getByTestId('dated-edit'));
    fireEvent.click(
      screen.getByRole('button', {
        name: new RegExp(`${dateKey} 23:00-24:00$`),
      }),
    );
    fireEvent.click(screen.getByTestId('dated-save-bottom'));

    await waitFor(() => {
      expect(mockUpsertUserScheduleBlock).toHaveBeenCalledWith({
        startTime: `${dateKey}T23:00:00`,
        endTime: `${nextDateKey}T00:00:00`,
        availability: false,
        replaceBlockId: 'block-midnight',
      });
    });
  });

  it('予定一括管理の更新完了メッセージは一定時間後に自動で消える', async () => {
    jest.useFakeTimers();
    try {
      const range = createLocalTimeRange(9, 10);
      const startClock = range.startIso.slice(11, 16);
      const endClock = range.endIso.slice(11, 16);
      mockUseSession.mockReturnValue({ status: 'authenticated' });
      mockFetchUserScheduleTemplates.mockResolvedValue({
        manual: [],
        learned: [],
      });
      mockFetchUserScheduleBlocks.mockResolvedValue([
        {
          id: 'block-1',
          start_time: range.startIso,
          end_time: range.endIso,
          availability: true,
          source: 'manual',
          event_id: null,
        },
      ]);

      render(<AccountScheduleTemplates />);

      await screen.findByRole('heading', { name: '予定一括管理' });
      await waitFor(() => {
        expect(screen.queryByText('予定データを読み込んでいます...')).not.toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('dated-edit'));
      fireEvent.click(
        screen.getByRole('button', {
          name: new RegExp(`${range.dateKey} ${startClock}-${endClock}$`),
        }),
      );
      fireEvent.click(screen.getByTestId('dated-save-bottom'));

      expect(await screen.findByText('予定一括管理を更新しました')).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(4000);
      });

      await waitFor(() => {
        expect(screen.queryByText('予定一括管理を更新しました')).not.toBeInTheDocument();
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('週の設定が空でもデフォルト時間行で週ごとの用事を編集できる', async () => {
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([
      {
        id: 'block-1',
        start_time: '2026-02-06T09:00:00Z',
        end_time: '2026-02-06T10:00:00Z',
        availability: false,
        source: 'event',
        event_id: 'event-1',
      },
    ]);

    render(<AccountScheduleTemplates />);

    fireEvent.click(screen.getByTestId('account-tab-weekly'));
    await screen.findByRole('heading', { name: '週ごとの用事' });
    await waitFor(() => {
      expect(
        screen.getByText(
          'テンプレデータはまだありません。まずはセルを編集して週ごとの用事を保存してください。',
        ),
      ).toBeInTheDocument();
    });
    const mondayCells = screen.getAllByRole('button').filter((button) => {
      const label = button.getAttribute('aria-label') ?? '';
      return /^月 \d{2}:\d{2}-\d{2}:\d{2}$/.test(label);
    });
    expect(mondayCells.length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '月 21:00-22:00' })).not.toBeInTheDocument();
  });

  it('回答イベントへの反映は変更がある最初の週を初期表示する', async () => {
    const firstWeek = createFixedLocalTimeRange(2026, 1, 9, 9, 10);
    const changedWeek = createFixedLocalTimeRange(2026, 1, 16, 9, 10);
    const firstWeekLabel = toWeekPeriodLabelFromIso(firstWeek.startIso);
    const changedWeekLabel = toWeekPeriodLabelFromIso(changedWeek.startIso);

    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([]);
    mockFetchUserAvailabilitySyncPreview.mockResolvedValue([
      {
        eventId: 'event-1',
        publicToken: 'event-token-1',
        title: 'イベントA',
        isFinalized: false,
        changes: {
          total: 1,
          availableToUnavailable: 0,
          unavailableToAvailable: 1,
          protected: 0,
        },
        dates: [
          {
            eventDateId: 'date-1',
            startTime: firstWeek.startIso,
            endTime: firstWeek.endIso,
            currentAvailability: false,
            desiredAvailability: false,
            willChange: false,
            isProtected: false,
          },
          {
            eventDateId: 'date-2',
            startTime: changedWeek.startIso,
            endTime: changedWeek.endIso,
            currentAvailability: false,
            desiredAvailability: true,
            willChange: true,
            isProtected: false,
          },
        ],
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    fireEvent.click(screen.getByTestId('sync-check-button'));

    await waitFor(() => {
      expect(screen.getByText(`表示期間: ${changedWeekLabel}`)).toBeInTheDocument();
    });
    expect(screen.queryByText(`表示期間: ${firstWeekLabel}`)).not.toBeInTheDocument();
  });

  it('回答イベントへの反映バッジは0件項目を表示せず、件数種別ごとに色分けする', async () => {
    const changed = createFixedLocalTimeRange(2026, 1, 16, 9, 10);

    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([]);
    mockFetchUserAvailabilitySyncPreview.mockResolvedValue([
      {
        eventId: 'event-1',
        publicToken: 'event-token-1',
        title: 'イベントA',
        isFinalized: false,
        changes: {
          total: 1,
          availableToUnavailable: 1,
          unavailableToAvailable: 0,
          protected: 0,
        },
        dates: [
          {
            eventDateId: 'date-1',
            startTime: changed.startIso,
            endTime: changed.endIso,
            currentAvailability: true,
            desiredAvailability: false,
            willChange: true,
            isProtected: false,
          },
        ],
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    fireEvent.click(screen.getByTestId('sync-check-button'));

    const totalBadge = await screen.findByText('変更 1件');
    const unavailableBadge = screen.getByText('可→不可 1');
    expect(totalBadge).toHaveClass('badge-info');
    expect(unavailableBadge).toHaveClass('badge-error');
    expect(screen.queryByText(/不可→可/)).not.toBeInTheDocument();
    expect(screen.queryByText(/保護/)).not.toBeInTheDocument();
  });

  it('回答イベントへの反映で複数イベントを同時適用しても競合せず全件再取得しない', async () => {
    let resolveFirst: (() => void) | null = null;
    let resolveSecond: (() => void) | null = null;

    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockFetchUserScheduleTemplates.mockResolvedValue({
      manual: [],
      learned: [],
    });
    mockFetchUserScheduleBlocks.mockResolvedValue([]);
    mockFetchUserAvailabilitySyncPreview.mockResolvedValue([
      createSyncPreviewEvent('event-1', 'イベントA'),
      createSyncPreviewEvent('event-2', 'イベントB'),
    ]);
    mockApplyUserAvailabilitySyncForEvent.mockImplementation(({ eventId }: { eventId: string }) => {
      return new Promise((resolve) => {
        const responder = () => resolve({ success: true, message: 'イベントを更新しました', updatedCount: 1 });
        if (eventId === 'event-1') {
          resolveFirst = responder;
          return;
        }
        resolveSecond = responder;
      });
    });

    render(<AccountScheduleTemplates />);

    await screen.findByRole('heading', { name: '予定一括管理' });
    fireEvent.click(screen.getByTestId('sync-check-button'));
    await screen.findByText('イベントA');
    await screen.findByText('イベントB');

    fireEvent.click(screen.getByTestId('sync-apply-event-1'));
    fireEvent.click(screen.getByTestId('sync-apply-event-2'));

    await waitFor(() => {
      expect(screen.getAllByText('適用中...')).toHaveLength(2);
    });

    await act(async () => {
      resolveSecond?.();
    });

    await waitFor(() => {
      expect(screen.queryByText('イベントB')).not.toBeInTheDocument();
      expect(screen.getByText('イベントA')).toBeInTheDocument();
    });

    await act(async () => {
      resolveFirst?.();
    });

    await waitFor(() => {
      expect(screen.queryByText('イベントA')).not.toBeInTheDocument();
    });
    expect(mockApplyUserAvailabilitySyncForEvent).toHaveBeenCalledTimes(2);
    expect(mockFetchUserAvailabilitySyncPreview).toHaveBeenCalledTimes(1);
  });
});
