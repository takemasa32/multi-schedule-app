import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import AccountPageTour from '@/components/account/account-page-tour';
import { ACCOUNT_PAGE_TOUR_STORAGE_KEY } from '@/lib/account-tour';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;

const renderWithTargets = () =>
  render(
    <>
      <div data-tour-id="account-profile-card">profile</div>
      <div data-tour-id="account-schedule-templates">schedule</div>
      <button data-tour-id="account-dated-edit" type="button">
        edit
      </button>
      <button data-tour-id="account-tab-weekly" type="button">
        weekly
      </button>
      <div data-tour-id="account-sync-section">sync</div>
      <div data-tour-id="account-favorite-history">favorites</div>
      <AccountPageTour initialIsAuthenticated={true} />
    </>,
  );

describe('AccountPageTour', () => {
  beforeEach(() => {
    localStorage.clear();
    mockUseSession.mockReturnValue({ status: 'authenticated' });
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('初回表示時は自動でツアーを開始する', async () => {
    renderWithTargets();
    expect(
      await screen.findByRole('dialog', { name: 'アカウントページの使い方' }),
    ).toBeInTheDocument();
    expect(screen.getByText('アカウント基本情報')).toBeInTheDocument();
  });

  it('スキップ後は自動表示しないが再開ボタンで表示できる', async () => {
    const { unmount } = renderWithTargets();
    expect(
      await screen.findByRole('dialog', { name: 'アカウントページの使い方' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('account-tour-skip'));
    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'アカウントページの使い方' }),
      ).not.toBeInTheDocument();
    });
    expect(localStorage.getItem(ACCOUNT_PAGE_TOUR_STORAGE_KEY)).toContain('"status":"skipped"');

    unmount();
    renderWithTargets();
    expect(
      screen.queryByRole('dialog', { name: 'アカウントページの使い方' }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('account-tour-open'));
    expect(
      await screen.findByRole('dialog', { name: 'アカウントページの使い方' }),
    ).toBeInTheDocument();
  });

  it('次のステップへ進むとマイ予定設定の説明を表示する', async () => {
    renderWithTargets();
    expect(await screen.findByText('アカウント基本情報')).toBeInTheDocument();
    expect(screen.getByText('1 / 7')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('account-tour-next'));
    expect(await screen.findByText('マイ予定設定')).toBeInTheDocument();
    expect(screen.getByText('2 / 7')).toBeInTheDocument();
  });

  it('最後まで進めると完了状態を保存して閉じる', async () => {
    renderWithTargets();
    expect(
      await screen.findByRole('dialog', { name: 'アカウントページの使い方' }),
    ).toBeInTheDocument();

    for (let i = 0; i < 8; i += 1) {
      const next = screen.queryByTestId('account-tour-next');
      if (!next) break;
      fireEvent.click(next);
    }

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: 'アカウントページの使い方' }),
      ).not.toBeInTheDocument();
    });
    expect(localStorage.getItem(ACCOUNT_PAGE_TOUR_STORAGE_KEY)).toContain('"status":"completed"');
  });
});
