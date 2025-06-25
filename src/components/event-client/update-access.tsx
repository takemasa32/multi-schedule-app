'use client';
import { useEffect, useTransition } from 'react';
import { updateEventAccess } from '@/lib/actions';

export default function UpdateAccess({ publicToken }: { publicToken: string }) {
  const [, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      try {
        await updateEventAccess(publicToken);
      } catch {
        // ignore errors
      }
    });
  }, [publicToken, startTransition]);

  return null;
}
