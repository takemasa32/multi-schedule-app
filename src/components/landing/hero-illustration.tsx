'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import siteConfig from '@/lib/site-config';

const heroAlt = '候補日程が重なり最適な時間帯へ集約される概念図';

export default function HeroIllustration() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';
  const imageSrc = isDark ? siteConfig.illustrations.heroDark : siteConfig.illustrations.hero;

  return (
    <div
      className={
        isDark
          ? 'hero-illustration-dark absolute inset-0 opacity-[.42] sm:opacity-[.46] lg:opacity-100'
          : 'absolute inset-0 opacity-[.56] sm:opacity-[.6] lg:opacity-100'
      }
    >
      <Image
        src={imageSrc}
        alt={heroAlt}
        fill
        loading="eager"
        sizes="(max-width: 1024px) 70vw, 50vw"
        priority
        className="object-contain object-right"
      />
    </div>
  );
}
