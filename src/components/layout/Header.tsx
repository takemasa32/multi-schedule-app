'use client';

import Link from 'next/link';
import Image from 'next/image';
import siteConfig from '@/lib/site-config';
import ThemeSwitcher from './ThemeSwitcher';
import AuthButton from '@/components/auth/auth-button';

export default function Header() {
  return (
    <header className="bg-base-100/95 border-base-300 fixed inset-x-0 top-0 z-[100] w-full border-b backdrop-blur-sm">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-primary flex items-center space-x-2">
          <div className="relative h-8 w-8">
            <Image
              src={siteConfig.logo.svg}
              alt={siteConfig.logo.alt}
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="hidden text-lg font-semibold tracking-tight sm:inline">
            {siteConfig.name.full}
          </span>
          <span className="text-lg font-semibold tracking-tight sm:hidden">
            {siteConfig.name.short}
          </span>
        </Link>

        <nav aria-label="主要ナビゲーション" className="flex items-center gap-1.5 sm:gap-3">
          <Link href="/create" className="btn btn-sm btn-primary hidden min-h-10 sm:inline-flex">
            新規イベント作成
          </Link>
          <Link href="/create" className="btn btn-sm btn-primary min-h-10 sm:hidden">
            作成
          </Link>

          <AuthButton />
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  );
}
