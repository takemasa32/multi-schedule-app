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
  History,
} from "lucide-react";
import Card from "@/components/layout/Card";
import siteConfig from "@/lib/site-config";
import EventHistory from "@/components/event-history";

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

  // Comparison data
  const comparisons = [
    {
      feature: "ログイン不要",
      daysynth: "○",
      tappy: "△",
      chouseisan: "○",
    },
    {
      feature: "ヒートマップ表示",
      daysynth: "○",
      tappy: "○",
      chouseisan: "×",
    },
    {
      feature: "複数予定管理",
      daysynth: "○",
      tappy: "○",
      chouseisan: "△",
    },
    {
      feature: "カレンダー連携",
      daysynth: "○",
      tappy: "×",
      chouseisan: "×",
    },
    {
      feature: "モバイル最適化",
      daysynth: "○",
      tappy: "○",
      chouseisan: "○",
    },
    {
      feature: "シンプルUI/UX",
      daysynth: "○",
      tappy: "△",
      chouseisan: "△",
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
      {/* HERO + ブランドメッセージ */}
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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-4">
              <span className="text-primary">DaySynth</span>
            </h1>
            <div className="mb-4">
              <span className="inline-block text-lg font-bold text-primary bg-primary/10 rounded px-2 py-1 mr-2">
                候補を重ね、最適日をシンセする。
              </span>
            </div>
            <p className="text-lg sm:text-xl text-base-content/80 mb-2">
              「Synth」には“合成”だけでなく「重ねる」意味も込めています。
            </p>
            <p className="text-base-content/70 mb-6">
              参加者それぞれの予定を重ね合わせ、
              <br className="hidden md:inline" />
              <span className="font-bold text-primary">
                重なり合う情報からベストな日程を一瞬で導き出す
              </span>
              新しい日程調整体験を。
            </p>
            <div className="flex flex-wrap gap-4 mb-4">
              <Link href="/create" className="btn btn-primary btn-lg shadow-lg">
                今すぐイベントを作成
              </Link>
              <Link href="#concept" className="btn btn-outline btn-lg">
                サービスの特徴
              </Link>
            </div>
            <div className="text-base-content/60 text-sm">
              <span className="font-semibold">タグライン：</span>
              「あなたのレイヤーを合成し、理想の一日へ。」
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
            {/* レイヤー重ね合わせのイメージを追加 */}
            <div className="absolute left-8 top-8 w-40 h-8 bg-primary/20 rounded-lg blur-sm z-10 rotate-6" />
            <div className="absolute left-16 top-16 w-40 h-8 bg-secondary/20 rounded-lg blur-sm z-20 -rotate-3" />
            <div className="absolute left-24 top-24 w-40 h-8 bg-accent/20 rounded-lg blur-sm z-30 rotate-2" />
          </motion.div>
        </div>
      </section>

      {/* サービス名の由来・Layeringコンセプト説明 */}
      <section
        id="concept"
        className="py-16 bg-base-100 px-4 border-b border-base-200"
      >
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            className="text-2xl sm:text-3xl font-bold mb-4 text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            サービス名「DaySynth」に込めた意味
          </motion.h2>
          <motion.div
            className="text-base-content/80 text-center mb-8"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            <p className="mb-2">
              <span className="font-bold text-primary">Synth</span>{" "}
              には「合成（Synthesis）」と「重ね合わせ（Layering）」の2つの意味を込めています。
            </p>
            <p>
              参加者それぞれの予定を重ねて全体像を可視化し、
              <br className="hidden md:inline" />
              <span className="font-bold">
                重なり合う情報を一望しながら最適日を生み出す
              </span>
              ──
              <br />
              それが <span className="font-bold text-primary">
                DaySynth
              </span>{" "}
              のコンセプトです。
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-primary/10">
              <div className="font-bold text-primary mb-1">Day</div>
              <div className="text-base-content/80">
                一日単位のスケジュール、日付を象徴
              </div>
            </Card>
            <Card className="bg-secondary/10">
              <div className="font-bold text-secondary mb-1">
                Synth = Synthesis
              </div>
              <div className="text-base-content/80">
                複数の候補情報をまとめて最適解を導き出す
              </div>
            </Card>
            <Card className="bg-accent/10">
              <div className="font-bold text-accent mb-1">Synth = Layering</div>
              <div className="text-base-content/80">
                各参加者の予定や時間帯のレイヤーを重ね、全体像を可視化
              </div>
            </Card>
          </div>
          <div className="mt-8 text-center text-base-content/70">
            <span className="font-semibold">ブランドメッセージ：</span>
            <span className="ml-2">
              「情報を重ね合わせ、ベストな日程を一瞬で見つける。」
            </span>
          </div>
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

      {/* COMPARISON */}
      <section
        id="comparison"
        className="py-20 bg-gradient-to-b from-primary/10 to-base-200 px-4"
      >
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            className="text-center text-3xl sm:text-4xl font-bold mb-4"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <span className="text-primary">DaySynth</span> の強み
          </motion.h2>
          <motion.p
            className="text-center text-base-content/70 mb-10 max-w-2xl mx-auto"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            他の日程調整サービスと比較すると、
            <span className="font-bold text-primary">DaySynth</span>
            の優位性が明確です。
          </motion.p>
          <div className="overflow-x-auto mb-8 shadow-lg rounded-lg">
            <table className="table table-zebra w-full">
              <thead className="bg-primary text-primary-content">
                <tr>
                  <th className="text-base">機能</th>
                  <th className="text-base font-bold">DaySynth</th>
                  <th className="text-base opacity-70">サービスT</th>
                  <th className="text-base opacity-70">サービスC</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((cmp) => (
                  <tr key={cmp.feature}>
                    <td className="font-medium">{cmp.feature}</td>
                    <td className="font-bold text-primary">{cmp.daysynth}</td>
                    <td>{cmp.tappy}</td>
                    <td>{cmp.chouseisan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <motion.div
            className="text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={2}
          >
            <div className="badge badge-primary badge-lg mb-4">
              他にはない特徴
            </div>
            <p className="text-lg font-medium max-w-3xl mx-auto">
              ヒートマップ表示とカレンダー連携を組み合わせた機能性、
              ログイン不要の手軽さが
              <span className="text-primary font-bold">DaySynth</span>
              の最大の魅力です。
            </p>
          </motion.div>
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

      {/* EVENT HISTORY */}
      <section className="py-16 bg-base-100 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="flex items-center justify-center gap-2 mb-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <History className="w-6 h-6 text-primary" />
            <h2 className="text-center text-3xl font-bold">履歴</h2>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            <EventHistory
              maxDisplay={5}
              title="過去に閲覧・作成したイベント"
              showClearButton={true}
            />

            <div className="mt-4 text-center">
              <Link href="/history" className="btn btn-outline btn-sm">
                すべての履歴を見る
              </Link>
            </div>
          </motion.div>
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
