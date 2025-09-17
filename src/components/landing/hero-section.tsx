"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarCheck, ShieldCheck, Sparkles } from "lucide-react";
import siteConfig from "@/lib/site-config";

// ヒートマップのサンプル濃度を視覚化するためのレベル設定
const heatColorByLevel = [
  "bg-primary/10",
  "bg-primary/20",
  "bg-primary/40",
  "bg-primary/70",
] as const;

// ヒーローセクションで重ね合わせの世界観を伝えるサンプルデータ
const sampleHeatmap = [
  [1, 2, 3, 2],
  [0, 1, 2, 3],
  [0, 1, 2, 2],
] as const;

const heroHighlights = [
  {
    icon: CalendarCheck,
    label: "リンク共有だけで参加",
  },
  {
    icon: Sparkles,
    label: "ヒートマップで最適枠を直感把握",
  },
  {
    icon: ShieldCheck,
    label: "ログイン不要・広告なしで安心",
  },
] as const;

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-base-100 via-base-100 to-primary/5 pt-24 pb-20 sm:pt-32 sm:pb-28">
      {/* 背景に柔らかなグラデーションとグローを追加 */}
      <div className="absolute inset-x-0 top-[-240px] h-[420px] bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-3xl" />
      <div className="absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-gradient-to-br from-secondary/20 via-accent/10 to-transparent blur-3xl" />
      <div className="container relative z-10 mx-auto max-w-7xl px-4">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <motion.div
            className="max-w-2xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            variants={{
              hidden: { opacity: 0, y: 40 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: "easeOut" },
              },
            }}
          >
            <motion.span
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Sparkles className="h-4 w-4" />
              日程調整のストレスを、レイヤーの発想でゼロに
            </motion.span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-base-content sm:text-5xl lg:text-6xl">
              DaySynth で、
              <br className="hidden sm:block" />
              最適な一日を合成する
            </h1>
            <p className="mt-6 text-base text-base-content/80 sm:text-lg">
              バンド練習・会議・ゲームイベントなど、さまざまな予定をレイヤーのように重ね合わせて最適解を導き出す日程調整アプリです。
              候補日の共有から確定まで、誰でも迷わず数分で完了します。
            </p>
            <ul className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {heroHighlights.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full border border-base-200/60 bg-base-100/80 px-4 py-2 text-sm text-base-content/70 shadow-sm backdrop-blur"
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Link
                  href="/create"
                  className="btn btn-primary btn-lg w-full sm:w-auto"
                >
                  今すぐ無料で日程調整を始める
                </Link>
              </motion.div>
              <Link
                href="#concept"
                className="btn btn-outline btn-lg w-full border-primary/30 text-primary sm:w-auto"
              >
                サービスの特徴を見る
              </Link>
            </div>
            <div className="mt-10 grid gap-4 text-sm text-base-content/60 sm:grid-cols-3">
              <div className="rounded-2xl border border-base-200/70 bg-base-100/80 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-base-content/50">作成最短</p>
                <p className="mt-1 text-2xl font-semibold text-base-content">30 秒</p>
                <p className="mt-1 text-xs text-base-content/60">テンプレートからすぐに候補日を入力</p>
              </div>
              <div className="rounded-2xl border border-base-200/70 bg-base-100/80 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-base-content/50">参加人数</p>
                <p className="mt-1 text-2xl font-semibold text-base-content">無制限</p>
                <p className="mt-1 text-xs text-base-content/60">URL 共有だけで誰でも参加可能</p>
              </div>
              <div className="rounded-2xl border border-base-200/70 bg-base-100/80 p-4 backdrop-blur">
                <p className="text-xs uppercase tracking-wide text-base-content/50">料金</p>
                <p className="mt-1 text-2xl font-semibold text-base-content">¥0</p>
                <p className="mt-1 text-xs text-base-content/60">広告なしで全機能が利用できます</p>
              </div>
            </div>
          </motion.div>
          <motion.div
            className="relative hidden h-full w-full justify-self-end sm:flex"
            initial={{ opacity: 0, scale: 0.92 }}
            whileInView={{ opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut" } }}
            viewport={{ once: true, amount: 0.5 }}
          >
            {/* ガラス調のパネルでアプリの世界観を再現 */}
            <div className="absolute -inset-8 rounded-[40px] bg-gradient-to-br from-primary/30 via-accent/20 to-secondary/30 opacity-60 blur-3xl" />
            <div className="relative w-full max-w-md rounded-[36px] border border-base-200/60 bg-base-100/80 p-6 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-primary/10">
                    <Image
                      src={siteConfig.illustrations.hero}
                      alt="DaySynth サンプルイベント"
                      fill
                      sizes="(max-width: 768px) 40vw, 20vw"
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-base-content/80">サンプルイベント</p>
                    <p className="text-xs text-base-content/60">共有リンクからすぐに参加できます</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                  ログイン不要
                </span>
              </div>
              <div className="mt-6 rounded-3xl border border-base-200/60 bg-base-100/70 p-4">
                <div className="flex items-center justify-between text-sm text-base-content/70">
                  <span className="font-semibold text-base-content">候補日のヒートマップ</span>
                  <span>12 名回答</span>
                </div>
                <div className="mt-4 grid gap-3">
                  {sampleHeatmap.map((row, rowIndex) => (
                    <div key={`heatmap-row-${rowIndex}`} className="grid grid-cols-4 gap-3">
                      {row.map((level, cellIndex) => (
                        <div
                          key={`heatmap-cell-${rowIndex}-${cellIndex}`}
                          className={`h-12 w-full rounded-2xl ${heatColorByLevel[level]} transition-colors`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 rounded-3xl bg-primary/10 p-4 text-base-content">
                <p className="text-xs uppercase tracking-wide text-primary">最適候補</p>
                <p className="mt-1 text-lg font-semibold">3月24日 (日) 20:00 - 21:00</p>
                <p className="mt-1 text-sm text-base-content/70">参加者 10 / 12 名が参加可能です。</p>
                <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                  <CalendarCheck className="h-4 w-4" />
                  <span>Google カレンダーにワンクリック追加</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
