import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import EventAnswerLinkEditor from '@/components/event-client/event-answer-link-editor';
import {
  linkMyParticipantAnswerById,
  unlinkMyParticipantAnswerByEventPublicToken,
} from '@/lib/actions';
import { getEventHistory, setEventHistory } from '@/lib/utils';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/lib/actions', () => ({
  linkMyParticipantAnswerById: jest.fn(),
  unlinkMyParticipantAnswerByEventPublicToken: jest.fn(),
}));

jest.mock('@/lib/utils', () => ({
  getEventHistory: jest.fn(),
  setEventHistory: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;
const mockLinkMyParticipantAnswerById = linkMyParticipantAnswerById as jest.Mock;
const mockUnlinkMyParticipantAnswerByEventPublicToken =
  unlinkMyParticipantAnswerByEventPublicToken as jest.Mock;
const mockGetEventHistory = getEventHistory as jest.Mock;
const mockSetEventHistory = setEventHistory as jest.Mock;

describe('EventAnswerLinkEditor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    mockGetEventHistory.mockReturnValue([
      {
        id: 'event-public-token',
        title: 'イベントA',
        createdAt: '2026-02-25T10:00:00.000Z',
        isCreatedByMe: false,
        answeredByMe: false,
      },
    ]);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    (window.confirm as jest.Mock).mockRestore();
  });

  it('未紐づけ時に編集モードから紐づけ実行できる', async () => {
    mockLinkMyParticipantAnswerById.mockResolvedValue({
      success: true,
      message: '回答をアカウントに紐づけました',
    });
    const onLinkedParticipantIdChange = jest.fn();

    render(
      <EventAnswerLinkEditor
        eventId="event-id"
        eventPublicToken="event-public-token"
        participants={[{ id: 'p1', name: 'テスト太郎' }]}
        linkedParticipantId={null}
        onLinkedParticipantIdChange={onLinkedParticipantIdChange}
      />,
    );

    fireEvent.click(screen.getByTestId('event-answer-link-open'));
    fireEvent.click(screen.getByTestId('event-answer-link-link'));

    await waitFor(() => {
      expect(mockLinkMyParticipantAnswerById).toHaveBeenCalledWith({
        eventId: 'event-id',
        participantId: 'p1',
      });
    });
    expect(onLinkedParticipantIdChange).toHaveBeenCalledWith('p1');
    expect(mockSetEventHistory).toHaveBeenCalledTimes(1);
  });

  it('紐づき済み時に解除できる', async () => {
    mockUnlinkMyParticipantAnswerByEventPublicToken.mockResolvedValue({
      success: true,
      message: '回答の紐づけを解除しました',
    });
    const onLinkedParticipantIdChange = jest.fn();

    render(
      <EventAnswerLinkEditor
        eventId="event-id"
        eventPublicToken="event-public-token"
        participants={[{ id: 'p1', name: 'テスト太郎' }]}
        linkedParticipantId="p1"
        onLinkedParticipantIdChange={onLinkedParticipantIdChange}
      />,
    );

    fireEvent.click(screen.getByTestId('event-answer-link-open'));
    fireEvent.click(screen.getByTestId('event-answer-link-unlink'));

    await waitFor(() => {
      expect(mockUnlinkMyParticipantAnswerByEventPublicToken).toHaveBeenCalledWith(
        'event-public-token',
      );
    });
    expect(onLinkedParticipantIdChange).toHaveBeenCalledWith(null);
    expect(mockSetEventHistory).toHaveBeenCalledTimes(1);
  });
});
