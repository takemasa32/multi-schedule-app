"use client";

import Link from "next/link";
import Image from "next/image";
import siteConfig from "@/lib/site-config";
import ThemeSwitcher from "./ThemeSwitcher";
import { useEffect, useState } from "react";

function isPwaOrTwa(): boolean {
  if (typeof window === "undefined") return false;
  const isStandalone = window.matchMedia?.(
    "(display-mode: standalone)"
  )?.matches;
  const isIosStandalone =
    "standalone" in window.navigator && window.navigator.standalone === true;
  const isTwa = document.referrer?.startsWith("android-app://");
  return Boolean(isStandalone || isIosStandalone || isTwa);
}

export default function Header() {
  const [homeHref, setHomeHref] = useState("/");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHomeHref(isPwaOrTwa() ? "/home" : "/");
    }
  }, []);

  return (
    <header className="bg-base-100 fixed top-0 left-0 right-0 z-[100] border-b border-base-300 shadow-sm w-full">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link
          href={homeHref}
          className="flex items-center space-x-2 text-primary"
        >
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
            name=""
          >
            新規イベント作成
          </Link>
          <Link href="/create" className="btn btn-sm btn-primary sm:hidden">
            作成
          </Link>

          <Link
            href={homeHref}
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
