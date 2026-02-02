'use client';

import Link from 'next/link';
import Image from 'next/image';
import siteConfig from '@/lib/site-config';
import ThemeSwitcher from './ThemeSwitcher';
import AuthButton from '@/components/auth/auth-button';

export default function Header() {
  return (
    <header className="bg-base-100 border-base-300 fixed left-0 right-0 top-0 z-[100] w-full border-b shadow-sm">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
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
          <span className="hidden text-xl font-bold sm:inline">{siteConfig.name.full}</span>
          <span className="text-xl font-bold sm:hidden">{siteConfig.name.short}</span>
        </Link>

        <nav className="flex items-center space-x-2 sm:space-x-4">
          <Link href="/create" className="btn btn-sm btn-primary hidden sm:inline-flex">
            新規イベント作成
          </Link>
          <Link href="/create" className="btn btn-sm btn-primary sm:hidden">
            作成
          </Link>

          <AuthButton />
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  );
}
