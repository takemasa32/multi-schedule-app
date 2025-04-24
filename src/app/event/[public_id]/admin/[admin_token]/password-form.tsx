'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { verifyAdminPassword } from './page';

interface AdminPasswordFormProps {
  publicId: string;
}

export default function AdminPasswordForm({ publicId }: AdminPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('publicId', publicId);
      formData.append('password', password);

      const response = await verifyAdminPassword(formData);

      if (response.success) {
        router.push(response.redirectTo);
      } else {
        setError(response.error);
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('認証処理中にエラーが発生しました');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2">
      {error && (
        <div className="alert alert-error text-sm mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="form-control">
        <input
          type="password"
          className="input input-bordered w-full"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="管理者パスワードを入力"
          required
        />
      </div>

      <button 
        type="submit" 
        className="btn btn-secondary w-full mt-3" 
        disabled={isSubmitting || !password}
      >
        {isSubmitting ? (
          <>
            <span className="loading loading-spinner loading-sm"></span>
            認証中...
          </>
        ) : 'パスワードで認証する'}
      </button>
    </form>
  );
}