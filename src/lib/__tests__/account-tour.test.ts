import {
  ACCOUNT_PAGE_TOUR_STORAGE_KEY,
  ACCOUNT_PAGE_TOUR_VERSION,
  getAccountPageTourState,
  setAccountPageTourState,
  shouldAutoStartAccountPageTour,
} from '@/lib/account-tour';

describe('account-tour', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('未保存時は自動開始対象になる', () => {
    expect(getAccountPageTourState()).toBeNull();
    expect(shouldAutoStartAccountPageTour()).toBe(true);
  });

  it('完了状態を保存して取得できる', () => {
    setAccountPageTourState('completed');
    const state = getAccountPageTourState();

    expect(state).not.toBeNull();
    expect(state?.version).toBe(ACCOUNT_PAGE_TOUR_VERSION);
    expect(state?.status).toBe('completed');
    expect(typeof state?.updatedAt).toBe('string');
    expect(shouldAutoStartAccountPageTour()).toBe(false);
  });

  it('スキップ状態を保存して取得できる', () => {
    setAccountPageTourState('skipped');
    const state = getAccountPageTourState();
    expect(state?.status).toBe('skipped');
    expect(shouldAutoStartAccountPageTour()).toBe(false);
  });

  it('破損したJSONは未保存扱いにフォールバックする', () => {
    localStorage.setItem(ACCOUNT_PAGE_TOUR_STORAGE_KEY, '{invalid-json');
    expect(getAccountPageTourState()).toBeNull();
    expect(shouldAutoStartAccountPageTour()).toBe(true);
  });

  it('バージョン不一致は未保存扱いにする', () => {
    localStorage.setItem(
      ACCOUNT_PAGE_TOUR_STORAGE_KEY,
      JSON.stringify({
        version: 'legacy',
        status: 'completed',
        updatedAt: new Date().toISOString(),
      }),
    );
    expect(getAccountPageTourState()).toBeNull();
    expect(shouldAutoStartAccountPageTour()).toBe(true);
  });
});
