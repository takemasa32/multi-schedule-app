"use client";

import Link from "next/link";
import Image from "next/image";
import siteConfig from "@/lib/site-config";
import ThemeSwitcher from "./ThemeSwitcher";

export default function Header() {
  return (
    <header className="bg-base-100 sticky top-0 z-[100] border-b border-base-300 shadow-sm w-full">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center space-x-2 text-primary">
          <div className="w-8 h-8 relative">
            <Image
              src={siteConfig.logo.svg}
              alt={siteConfig.logo.alt}
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="font-bold text-xl hidden sm:inline">
            {siteConfig.name.full}
          </span>
          <span className="font-bold text-xl sm:hidden">
            {siteConfig.name.short}
          </span>
        </Link>

        <nav className="flex items-center space-x-2 sm:space-x-4">
          <Link
            href="/create"
            className="btn btn-sm btn-primary hidden sm:inline-flex"
          >
            新規イベント作成
          </Link>
          <Link href="/create" className="btn btn-sm btn-primary sm:hidden">
            作成
          </Link>

          <Link
            href="/"
            className="text-sm text-base-content hover:text-primary transition"
          >
            ホーム
          </Link>

          {/* テーマ切り替えボタン */}
          <ThemeSwitcher />
        </nav>
      </div>
    </header>
  );
}
