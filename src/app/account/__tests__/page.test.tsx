import { render, screen } from '@testing-library/react';
import AccountPage from '../page';
import { getAuthSession } from '@/lib/auth';

jest.mock('@/lib/auth', () => ({
  getAuthSession: jest.fn(),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <span data-image-alt={alt} />,
}));

jest.mock('@/components/layout/Breadcrumbs', () => ({
  __esModule: true,
  default: () => <nav aria-label="パンくず">パンくず</nav>,
}));

jest.mock('@/components/auth/account-actions', () => ({
  __esModule: true,
  default: ({ isAuthenticated }: { isAuthenticated: boolean }) => (
    <button type="button">{isAuthenticated ? 'ログアウト' : 'Googleでログイン'}</button>
  ),
}));

jest.mock('@/components/account/account-activity', () => ({
  __esModule: true,
  default: () => <div>アカウントの利用状況</div>,
}));

jest.mock('@/components/account/account-page-tour', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/account/account-delete-section', () => ({
  __esModule: true,
  default: () => <button type="button">アカウントを削除</button>,
}));

const mockGetAuthSession = getAuthSession as jest.Mock;

describe('AccountPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('未ログイン時はゲスト状態を表示し、アカウント削除を表示しない', async () => {
    mockGetAuthSession.mockResolvedValue(null);

    render(await AccountPage());

    expect(screen.getByText('ゲスト')).toBeInTheDocument();
    expect(screen.getByText('現在ログインしていません')).toBeInTheDocument();
    expect(screen.queryByText('未設定')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'アカウントを削除' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Googleでログイン' })).toBeInTheDocument();
  });

  it('ログイン時は名前・メールアドレスとアカウント削除を表示する', async () => {
    mockGetAuthSession.mockResolvedValue({
      user: {
        name: 'テストユーザー',
        email: 'test@example.com',
        image: null,
      },
    });

    render(await AccountPage());

    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'アカウントを削除' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument();
  });
});
