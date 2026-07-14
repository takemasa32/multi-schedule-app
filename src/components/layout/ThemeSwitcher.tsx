'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';

export default function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  // useEffectはクライアントサイドでのみ実行
  useEffect(() => {
    setMounted(true);
  }, []);

  // ハイドレーションの問題を避けるため、マウント前はレンダリングしない
  if (!mounted) {
    return <div className="h-10 w-10"></div>;
  }

  const toggleTheme = () => {
    if (resolvedTheme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="btn btn-icon btn-ghost btn-circle"
      aria-label="テーマ切り替え"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="size-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Moon className="size-5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}
