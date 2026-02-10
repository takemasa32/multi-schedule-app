import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    await screen.findByRole('heading', { name: '週ごとの用事' });
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

    await screen.findByRole('heading', { name: '週ごとの用事' });
    expect(screen.queryByText('学')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '編集する' }));
    fireEvent.click(screen.getByRole('button', { name: '月 09:00-10:00' }));
    fireEvent.click(screen.getByRole('button', { name: '更新する' }));

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

  it('予定一括管理をカレンダー表示できる', async () => {
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
        availability: true,
        source: 'event',
        event_id: 'event-1',
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByText('予定一括管理');
    fireEvent.click(screen.getByRole('button', { name: '予定一括管理' }));
    expect(screen.getByText(/2\/6/)).toBeInTheDocument();
    expect(screen.getByText('○')).toBeInTheDocument();
  });

  it('表示中の週が2時間単位のみなら2時間区切りで表示する', async () => {
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
        availability: true,
        source: 'event',
        event_id: 'event-1',
      },
      {
        id: 'block-2',
        start_time: '2026-02-06T10:00:00Z',
        end_time: '2026-02-06T11:00:00Z',
        availability: true,
        source: 'event',
        event_id: 'event-1',
      },
    ]);

    render(<AccountScheduleTemplates />);

    await screen.findByText('予定一括管理');
    fireEvent.click(screen.getByRole('button', { name: '予定一括管理' }));

    expect(screen.getByRole('button', { name: /2026-02-06 .*:.*-.*:.*$/ })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('button')
        .some((button) => (button.getAttribute('aria-label') ?? '').includes('18:00-20:00')),
    ).toBe(true);
  });

  it('週の設定が空でも日付ブロック由来の時間行を週ごとの用事に表示する', async () => {
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

    await screen.findByRole('heading', { name: '週ごとの用事' });
    const mondayCells = screen.getAllByRole('button').filter((button) => {
      const label = button.getAttribute('aria-label') ?? '';
      return /^月 \d{2}:\d{2}-\d{2}:\d{2}$/.test(label);
    });
    expect(mondayCells.length).toBeGreaterThan(0);
  });
});
