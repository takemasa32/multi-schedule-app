import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import AccountAnswerLinker from '@/components/account/account-answer-linker';
import {
  fetchUnlinkedAnswerCandidates,
  linkMyParticipantAnswerById,
} from '@/lib/actions';

jest.mock('@/lib/actions', () => ({
  fetchUnlinkedAnswerCandidates: jest.fn(),
  linkMyParticipantAnswerById: jest.fn(),
}));

jest.mock('next/link', () => {
  return function MockedLink({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: ReactNode;
  }) {
    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  };
});

const mockFetchUnlinkedAnswerCandidates = fetchUnlinkedAnswerCandidates as jest.Mock;
const mockLinkMyParticipantAnswerById = linkMyParticipantAnswerById as jest.Mock;

describe('AccountAnswerLinker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLinkMyParticipantAnswerById.mockResolvedValue({
      success: true,
      message: '回答をアカウントに紐づけました',
    });
  });

  it('候補がない場合はセクションを表示しない', async () => {
    mockFetchUnlinkedAnswerCandidates.mockResolvedValue([]);

    render(<AccountAnswerLinker />);

    await waitFor(() => {
      expect(mockFetchUnlinkedAnswerCandidates).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByTestId('account-answer-linker')).not.toBeInTheDocument();
  });

  it('候補がある場合はセクションを表示して紐づけ実行できる', async () => {
    mockFetchUnlinkedAnswerCandidates.mockResolvedValue([
      {
        eventId: 'event-1',
        publicToken: 'token-1',
        title: 'テストイベント',
        lastAccessedAt: '2026-02-19T10:00:00.000Z',
        participants: [
          {
            id: 'participant-1',
            name: 'テスト太郎',
            createdAt: '2026-02-19T09:00:00.000Z',
          },
        ],
      },
    ]);

    render(<AccountAnswerLinker />);

    expect(await screen.findByTestId('account-answer-linker')).toBeInTheDocument();
    expect(screen.getByText('未ログイン回答の紐づけ')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('answer-linker-link-event-1'));
    await waitFor(() => {
      expect(mockLinkMyParticipantAnswerById).toHaveBeenCalledWith({
        eventId: 'event-1',
        participantId: 'participant-1',
      });
    });
  });
});
