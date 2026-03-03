'use client';

import Link from 'next/link';
import { easeInOut, easeOut } from 'motion';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Gauge,
  Layers3,
  ShieldCheck,
  Share2,
  Sparkles,
  Users,
  WandSparkles,
  History,
} from 'lucide-react';
import EventHistory from '@/components/event-history';

const featureItems = [
  {
    icon: Layers3,
    title: 'レイヤー可視化ヒートマップ',
    description:
      '参加者の回答を重ね合わせ、確定しやすい時間帯を色の濃淡で直感的に把握できます。',
  },
  {
    icon: Share2,
    title: '共有は1リンクで完結',
    description:
      '作成したイベントをURLで共有するだけ。ログイン不要で参加者の入力をすぐ集められます。',
  },
  {
    icon: CalendarCheck2,
    title: '確定後の連携がスムーズ',
    description:
      '日程確定後にGoogleカレンダーやICS連携へそのまま進めるため、運用負荷を下げられます。',
  },
  {
    icon: ShieldCheck,
    title: 'シンプル設計で迷わない',
    description:
      '回答・集計・確定の導線を最短化。スマホでもPCでも同じ感覚で使えるUIに統一しています。',
  },
] as const;

const flowItems = [
  {
    step: '01',
    title: 'イベントを作成',
    description: 'タイトルと候補日を入力するだけで、すぐに回答ページを生成。',
    icon: WandSparkles,
  },
  {
    step: '02',
    title: '参加者に共有',
    description: 'チャットやメールへURLを貼るだけで、参加者は即回答を開始。',
    icon: Users,
  },
  {
    step: '03',
    title: '最適日を確定',
    description: '回答を一覧で比較し、最適な時間をワンクリックで決定。',
    icon: CheckCircle2,
  },
] as const;

const concerns = [
  '「全員の予定を聞くのに毎回チャットが埋まる」',
  '「候補日が増えるほど集計に時間がかかる」',
  '「最終確定した日時を再共有するのが面倒」',
] as const;

/**
 * LP本体。
 * Motionのスクロール連動アニメーションを中心に、
 * 体験価値を短時間で伝える構成に再設計。
 */
export default function LandingPageClient() {
  const prefersReducedMotion = useReducedMotion() ?? false;

  const sectionVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 28 },
    show: (index: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.08,
        duration: prefersReducedMotion ? 0.01 : 0.55,
        ease: easeOut,
      },
    }),
  } as const;

  return (
    <div className="overflow-hidden">
      <section className="relative isolate px-4 pb-16 pt-12 sm:pb-20 sm:pt-16">
        <motion.div
          className="absolute inset-x-0 top-[-180px] -z-10 mx-auto h-[460px] w-[460px] rounded-full bg-gradient-to-br from-primary/35 via-secondary/20 to-transparent blur-3xl"
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  scale: [1, 1.08, 1],
                  opacity: [0.5, 0.75, 0.5],
                }
          }
          transition={{ duration: 8, repeat: Infinity, ease: easeInOut }}
        />

        <div className="mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)] lg:items-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={sectionVariants}
            custom={0}
          >
            <span className="badge badge-primary badge-lg mb-5 gap-2 px-4 py-3 font-semibold">
              <Sparkles className="h-4 w-4" aria-hidden />
              ログイン不要 / 無料 / スマホ最適化
            </span>
            <h1 className="text-base-content text-4xl leading-tight font-black sm:text-5xl lg:text-6xl">
              日程調整を
              <span className="text-primary inline"> 5分で完了</span>
              できるLP体験へ
            </h1>
            <p className="text-base-content/80 mt-6 max-w-2xl text-base leading-relaxed sm:text-lg">
              DaySynthは、候補日作成・回答収集・確定までを最短導線でつなぐ日程調整サービスです。チーム会議、バンド練習、コミュニティイベントまで、やり取りを減らして決定スピードを上げます。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/create" className="btn btn-primary btn-lg gap-2 shadow-lg">
                無料でイベントを作成
                <ArrowRight className="h-5 w-5" aria-hidden />
              </Link>
              <Link href="#flow" className="btn btn-outline btn-lg">
                使い方を見る
              </Link>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-3 text-center sm:max-w-md">
              {[
                ['最短作成', '30秒'],
                ['回答体験', '1リンク'],
                ['対応端末', 'PC / Mobile'],
              ].map(([label, value]) => (
                <div key={label} className="bg-base-200 rounded-xl px-3 py-4">
                  <dt className="text-base-content/70 text-xs">{label}</dt>
                  <dd className="text-base-content mt-1 text-sm font-bold sm:text-base">{value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, x: prefersReducedMotion ? 0 : 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.35 }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.7, ease: easeOut }}
          >
            <div className="border-base-300 bg-base-100 relative rounded-3xl border p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <p className="text-sm font-semibold">回答ヒートマップのイメージ</p>
                <span className="badge badge-secondary">LIVE</span>
              </div>
              <AnimatedHeatmap prefersReducedMotion={prefersReducedMotion} />
              <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
                <div className="bg-success/15 rounded-lg px-3 py-2">◎ 参加率 87%</div>
                <div className="bg-info/15 rounded-lg px-3 py-2">回答数 18人</div>
                <div className="bg-primary/15 rounded-lg px-3 py-2">候補 6枠</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-base-200/70 px-4 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <motion.h2
            className="text-center text-3xl font-bold sm:text-4xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={sectionVariants}
            custom={0}
          >
            調整業務の悩みを、
            <span className="text-primary">仕組みで解決</span>
          </motion.h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {concerns.map((item, index) => (
              <motion.article
                key={item}
                className="bg-base-100 rounded-2xl p-5 shadow"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={sectionVariants}
                custom={index + 1}
              >
                <Clock3 className="text-primary mb-3 h-5 w-5" aria-hidden />
                <p className="text-base-content/80">{item}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-5 md:grid-cols-2">
          {featureItems.map((feature, index) => (
            <motion.article
              key={feature.title}
              className="border-base-300 bg-base-100 rounded-2xl border p-6 shadow-sm"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              variants={sectionVariants}
              custom={index}
              whileHover={prefersReducedMotion ? undefined : { y: -4 }}
            >
              <feature.icon className="text-primary h-7 w-7" aria-hidden />
              <h3 className="mt-4 text-xl font-bold">{feature.title}</h3>
              <p className="text-base-content/75 mt-3 leading-relaxed">{feature.description}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section id="flow" className="from-primary/10 via-base-100 to-base-100 bg-gradient-to-b px-4 py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <motion.h2
            className="text-center text-3xl font-bold sm:text-4xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.35 }}
            variants={sectionVariants}
            custom={0}
          >
            3ステップで、すぐ使える
          </motion.h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {flowItems.map((item, index) => (
              <motion.article
                key={item.title}
                className="bg-base-100 border-base-300 rounded-2xl border p-6 shadow"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                variants={sectionVariants}
                custom={index + 1}
              >
                <p className="text-primary text-sm font-bold">STEP {item.step}</p>
                <item.icon className="text-secondary mt-3 h-6 w-6" aria-hidden />
                <h3 className="mt-4 text-lg font-bold">{item.title}</h3>
                <p className="text-base-content/75 mt-2 text-sm leading-relaxed">{item.description}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-base-100 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <motion.div
            className="mb-5 flex items-center justify-center gap-2"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={sectionVariants}
            custom={0}
          >
            <History className="text-primary h-6 w-6" aria-hidden />
            <h2 className="text-center text-2xl font-bold sm:text-3xl">最近のイベント履歴</h2>
          </motion.div>
          <EventHistory maxDisplay={5} title="過去に閲覧・作成したイベント" showClearButton={true} />
        </div>
      </section>

      <section className="from-primary/20 to-secondary/15 bg-gradient-to-b px-4 py-16 sm:py-20">
        <motion.div
          className="mx-auto max-w-3xl rounded-3xl bg-base-100/80 p-8 text-center shadow-2xl backdrop-blur"
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, ease: easeOut }}
        >
          <Gauge className="text-primary mx-auto h-8 w-8" aria-hidden />
          <h2 className="mt-4 text-3xl font-black sm:text-4xl">面倒な日程調整を今日で終わらせる</h2>
          <p className="text-base-content/80 mx-auto mt-4 max-w-2xl leading-relaxed">
            DaySynthなら、連絡・集計・確定の分断をなくし、チームの意思決定スピードを上げられます。
          </p>
          <Link href="/create" className="btn btn-primary btn-lg mt-8 gap-2">
            今すぐ無料で始める
            <ArrowRight className="h-5 w-5" aria-hidden />
          </Link>
        </motion.div>
      </section>
    </div>
  );
}

/**
 * ヒーロー領域で使用するSVGヒートマップ。
 * pathLengthとscaleを使って「集計が進む感覚」を演出する。
 */
function AnimatedHeatmap({ prefersReducedMotion }: { prefersReducedMotion: boolean }) {
  const cells = Array.from({ length: 15 }, (_, index) => {
    const intensity = (index % 5) + 1;
    return {
      id: index,
      delay: index * 0.05,
      opacity: 0.2 + intensity * 0.14,
      x: (index % 5) * 56,
      y: Math.floor(index / 5) * 46,
    };
  });

  return (
    <svg viewBox="0 0 280 160" className="w-full" role="img" aria-label="回答ヒートマップ">
      <motion.rect
        x="2"
        y="2"
        width="276"
        height="156"
        rx="18"
        className="fill-base-200 stroke-primary/25"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: prefersReducedMotion ? 0.01 : 1, ease: easeOut }}
      />
      {cells.map((cell) => (
        <motion.rect
          key={cell.id}
          x={18 + cell.x}
          y={22 + cell.y}
          width="42"
          height="32"
          rx="8"
          className="fill-primary"
          initial={{ opacity: 0, scale: prefersReducedMotion ? 1 : 0.8 }}
          whileInView={{ opacity: cell.opacity, scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: cell.delay, duration: prefersReducedMotion ? 0.01 : 0.35 }}
        />
      ))}
      <motion.path
        d="M22 136C70 122 108 88 148 94C188 100 208 136 258 120"
        fill="none"
        className="stroke-secondary"
        strokeWidth="4"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.95 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5, duration: prefersReducedMotion ? 0.01 : 1.1, ease: easeInOut }}
      />
    </svg>
  );
}
