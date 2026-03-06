'use client';

import type { ReactNode } from 'react';

type ConfirmationModalProps = {
  isOpen: boolean;
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonClassName?: string;
  isConfirming?: boolean;
  confirmingLabel?: string;
  children?: ReactNode;
  widthClassName?: string;
};

/**
 * 操作確認用の共通モーダル
 * @param {ConfirmationModalProps} props モーダル表示に必要なプロパティ
 * @returns {JSX.Element | null} 確認モーダル
 */
export default function ConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'キャンセル',
  onConfirm,
  onCancel,
  confirmButtonClassName = 'btn-primary',
  isConfirming = false,
  confirmingLabel,
  children,
  widthClassName = 'max-w-lg',
}: ConfirmationModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`modal-box w-11/12 ${widthClassName}`}>
        <h3 className="text-lg font-bold">{title}</h3>
        {description && <div className="mt-3 text-sm leading-relaxed text-base-content/75">{description}</div>}
        {children && <div className="mt-4">{children}</div>}
        <div className="modal-action flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${confirmButtonClassName}`}
            onClick={onConfirm}
            disabled={isConfirming}
          >
            {isConfirming ? confirmingLabel ?? `${confirmLabel}中...` : confirmLabel}
          </button>
        </div>
      </div>
      <button
        type="button"
        aria-label="確認モーダルを閉じる"
        className="modal-backdrop"
        onClick={onCancel}
      />
    </div>
  );
}
