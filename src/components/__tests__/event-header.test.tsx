import React from 'react';
import { render } from '@testing-library/react';
import { EventHeader } from '../event-header';
import { FavoriteEventsProvider } from '../favorite-events-context';

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
});
