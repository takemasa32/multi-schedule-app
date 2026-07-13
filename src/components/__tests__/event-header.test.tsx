import React from 'react';
import { render, screen } from '@testing-library/react';
import { EventHeader } from '../event-header';
import { FavoriteEventsProvider } from '../favorite-events-context';

const mockedUsePathname = jest.fn(() => '/event/abc123');

jest.mock('next/navigation', () => ({
  usePathname: () => mockedUsePathname(),
}));

interface ShareEventButtonProps {
  url: string;
  title?: string;
  text?: string;
  className?: string;
}

const mockedShareEventButton = jest.fn();

jest.mock('../share-event-button', () => {
  return {
    __esModule: true,
    default: (props: ShareEventButtonProps) => {
      mockedShareEventButton(props);
      const MockShareEventButton = () => <div data-testid="share-btn" />;
      MockShareEventButton.displayName = 'MockShareEventButton';
      return <MockShareEventButton />;
    },
  };
});

describe('EventHeader', () => {
  beforeEach(() => {
    mockedShareEventButton.mockClear();
    mockedUsePathname.mockReturnValue('/event/abc123');
  });

  it('公開URLにeventIdを使用してShareEventButtonに渡す', () => {
    render(
      <FavoriteEventsProvider>
        <EventHeader eventId="abc123" title="タイトル" description="説明" isFinalized={false} />
      </FavoriteEventsProvider>,
    );
    const { protocol, host } = window.location;
    const expectedUrl = `${protocol}//${host}/event/abc123`;
    expect(mockedShareEventButton).toHaveBeenCalledWith(
      expect.objectContaining({ url: expectedUrl }),
    );
  });

  it('イベント名と重複するアイブロウを表示しない', () => {
    render(
      <FavoriteEventsProvider>
        <EventHeader eventId="abc123" title="タイトル" description="説明" isFinalized={false} />
      </FavoriteEventsProvider>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'タイトル' })).toBeInTheDocument();
    expect(screen.queryByText('EVENT')).not.toBeInTheDocument();
  });

  it('イベント詳細ではタイトルより前にホームへ戻る導線を表示する', () => {
    render(
      <FavoriteEventsProvider>
        <EventHeader eventId="abc123" title="タイトル" description="説明" isFinalized={false} />
      </FavoriteEventsProvider>,
    );

    const backLink = screen.getByRole('link', { name: 'ホームへ戻る' });
    const heading = screen.getByRole('heading', { level: 1, name: 'タイトル' });

    expect(backLink).toHaveAttribute('href', '/');
    expect(backLink.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('イベントの子画面では戻る導線を重複表示しない', () => {
    mockedUsePathname.mockReturnValue('/event/abc123/finalize');

    render(
      <FavoriteEventsProvider>
        <EventHeader eventId="abc123" title="タイトル" description="説明" isFinalized={false} />
      </FavoriteEventsProvider>,
    );

    expect(screen.queryByRole('link', { name: 'ホームへ戻る' })).not.toBeInTheDocument();
  });
});
