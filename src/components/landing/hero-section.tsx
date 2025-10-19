'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import siteConfig from '@/lib/site-config';

export default function HeroSection() {
  return (
    <section className="from-primary/20 to-base-100 relative flex min-h-[60vh] items-center overflow-hidden bg-gradient-to-b px-2 pb-16 pt-24 sm:px-4 sm:pb-24 sm:pt-32">
      {/* Hero背景装飾SVG */}
      <svg
        className="pointer-events-none absolute left-[-40px] top-[-40px] z-0 block h-[180px] w-[180px] select-none opacity-10 sm:h-[320px] sm:w-[320px] sm:opacity-20"
        viewBox="0 0 320 320"
        fill="none"
      >
        <defs>
          <linearGradient id="hero-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
        </defs>
        <circle cx="160" cy="160" r="160" fill="url(#hero-grad)" />
      </svg>
      <svg
        className="pointer-events-none absolute bottom-[-60px] right-[-30px] z-0 block h-[120px] w-[120px] select-none opacity-5 sm:h-[220px] sm:w-[220px] sm:opacity-10"
        viewBox="0 0 220 220"
        fill="none"
      >
        <defs>
          <linearGradient id="hero-grad2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
        </defs>
        <circle cx="110" cy="110" r="110" fill="url(#hero-grad2)" />
      </svg>
      <div className="container relative z-10 mx-auto flex max-w-6xl flex-col items-center gap-12 sm:flex-row sm:gap-20">
        <motion.div
          className="w-full sm:w-1/2"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={{
            hidden: { opacity: 0, y: 40 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.6, ease: 'easeOut' },
            },
          }}
        >
          <h1 className="text-primary mb-2 text-4xl font-extrabold leading-tight tracking-tight drop-shadow-sm sm:mb-4 sm:text-5xl lg:text-6xl">
            DaySynth
          </h1>
          <h2 className="text-base-content/90 mb-3 text-lg font-bold tracking-wide sm:text-2xl">
            <span className="text-primary mr-2 inline-block align-middle">
              最適日がすぐに見つかる
            </span>
            <span className="text-base-content/70 inline-block align-middle">日程調整アプリ</span>
          </h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="badge badge-primary badge-lg">ログイン不要</span>
            <span className="badge badge-secondary badge-lg">無料</span>
            <span className="badge badge-accent badge-lg">広告なし</span>
          </div>
          <p className="text-base-content/80 mb-4 max-w-xl text-base sm:text-lg">
            バンド練習・会議・ゲームイベントなど、複数候補から最適な日程を
            <mark className="bg-primary/10 text-primary rounded px-1 font-bold">簡単</mark>
            に決定。
            <br className="hidden sm:inline" />
            スマホ・PCどちらでも、誰でも簡単に使えます。
          </p>
          <div className="mb-4 flex min-h-[56px] flex-wrap gap-3 sm:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link
                href="/create"
                className="btn btn-primary btn-lg focus-visible:ring-primary/40 w-full px-6 py-3 text-base shadow-lg focus-visible:ring-4 sm:w-auto"
              >
                今すぐ無料で日程調整を始める
              </Link>
            </motion.div>
            <Link
              href="#concept"
              className="btn btn-outline btn-lg focus-visible:ring-primary/40 w-full px-6 py-3 text-base focus-visible:ring-4 sm:w-auto"
            >
              サービスの特徴を見る
            </Link>
          </div>
        </motion.div>
        <motion.div
          className="relative hidden h-48 w-full overflow-hidden sm:block sm:h-64 sm:w-1/2 md:h-[28rem]"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1, transition: { duration: 0.8 } }}
          viewport={{ once: true, amount: 0.5 }}
        >
          <Image
            src={siteConfig.illustrations.hero}
            alt="DaySynth ロゴとレイヤードイメージ"
            fill
            loading="eager"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={false}
            className="max-h-full max-w-full object-contain drop-shadow-xl"
          />
          {/* レイヤー重ね合わせのイメージを追加 */}
          <div className="bg-primary/20 absolute left-4 top-4 z-10 h-6 w-28 rotate-6 rounded-lg blur-sm" />
          <div className="bg-secondary/20 absolute left-8 top-10 z-20 h-6 w-28 -rotate-3 rounded-lg blur-sm" />
          <div className="bg-accent/20 absolute left-12 top-16 z-30 h-6 w-28 rotate-2 rounded-lg blur-sm" />
        </motion.div>
      </div>
    </section>
  );
}
