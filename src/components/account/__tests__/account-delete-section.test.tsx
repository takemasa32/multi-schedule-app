import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AccountDeleteSection from '@/components/account/account-delete-section';
import { deleteAccount } from '@/lib/account-server-actions';
import { signOut, useSession } from 'next-auth/react';

jest.mock('@/lib/account-server-actions', () => ({
  deleteAccount: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
  useSession: jest.fn(),
}));

const mockUseSession = useSession as jest.Mock;
const mockDeleteAccount = deleteAccount as jest.Mock;
const mockSignOut = signOut as jest.Mock;

describe('AccountDeleteSection', () => {
  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
    };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ status: 'authenticated' });
  });

  it('確認文字が一致するまで削除ボタンが無効', () => {
    render(<AccountDeleteSection />);

    fireEvent.click(screen.getByRole('button', { name: 'アカウントを削除' }));

    const submitButton = screen.getByRole('button', { name: '連携を削除する' });
    expect(submitButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('削除'), { target: { value: '削除' } });
    expect(submitButton).toBeEnabled();
  });

  it('削除成功時にサインアウトする', async () => {
    mockDeleteAccount.mockResolvedValueOnce({ success: true });

    render(<AccountDeleteSection />);

    fireEvent.click(screen.getByRole('button', { name: 'アカウントを削除' }));
    fireEvent.change(screen.getByPlaceholderText('削除'), { target: { value: '削除' } });
    fireEvent.click(screen.getByRole('button', { name: '連携を削除する' }));

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled();
      expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: '/' });
    });
  });
});
