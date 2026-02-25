export const ACCOUNT_PAGE_TOUR_STORAGE_KEY = 'account_page_tour_state_v1';
export const ACCOUNT_PAGE_TOUR_VERSION = 'v1';

export type AccountPageTourStatus = 'completed' | 'skipped';

export type AccountPageTourState = {
  version: typeof ACCOUNT_PAGE_TOUR_VERSION;
  status: AccountPageTourStatus;
  updatedAt: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isValidStatus = (value: unknown): value is AccountPageTourStatus =>
  value === 'completed' || value === 'skipped';

/**
 * アカウントページツアーの保存状態を取得する。
 *
 * @returns {AccountPageTourState | null} 保存済み状態。未保存または不正値の場合は null。
 */
export const getAccountPageTourState = (): AccountPageTourState | null => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(ACCOUNT_PAGE_TOUR_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.version !== ACCOUNT_PAGE_TOUR_VERSION) return null;
    if (!isValidStatus(parsed.status)) return null;
    if (typeof parsed.updatedAt !== 'string') return null;

    return {
      version: ACCOUNT_PAGE_TOUR_VERSION,
      status: parsed.status,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
};

/**
 * アカウントページツアーの終了状態を保存する。
 *
 * @param {AccountPageTourStatus} status 保存する終了状態（完了 / スキップ）
 * @returns {void}
 */
export const setAccountPageTourState = (status: AccountPageTourStatus): void => {
  if (typeof window === 'undefined') return;

  const state: AccountPageTourState = {
    version: ACCOUNT_PAGE_TOUR_VERSION,
    status,
    updatedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(ACCOUNT_PAGE_TOUR_STORAGE_KEY, JSON.stringify(state));
};

/**
 * 自動表示対象かどうかを判定する。
 *
 * @returns {boolean} 未保存の場合 true。保存済みの場合 false。
 */
export const shouldAutoStartAccountPageTour = (): boolean => getAccountPageTourState() === null;
