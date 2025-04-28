"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  CalendarRange,
  Users,
  BarChart2,
  Music,
  Gamepad2,
  Briefcase,
} from "lucide-react";
import Card from "@/components/layout/Card";
import siteConfig from "@/lib/site-config";

/**
 * Responsive Landing Page
 * - Hero / Features / UseCases / HowTo / Stats / FAQ / CTA / Footer
 * - Tailwind + DaisyUI + Framer Motion
 */
export default function LandingPageClient() {
  const fadeUp = {
    hidden: { opacity: 0, y: 40 },
    show: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" },
    }),
  } as const;

  const features = [
    {
      icon: CalendarRange,
      title: "複数日程の提案",
      desc: "候補日を自由に追加し、柔軟に調整できます。",
    },
    {
      icon: Users,
      title: "ログイン不要",
      desc: "アカウント登録なし。リンクを共有するだけ。",
    },
    {
      icon: BarChart2,
      title: "視覚的な集計",
      desc: "ヒートマップで最適枠を瞬時に把握。",
    },
    {
      icon: Briefcase,
      title: "カレンダー登録",
      desc: "日程を確定すると自動でカレンダーリンクが生成。",
    },
  ];

  const useCases = [
    {
      icon: Music,
      title: "バンド練習",
      desc: "メンバー全員が集まれるスタジオ枠を即決定。",
    },
    {
      icon: Gamepad2,
      title: "ゲームイベント",
      desc: "複数候補日でレイドや大会日程を調整。",
    },
    {
      icon: Briefcase,
      title: "社内会議",
      desc: "部署横断のミーティング日程をスマートに。",
    },
  ];

  const faqs = [
    {
      q: "本当に無料で使えますか？",
      a: "はい、現在すべての機能を無料でご利用いただけます。",
    },
    {
      q: "広告は表示されますか？",
      a: "ユーザー体験を損なう広告は現在、一切表示しません。",
    },
  ];

  return (
    <>
      {/* HERO */}
      <section className="bg-gradient-to-b from-primary/20 to-base-100 pt-24 pb-16 md:pb-24 px-4">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center gap-12">
          <motion.div
            className="md:w-1/2"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              複数の日程から <br />
              <span className="text-primary">最適な予定</span> を見つけよう
            </h1>
            <p className="text-lg sm:text-xl text-base-content/70 mb-10">
              候補日リンクを共有するだけ。ログイン不要で全員のスケジュールが一目瞭然。
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/create" className="btn btn-primary btn-lg shadow-lg">
                今すぐイベントを作成
              </Link>
              <Link href="#features" className="btn btn-outline btn-lg">
                詳しく見る
              </Link>
            </div>
          </motion.div>

          <motion.div
            className="relative md:w-1/2 h-64 md:h-[28rem]"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{
              opacity: 1,
              scale: 1,
              transition: { duration: 0.8 },
            }}
            viewport={{ once: true, amount: 0.5 }}
          >
            <Image
              src={siteConfig.illustrations.hero}
              alt={siteConfig.logo.alt}
              fill
              priority
              className="object-contain drop-shadow-xl"
            />
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 bg-base-100 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            className="text-center text-3xl sm:text-4xl font-bold mb-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            主な機能
          </motion.h2>
          <motion.p
            className="text-center text-base-content/70 mb-14 max-w-2xl mx-auto"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            シンプル操作で複数人の予定を効率よく調整。さらに便利な追加機能も豊富です。
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="hover:scale-[1.03] transition-transform h-full">
                  <div className="flex flex-col items-center gap-4">
                    <f.icon className="w-12 h-12 text-primary" />
                    <h3 className="font-bold text-xl">{f.title}</h3>
                    <p className="text-base-content/80 text-center">{f.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-20 bg-base-200 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            className="text-center text-3xl sm:text-4xl font-bold mb-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            活用シーン
          </motion.h2>
          <motion.p
            className="text-center text-base-content/70 mb-14 max-w-2xl mx-auto"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            あらゆるシチュエーションでスムーズな日程調整を実現します。
          </motion.p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCases.map((u, i) => (
              <motion.div
                key={u.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="hover:scale-[1.03] transition-transform h-full">
                  <div className="flex flex-col items-center gap-4">
                    <u.icon className="w-12 h-12 text-primary" />
                    <h3 className="font-bold text-xl">{u.title}</h3>
                    <p className="text-base-content/80 text-center">{u.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW-TO */}
      <section className="py-20 bg-base-100 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <motion.h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            簡単 3 ステップで日程調整
          </motion.h2>
          <motion.p
            className="text-base-content/70 mb-12 max-w-2xl mx-auto"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            初めてでも迷わないシンプルな操作フロー。
          </motion.p>
          <ul className="steps steps-vertical md:steps-horizontal w-full md:w-auto mx-auto">
            {["イベント作成", "リンク共有", "日程確定"].map((t, i) => (
              <li key={t} className="step step-primary bg-base-200 shadow">
                <span className="font-semibold">
                  {i + 1}. {t}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-14">
            <Link href="/create" className="btn btn-primary btn-lg shadow-lg">
              イベントを作成してみる
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-base-100 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            className="text-center text-3xl sm:text-4xl font-bold mb-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            よくある質問
          </motion.h2>
          <div className="join join-vertical w-full">
            {faqs.map((f, i) => (
              <motion.div
                key={f.q}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={i}
              >
                <details className="collapse collapse-arrow bg-base-200 mb-2">
                  <summary className="collapse-title text-lg font-medium">
                    {f.q}
                  </summary>
                  <div className="collapse-content text-base-content/80">
                    {f.a}
                  </div>
                </details>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-b from-primary/20 to-base-200 px-4">
        <motion.div
          className="container mx-auto max-w-3xl text-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={0}
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            今す ぐ日程調整をスマートに
          </h2>
          <p className="text-lg mb-10 text-base-content/80">
            面倒なやり取りはもう不要。ログインなし・無料で始められます。
          </p>
          <Link href="/create" className="btn btn-primary btn-lg shadow-lg">
            無料でイベントを作成
          </Link>
        </motion.div>
      </section>
    </>
  );
}
