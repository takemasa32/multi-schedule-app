'use client';

import { useRef, useState, useTransition } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { deleteAccount } from '@/lib/account-server-actions';

const DELETE_CONFIRM_TEXT = '削除';

export default function AccountDeleteSection() {
  const { status } = useSession();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const isAuthenticated = status === 'authenticated';
  const isDisabled = !isAuthenticated || confirmation !== DELETE_CONFIRM_TEXT || isPending;

  const handleOpen = () => {
    dialogRef.current?.showModal();
  };

  const handleClose = () => {
    dialogRef.current?.close();
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await deleteAccount(formData);
      if (result?.success) {
        await signOut({ callbackUrl: '/' });
        return;
      }
      setMessage(result?.message ?? 'アカウント削除に失敗しました。');
    });
  };

  return (
    <>
      <button type="button" onClick={handleOpen} className="btn btn-outline btn-error btn-sm">
        アカウントを削除
      </button>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box space-y-4">
          <div>
            <h2 className="text-error text-lg font-semibold">連携解除・アカウント削除</h2>
            <p className="text-base-content/70 text-sm">
              Google連携とアカウント情報を削除します。削除後は復元できません。
            </p>
          </div>

          {!isAuthenticated && (
            <p className="text-base-content/60 text-sm">この操作にはログインが必要です。</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-sm">
              確認のため「{DELETE_CONFIRM_TEXT}」と入力してください
              <input
                name="confirmation"
                type="text"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                className="input input-bordered mt-2 w-full"
                placeholder="削除"
                autoComplete="off"
                disabled={!isAuthenticated || isPending}
              />
            </label>

            {message && <p className="text-error text-sm">{message}</p>}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={handleClose} className="btn btn-ghost">
                閉じる
              </button>
              <button type="submit" className="btn btn-error" disabled={isDisabled}>
                {isPending ? '削除中…' : '連携を削除する'}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button type="submit">close</button>
        </form>
      </dialog>
    </>
  );
}
