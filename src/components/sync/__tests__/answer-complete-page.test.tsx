import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AnswerCompletePage from '@/components/sync/answer-complete-page';
import { saveParticipantAnswerAsUserSchedule } from '@/lib/schedule-actions';

const mockRouterPush = jest.fn();
const mockRouterReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
}));

jest.mock('@/lib/schedule-actions', () => ({
  saveParticipantAnswerAsUserSchedule: jest.fn(),
}));

describe('AnswerCompletePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('保存後に他イベント差分があれば反映確認を質問する', async () => {
    (saveParticipantAnswerAsUserSchedule as jest.Mock).mockResolvedValue({
      success: true,
      message: '自分の予定として保存しました',
      previewCount: 2,
    });

    render(
      <AnswerCompletePage
        eventId="event-1"
        publicToken="token-1"
        participantId="participant-1"
        isAuthenticated={true}
      />,
    );

    expect(screen.getByText('この回答をアカウントに保存しますか？')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(
      await screen.findByText('他の回答済みイベントにも反映しますか？'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '反映する' }));

    expect(mockRouterPush).toHaveBeenCalledWith('/event/token-1/input/sync-review');
  });

  it('保存後に他イベント差分がなければ通知後に結果ページへ自動遷移する', async () => {
    jest.useFakeTimers();
    (saveParticipantAnswerAsUserSchedule as jest.Mock).mockResolvedValue({
      success: true,
      message: '自分の予定として保存しました',
      previewCount: 0,
    });

    render(
      <AnswerCompletePage
        eventId="event-1"
        publicToken="token-1"
        participantId="participant-1"
        isAuthenticated={true}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '保存する' }));

    expect(
      await screen.findByText('他イベントへの反映は不要でした。イベント結果ページへ移動しています。'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(saveParticipantAnswerAsUserSchedule).toHaveBeenCalledWith({
        eventId: 'event-1',
        participantId: 'participant-1',
      });
    });
    jest.advanceTimersByTime(1200);
    await waitFor(() => {
      expect(mockRouterReplace).toHaveBeenCalledWith('/event/token-1');
    });
    jest.useRealTimers();
  });
});
