import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import SyncReviewPage from '@/components/sync/sync-review-page';
import {
  applyUserAvailabilitySyncForEvent,
  fetchUserAvailabilitySyncPreview,
  type UserAvailabilitySyncPreviewEvent,
} from '@/lib/schedule-actions';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/lib/schedule-actions', () => ({
  applyUserAvailabilitySyncForEvent: jest.fn(),
  fetchUserAvailabilitySyncPreview: jest.fn(),
}));

const mockUseRouter = useRouter as jest.Mock;
const mockFetchUserAvailabilitySyncPreview = fetchUserAvailabilitySyncPreview as jest.Mock;
const mockApplyUserAvailabilitySyncForEvent = applyUserAvailabilitySyncForEvent as jest.Mock;

const createPreviewEvent = (eventId: string, title: string): UserAvailabilitySyncPreviewEvent => ({
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
      startTime: '2099-05-03T03:00:00Z',
      endTime: '2099-05-03T04:00:00Z',
      currentAvailability: false,
      desiredAvailability: true,
      willChange: true,
      isProtected: false,
    },
  ],
});

describe('SyncReviewPage', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({ replace: mockReplace });
    mockApplyUserAvailabilitySyncForEvent.mockResolvedValue({
      success: true,
      message: 'イベントを更新しました',
      updatedCount: 1,
    });
  });

  it('初回ロード時に差分イベントが0件ならイベント結果ページへ自動遷移する', async () => {
    mockFetchUserAvailabilitySyncPreview.mockResolvedValue([createPreviewEvent('current', '現在イベント')]);

    render(<SyncReviewPage publicToken="public-token" currentEventId="current" />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/event/public-token');
    });
  });

  it('表示対象から現在イベントを除外できる', async () => {
    mockFetchUserAvailabilitySyncPreview.mockResolvedValue([
      createPreviewEvent('current', '現在イベント'),
      createPreviewEvent('other-event', '対象イベント'),
    ]);

    render(<SyncReviewPage publicToken="public-token" currentEventId="current" />);

    expect(await screen.findByTestId('sync-review-event-other-event')).toBeInTheDocument();
    expect(screen.queryByTestId('sync-review-event-current')).not.toBeInTheDocument();
  });

  it('最後のイベントを適用して0件になったら自動遷移する', async () => {
    mockFetchUserAvailabilitySyncPreview
      .mockResolvedValueOnce([createPreviewEvent('other-event', '対象イベント')])
      .mockResolvedValueOnce([createPreviewEvent('current', '現在イベント')]);

    render(<SyncReviewPage publicToken="public-token" currentEventId="current" />);

    const applyButton = await screen.findByTestId('sync-review-apply-other-event');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/event/public-token');
    });
  });

  it('適用失敗時はメッセージを表示してページに残る', async () => {
    mockFetchUserAvailabilitySyncPreview.mockResolvedValue([
      createPreviewEvent('other-event', '対象イベント'),
    ]);
    mockApplyUserAvailabilitySyncForEvent.mockResolvedValue({
      success: false,
      message: 'イベント更新に失敗しました',
      updatedCount: 0,
    });

    render(<SyncReviewPage publicToken="public-token" currentEventId="current" />);

    const applyButton = await screen.findByTestId('sync-review-apply-other-event');
    fireEvent.click(applyButton);

    expect(await screen.findByText('イベント更新に失敗しました')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('反映対象の取得失敗時は0件扱いでリダイレクトせず、再試行導線を表示する', async () => {
    mockFetchUserAvailabilitySyncPreview.mockRejectedValue(new Error('network failed'));

    render(<SyncReviewPage publicToken="public-token" currentEventId="current" />);

    expect(
      await screen.findByText('反映対象の取得に失敗しました。時間をおいて再度お試しください。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再読み込み' })).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
