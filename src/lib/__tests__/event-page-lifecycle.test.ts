import { after } from 'next/server';
import { touchEventLastAccessedIfStale } from '@/lib/actions';
import { deferEventLastAccessedTouch } from '@/lib/event-page-lifecycle';

jest.mock('next/server', () => ({
  after: jest.fn(),
}));

jest.mock('@/lib/actions', () => ({
  touchEventLastAccessedIfStale: jest.fn(),
}));

const mockedAfter = after as jest.MockedFunction<typeof after>;
const mockedTouchEvent = touchEventLastAccessedIfStale as jest.MockedFunction<
  typeof touchEventLastAccessedIfStale
>;

describe('deferEventLastAccessedTouch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('アクセス更新をレスポンス後のコールバックへ登録する', async () => {
    let deferredCallback: (() => unknown) | undefined;
    mockedAfter.mockImplementation((callback) => {
      if (typeof callback === 'function') {
        deferredCallback = callback;
      }
    });

    deferEventLastAccessedTouch('public-token');

    expect(mockedAfter).toHaveBeenCalledTimes(1);
    expect(mockedTouchEvent).not.toHaveBeenCalled();

    await Promise.resolve(deferredCallback?.());

    expect(mockedTouchEvent).toHaveBeenCalledWith('public-token');
  });
});
