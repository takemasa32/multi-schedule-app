import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinalizeEventPage from '@/components/event-client/finalize-event-page';
import { finalizeEvent } from '@/lib/actions';

const pushMock = jest.fn();
const replaceMock = jest.fn();
const refreshMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
    refresh: refreshMock,
  }),
}));

jest.mock('@/lib/actions', () => ({
  finalizeEvent: jest.fn(),
}));

describe('FinalizeEventPage', () => {
  const mockProps = {
    eventId: 'event-1',
    publicToken: 'public-1',
    eventTitle: '定例会',
    eventDates: [
      {
        id: 'date-1',
        start_time: '2026-04-01T10:00:00+09:00',
        end_time: '2026-04-01T11:00:00+09:00',
      },
      {
        id: 'date-2',
        start_time: '2026-04-02T10:00:00+09:00',
        end_time: '2026-04-02T11:00:00+09:00',
      },
    ],
    participants: [
      { id: 'p1', name: '田中' },
      { id: 'p2', name: '佐藤' },
    ],
    availabilities: [
      { participant_id: 'p1', event_date_id: 'date-1', availability: true },
      { participant_id: 'p2', event_date_id: 'date-1', availability: true },
      { participant_id: 'p1', event_date_id: 'date-2', availability: true },
      { participant_id: 'p2', event_date_id: 'date-2', availability: false },
    ],
    finalizedDateIds: ['date-1'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.scrollTo = jest.fn();
    (finalizeEvent as jest.Mock).mockResolvedValue({ success: true });
  });

  it('選択ステップから確認ステップへ進める', async () => {
    render(<FinalizeEventPage {...mockProps} />);

    expect(screen.getByText('日程を選ぶ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '内容を確認する' }));

    expect(await screen.findByText('変更内容の確認')).toBeInTheDocument();
    expect(screen.getByText('今回確定する日程')).toBeInTheDocument();
  });

  it('保存確認から確定アクションを実行し、詳細ページへ戻る', async () => {
    render(<FinalizeEventPage {...mockProps} />);

    fireEvent.click(screen.getByRole('button', { name: '内容を確認する' }));
    fireEvent.click(await screen.findByRole('button', { name: 'この内容で保存する' }));
    fireEvent.click(await screen.findByRole('button', { name: '保存する' }));

    await waitFor(() => {
      expect(finalizeEvent).toHaveBeenCalledWith('event-1', ['date-1']);
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith('/event/public-1?finalize_status=saved');
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it('すべて解除する場合は解除モーダルを表示する', async () => {
    render(<FinalizeEventPage {...mockProps} />);

    const selectedSwitch = screen.getByRole('switch', { name: '選択済み' });
    fireEvent.pointerDown(selectedSwitch, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(selectedSwitch, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      buttons: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.click(screen.getByRole('button', { name: '内容を確認する' }));

    expect(await screen.findByRole('button', { name: 'この内容で解除する' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'この内容で解除する' }));
    expect(await screen.findByText('すべての確定を解除しますか？')).toBeInTheDocument();
  });
});
