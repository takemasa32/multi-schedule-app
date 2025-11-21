'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'framer-motion';
import siteConfig from '@/lib/site-config';
import { HeroScene } from './hero-scene';

/**
 * ランディングページのヒーローセクション
 * - 3DビジュアルをReact Three Fiberでレンダリング
 * - スクロールに応じてテキストや背景をパララックスさせ、没入感を高める
 */
export default function HeroSection() {
  const { scrollYProgress } = useScroll();
  const badgeOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0.35]);
  const gradientShift = useTransform(scrollYProgress, [0, 0.5], ['translateY(0px)', 'translateY(-80px)']);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-base-100 px-3 pb-16 pt-24 sm:px-6 sm:pb-24 sm:pt-32">
      {/* グラデーションの揺らぎエフェクト */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.25),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(56,189,248,0.2),transparent_30%),radial-gradient(circle_at_60%_80%,rgba(168,85,247,0.15),transparent_30%)]"
        style={{ transform: gradientShift }}
      />
      <div className="container relative z-10 mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
        <motion.div
          className="w-full lg:w-[48%]"
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
          <motion.div
            className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 ring-1 ring-white/10"
            style={{ opacity: badgeOpacity }}
          >
            <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden />
            回答集計を自動化 / LPで3Dコンセプトを紹介
          </motion.div>
          <h1 className="text-primary mb-2 text-4xl font-extrabold leading-tight tracking-tight drop-shadow-sm sm:mb-4 sm:text-5xl lg:text-6xl">
            DaySynth
          </h1>
          <h2 className="text-base-content/90 mb-3 text-lg font-bold tracking-wide sm:text-2xl">
            <span className="text-primary mr-2 inline-block align-middle">候補日を重ねて</span>
            <span className="text-base-content/70 inline-block align-middle">最適日を一目で把握</span>
          </h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="badge badge-primary badge-lg">ログイン不要</span>
            <span className="badge badge-secondary badge-lg">無料</span>
            <span className="badge badge-accent badge-lg">広告なし</span>
            <span className="badge badge-outline border-white/20 text-white/80">React Three Fiber</span>
          </div>
          <p className="text-base-content/80 mb-5 max-w-xl text-base sm:text-lg">
            バンド練習・会議・ゲームイベントなど、複数候補から最適な日程を
            <mark className="bg-primary/10 text-primary rounded px-1 font-bold">直感的</mark>
            に決定。
            <br className="hidden sm:inline" />
            本番UIはヒートマップやカレンダーで回答を可視化し、このLPではそのコンセプトを3Dで表現しています。
          </p>
          <div className="mb-5 flex min-h-[56px] flex-wrap gap-3 sm:gap-4">
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
          <div className="text-xs text-white/60">
            LP上の3Dは軽量なプリビューで、実際のアプリはヒートマップ/リストUIで回答を集計します。
          </div>
        </motion.div>
        <motion.div
          className="relative w-full lg:w-[52%]"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1, transition: { duration: 0.8 } }}
          viewport={{ once: true, amount: 0.5 }}
        >
          <HeroScene scrollProgress={scrollYProgress} />
          <div className="absolute inset-x-6 bottom-4 hidden flex-col gap-2 rounded-2xl bg-white/5 p-4 text-white/80 ring-1 ring-white/10 backdrop-blur lg:flex">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" aria-hidden />
              <span className="text-sm font-semibold">回答を重ねる製品UIをLP向けに3D化</span>
            </div>
            <p className="text-xs leading-relaxed">
              製品ではヒートマップ/リストで集計を確認できます。LPではそのレイヤー構造を3Dカードで表現し、重なりのイメージを伝えます。
            </p>
          </div>
          <Image
            src={siteConfig.illustrations.hero}
            alt="DaySynth ロゴとレイヤードイメージ"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            priority={false}
            className="pointer-events-none absolute inset-0 opacity-0"
          />
        </motion.div>
      </div>
    </section>
  );
}
