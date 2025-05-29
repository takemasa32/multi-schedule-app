"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import siteConfig from "@/lib/site-config";

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-b from-primary/20 to-base-100 pt-24 pb-16 sm:pt-32 sm:pb-24 px-2 sm:px-4 overflow-hidden min-h-[60vh] flex items-center">
      {/* Hero背景装飾SVG */}
      <svg
        className="absolute top-[-40px] left-[-40px] w-[180px] h-[180px] sm:w-[320px] sm:h-[320px] opacity-10 sm:opacity-20 pointer-events-none select-none block z-0"
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
        className="absolute bottom-[-60px] right-[-30px] w-[120px] h-[120px] sm:w-[220px] sm:h-[220px] opacity-5 sm:opacity-10 pointer-events-none select-none block z-0"
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
      <div className="container mx-auto max-w-6xl flex flex-col sm:flex-row items-center gap-12 sm:gap-20 relative z-10">
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
              transition: { duration: 0.6, ease: "easeOut" },
            },
          }}
        >
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-2 sm:mb-4 tracking-tight text-primary drop-shadow-sm">
            DaySynth
          </h1>
          <h2 className="text-lg sm:text-2xl font-bold mb-3 text-base-content/90 tracking-wide">
            <span className="inline-block align-middle mr-2 text-primary">
              最適日がすぐに見つかる
            </span>
            <span className="inline-block align-middle text-base-content/70">
              日程調整アプリ
            </span>
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="badge badge-primary badge-lg">ログイン不要</span>
            <span className="badge badge-secondary badge-lg">無料</span>
            <span className="badge badge-accent badge-lg">広告なし</span>
          </div>
          <p className="text-base sm:text-lg text-base-content/80 mb-4 max-w-xl">
            バンド練習・会議・ゲームイベントなど、複数候補から最適な日程を
            <mark className="bg-primary/10 text-primary font-bold px-1 rounded">
              簡単
            </mark>
            に決定。
            <br className="hidden sm:inline" />
            スマホ・PCどちらでも、誰でも簡単に使えます。
          </p>
          <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 min-h-[56px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link
                href="/create"
                className="btn btn-primary btn-lg py-3 px-6 text-base shadow-lg w-full sm:w-auto focus-visible:ring-4 focus-visible:ring-primary/40"
              >
                今すぐ無料で日程調整を始める
              </Link>
            </motion.div>
            <Link
              href="#concept"
              className="btn btn-outline btn-lg py-3 px-6 text-base w-full sm:w-auto focus-visible:ring-4 focus-visible:ring-primary/40"
            >
              サービスの特徴を見る
            </Link>
          </div>
        </motion.div>
        <motion.div
          className="relative w-full sm:w-1/2 h-48 sm:h-64 md:h-[28rem] overflow-hidden hidden sm:block"
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
            className="object-contain drop-shadow-xl max-w-full max-h-full"
          />
          {/* レイヤー重ね合わせのイメージを追加 */}
          <div className="absolute left-4 top-4 w-28 h-6 bg-primary/20 rounded-lg blur-sm z-10 rotate-6" />
          <div className="absolute left-8 top-10 w-28 h-6 bg-secondary/20 rounded-lg blur-sm z-20 -rotate-3" />
          <div className="absolute left-12 top-16 w-28 h-6 bg-accent/20 rounded-lg blur-sm z-30 rotate-2" />
        </motion.div>
      </div>
    </section>
  );
}
