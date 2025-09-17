"use client";

import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { CalendarCheck, Share2, ShieldCheck, Table2 } from "lucide-react";
import siteConfig from "@/lib/site-config";

// 実際の UI の構造に寄せたヒートマッププレビュー用のダミーデータ
const previewAvailability = {
  totalParticipants: 10,
  dates: [
    { label: "3/24(日)" },
    { label: "3/25(月)" },
    { label: "3/26(火)" },
  ],
  timeSlots: ["19:00", "20:00", "21:00"],
  availableMatrix: [
    [7, 5, 2],
    [9, 6, 1],
    [8, 3, 0],
  ],
  bestSlot: {
    dateIndex: 0,
    timeIndex: 1,
    label: "3月24日 (日) 20:00 - 21:00",
    availableCount: 9,
  },
} as const;

const heroHighlights = [
  {
    icon: Share2,
    label: "URL を送るだけで回答受付",
  },
  {
    icon: Table2,
    label: "回答をヒートマップで俯瞰",
  },
  {
    icon: ShieldCheck,
    label: "ログイン不要・広告なしで安心",
  },
] as const;

const maxAvailability = Math.max(...previewAvailability.availableMatrix.flat());

const availabilityToHeatmap = (value: number) => {
  if (maxAvailability === 0) {
    return { level: 0, heatmapClass: "heatmap-0" } as const;
  }

  const ratio = value / maxAvailability;
  const level = Math.max(0, Math.min(10, Math.round(ratio * 10)));
  return { level, heatmapClass: `heatmap-${level}` } as const;
};

export default function HeroSection() {
  return (
    <section className="border-b border-base-200 bg-base-100 py-24 sm:py-28">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
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
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-primary"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CalendarCheck className="h-4 w-4" />
              誰でも迷わず使える日程調整
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
                  className="inline-flex items-center gap-2 rounded-full border border-base-200 bg-base-100 px-4 py-2 text-sm text-base-content/70"
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
                className="btn btn-outline btn-lg w-full border-base-300 text-base-content sm:w-auto"
              >
                サービスの特徴を見る
              </Link>
            </div>
            <div className="mt-10 grid gap-4 text-sm text-base-content/60 sm:grid-cols-3">
              <div className="rounded-2xl border border-base-200 bg-base-100 p-4">
                <p className="text-xs uppercase tracking-wide text-base-content/50">作成最短</p>
                <p className="mt-1 text-2xl font-semibold text-base-content">30 秒</p>
                <p className="mt-1 text-xs text-base-content/60">テンプレートからすぐに候補日を入力</p>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-100 p-4">
                <p className="text-xs uppercase tracking-wide text-base-content/50">参加人数</p>
                <p className="mt-1 text-2xl font-semibold text-base-content">無制限</p>
                <p className="mt-1 text-xs text-base-content/60">URL 共有だけで誰でも参加可能</p>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-100 p-4">
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
            {/* サービスの UI を想起させるヒートマップ付きプレビュー */}
            <div className="relative w-full max-w-md rounded-[32px] border border-base-200 bg-base-100 p-6 shadow-xl">
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
                    <p className="text-sm font-semibold text-base-content/80">バンドリハーサル候補</p>
                    <p className="text-xs text-base-content/60">参加予定 10 名 / 回答済み 10 名</p>
                  </div>
                </div>
                <span className="rounded-full border border-primary/30 px-3 py-1 text-xs font-semibold text-primary">
                  ログイン不要
                </span>
              </div>
              <div className="mt-6 space-y-3">
                <div className="text-sm font-medium text-base-content">回答ヒートマップ</div>
                <div className="overflow-hidden rounded-2xl border border-base-200">
                  <div className="grid grid-cols-[auto_repeat(3,minmax(0,1fr))] text-xs text-base-content/70">
                    <div className="bg-base-100 px-3 py-2 font-medium text-base-content/60">時間</div>
                    {previewAvailability.dates.map((date) => (
                      <div
                        key={date.label}
                        className="border-l border-base-200 bg-base-100 px-3 py-2 text-center font-medium text-base-content"
                      >
                        {date.label}
                      </div>
                    ))}
                    {previewAvailability.timeSlots.map((timeLabel, timeIndex) => (
                      <Fragment key={`time-group-${timeLabel}`}>
                        <div className="border-t border-base-200 bg-base-100 px-3 py-3 text-sm font-medium text-base-content">
                          {timeLabel}
                        </div>
                        {previewAvailability.dates.map((date, dateIndex) => {
                          const availableCount =
                            previewAvailability.availableMatrix[timeIndex][dateIndex];
                          const isBest =
                            previewAvailability.bestSlot.dateIndex === dateIndex &&
                            previewAvailability.bestSlot.timeIndex === timeIndex;
                          const { level, heatmapClass } = availabilityToHeatmap(availableCount);

                          return (
                            <div
                              key={`cell-${timeLabel}-${date.label}`}
                              className={`flex flex-col items-center justify-center border-t border-l border-base-200 px-3 py-3 text-sm font-semibold ${heatmapClass} ${
                                isBest ? "ring-2 ring-success/60" : ""
                              }`}
                            >
                              <span>{availableCount}</span>
                              <span
                                className={`text-[10px] font-medium ${
                                  level >= 6
                                    ? "text-white/80"
                                    : "text-base-content/60"
                                }`}
                              >
                                / {previewAvailability.totalParticipants}
                              </span>
                            </div>
                          );
                        })}
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl border border-success/30 bg-success/10 p-4 text-sm text-success">
                <p className="text-xs font-semibold uppercase tracking-wide">最適候補</p>
                <p className="mt-2 text-base font-semibold text-base-content">
                  {previewAvailability.bestSlot.label}
                </p>
                <p className="mt-1 text-base-content/70">
                  参加者 {previewAvailability.bestSlot.availableCount} / {previewAvailability.totalParticipants} 名が参加可能です。
                </p>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-primary">
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
