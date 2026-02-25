import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import EventHistory from '@/components/event-history';
import {
  clearEventHistory,
  getEventHistory,
  setEventHistory,
  type EventHistoryItem,
} from '@/lib/utils';
import { useSession } from 'next-auth/react';
import { unlinkMyParticipantAnswerByEventPublicToken } from '@/lib/actions';
import { syncEventHistory } from '@/lib/event-history-actions';

jest.mock('next/link', () => {
  return function MockedLink({ href, children, ...rest }: { href: string; children: ReactNode }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  getEventHistory: jest.fn(),
  clearEventHistory: jest.fn(),
  setEventHistory: jest.fn(),
}));

jest.mock('@/lib/event-history-actions', () => ({
  clearServerEventHistory: jest.fn(),
  syncEventHistory: jest.fn(),
}));

jest.mock('@/lib/actions', () => ({
  unlinkMyParticipantAnswerByEventPublicToken: jest.fn(),
}));

jest.mock('@/components/favorite-events-context', () => ({
  FavoriteEventsProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useFavoriteEvents: () => ({
    favorites: [],
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
  }),
}));

const mockUseSession = useSession as jest.Mock;
const mockGetEventHistory = getEventHistory as jest.Mock;
const mockSetEventHistory = setEventHistory as jest.Mock;
const mockUnlinkMyParticipantAnswerByEventPublicToken =
  unlinkMyParticipantAnswerByEventPublicToken as jest.Mock;
const mockSyncEventHistory = syncEventHistory as jest.Mock;

const historyItems: EventHistoryItem[] = [
  {
    id: 'event-1',
    title: '回答済みイベント',
    createdAt: '2026-02-21T12:00:00.000Z',
    isCreatedByMe: false,
    answeredByMe: true,
  },
  {
    id: 'event-2',
    title: '通常イベント',
    createdAt: '2026-02-20T12:00:00.000Z',
    isCreatedByMe: false,
    answeredByMe: false,
  },
];

describe('EventHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockGetEventHistory.mockReturnValue(historyItems);
    mockSyncEventHistory.mockResolvedValue(historyItems);
    mockUnlinkMyParticipantAnswerByEventPublicToken.mockResolvedValue({
      success: true,
      message: '回答の紐づけを解除しました',
    });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    (window.confirm as jest.Mock).mockRestore();
  });

  it('編集モードで回答紐づき解除ボタンを表示できる', async () => {
    render(<EventHistory title="回答履歴" showClearButton={false} enableAnswerLinkEdit={true} />);

    expect(await screen.findByText('回答履歴')).toBeInTheDocument();
    expect(screen.queryByTestId('event-history-unlink-event-1')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('event-history-answer-edit-toggle'));

    expect(screen.getByTestId('event-history-unlink-event-1')).toBeInTheDocument();
    expect(screen.queryByTestId('event-history-unlink-event-2')).not.toBeInTheDocument();
  });

  it('回答紐づきを解除すると状態を更新する', async () => {
    render(<EventHistory title="回答履歴" showClearButton={false} enableAnswerLinkEdit={true} />);

    fireEvent.click(await screen.findByTestId('event-history-answer-edit-toggle'));
    fireEvent.click(screen.getByTestId('event-history-unlink-event-1'));

    await waitFor(() => {
      expect(mockUnlinkMyParticipantAnswerByEventPublicToken).toHaveBeenCalledWith('event-1');
    });
    expect(mockSetEventHistory).toHaveBeenCalled();
    expect(screen.getByText('回答の紐づけを解除しました')).toBeInTheDocument();
  });

  it('履歴クリアを実行できる', async () => {
    (window.confirm as jest.Mock).mockReturnValueOnce(true);

    render(<EventHistory title="回答履歴" showClearButton={true} enableAnswerLinkEdit={true} />);

    fireEvent.click(await screen.findByText('履歴をクリア'));

    await waitFor(() => {
      expect(clearEventHistory).toHaveBeenCalledTimes(1);
    });
  });
});
