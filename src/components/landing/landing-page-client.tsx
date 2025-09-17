"use client";

import Link from "next/link";
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

  const howToSteps = [
    {
      title: "イベント作成",
      description:
        "タイトルと候補日をまとめて登録。テンプレートから選ぶだけで初回でも迷いません。",
    },
    {
      title: "リンク共有",
      description:
        "作成された URL を送るだけで参加完了。ログイン不要なので参加者の負担はゼロ。",
    },
    {
      title: "日程確定",
      description:
        "ヒートマップで最適な枠を選んで確定。カレンダー連携でそのまま予定を登録できます。",
    },
  ] as const;

  return (
    <>
      {/* Heroセクションはpage.tsxで表示するためここでは省略 */}
      {/* サービス名の由来・Layeringコンセプト説明 */}
      <section id="concept" className="bg-base-100 py-20 sm:py-24">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={0}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-base-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
                Concept
              </span>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
                サービス名「DaySynth」に込めた意味
              </h2>
              <p className="mt-6 text-base text-base-content/80 sm:text-lg">
                <span className="font-semibold text-primary">Synth</span>
                には「合成（Synthesis）」と「重ね合わせ（Layering）」という二つの思想が宿っています。
                予定を重ねることで全体像を可視化し、最適な一日を合成する──それが DaySynth のコアコンセプトです。
              </p>
              <p className="mt-4 text-sm text-base-content/70">
                参加者全員の予定が音のレイヤーのように一つへとまとまり、調和のとれた日程が生まれます。
              </p>
            </motion.div>
            <motion.div
              className="relative"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
            >
              <div className="grid gap-6">
                {/* キーワードをカード状に並べ、ブランドストーリーを視覚化 */}
                <Card className="rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-primary">Day</div>
                  <p className="mt-3 text-base-content/80">一日単位のスケジュールを扱い、日常の予定調整をなめらかに。</p>
                </Card>
                <Card className="rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-secondary">Synth = Synthesis</div>
                  <p className="mt-3 text-base-content/80">複数の候補情報を統合し、グループ全体にとって最適な選択肢を導き出す。</p>
                </Card>
                <Card className="rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-accent">Synth = Layering</div>
                  <p className="mt-3 text-base-content/80">参加者一人ひとりの予定をレイヤーのように重ね、全体像を視覚的に把握。</p>
                </Card>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-base-100 py-24 sm:py-28">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div
            className="text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <span className="inline-flex items-center justify-center rounded-full bg-base-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
              Product
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
              主な機能
            </h2>
            <p className="mt-4 text-base text-base-content/70 sm:text-lg">
              シンプルな操作で複数人の予定をスマートに調整。視覚的な情報設計で迷わず最適日が見つかります。
            </p>
          </motion.div>
          <div className="mt-14 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={i + 1}
              >
                <Card className="h-full rounded-2xl border border-base-200 bg-base-100 p-6 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                  <div className="flex flex-col gap-4">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <f.icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-semibold text-base-content">{f.title}</h3>
                    <p className="text-sm text-base-content/70">{f.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div
            className="mt-14 rounded-2xl border border-base-200 bg-base-100 p-6 text-center shadow-sm"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={features.length + 2}
          >
            <p className="text-base font-medium text-base-content">
              ヒートマップ表示やカレンダー連携といった高度な機能も、直感的な UI のまま無料で利用できます。
            </p>
          </motion.div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="bg-base-200 py-24 sm:py-28">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={0}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-base-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
                Use Cases
              </span>
              <h2 className="mt-6 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
                活用シーン
              </h2>
              <p className="mt-4 text-base text-base-content/70 sm:text-lg">
                音楽、ビジネス、エンタメ。DaySynth はあらゆる集まりに対応し、グループ全体のベストタイミングを見つけます。
              </p>
              <div className="mt-8 grid gap-4 text-sm text-base-content/70">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  参加者が多いイベントでも回答状況をリアルタイムに把握
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-secondary" />
                  デバイスを問わず、スマホ・PC・タブレットで快適に操作
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-accent" />
                  決まった日程はそのままカレンダーや共有メモへ反映
                </div>
              </div>
            </motion.div>
            <div className="grid gap-6 sm:grid-cols-2">
              {useCases.map((u, i) => (
                <motion.div
                  key={u.title}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.4 }}
                  variants={fadeUp}
                  custom={i + 1}
                >
                  <Card className="h-full rounded-2xl border border-base-200 bg-base-100 p-6 text-left shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md">
                    <div className="flex flex-col gap-4">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <u.icon className="h-6 w-6" />
                      </div>
                      <h3 className="text-xl font-semibold text-base-content">{u.title}</h3>
                      <p className="text-sm text-base-content/70">{u.desc}</p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW-TO */}
      <section className="bg-base-100 py-24 sm:py-28">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div
            className="text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <span className="inline-flex items-center justify-center rounded-full bg-base-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
              Flow
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
              簡単 3 ステップで日程調整
            </h2>
            <p className="mt-4 text-base text-base-content/70 sm:text-lg">
              初めてでも迷わないシンプルな操作フロー。候補日の共有から確定まで、スムーズな体験を提供します。
            </p>
          </motion.div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {howToSteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={index + 1}
              >
                <Card className="h-full rounded-2xl border border-base-200 bg-base-100 p-6 text-left shadow-sm">
                  <div className="flex h-full flex-col gap-4">
                    <span className="text-sm font-semibold uppercase tracking-wide text-primary/80">
                      Step {index + 1 < 10 ? `0${index + 1}` : index + 1}
                    </span>
                    <h3 className="text-xl font-semibold text-base-content">{step.title}</h3>
                    <p className="text-sm text-base-content/70">{step.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div
            className="mt-14 flex justify-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={howToSteps.length + 1}
          >
            <Link href="/create" className="btn btn-primary btn-lg">
              イベントを作成してみる
            </Link>
          </motion.div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="comparison" className="bg-base-100 py-24 sm:py-28">
        <div className="container mx-auto max-w-6xl px-4">
          <motion.div
            className="text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <span className="inline-flex items-center justify-center rounded-full bg-base-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
              Advantage
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
              <span className="text-primary">DaySynth</span> の強み
            </h2>
            <p className="mt-4 text-base text-base-content/70 sm:text-lg">
              他の日程調整サービスと比較しても、DaySynth ならではの体験と機能性が際立ちます。
            </p>
          </motion.div>
          <div className="mt-14 overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-sm">
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead className="bg-base-200 text-base-content">
                  <tr>
                    <th className="text-base">機能</th>
                    <th className="text-base font-semibold">DaySynth</th>
                    <th className="text-base">サービスT</th>
                    <th className="text-base">サービスC</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisons.map((cmp) => (
                    <tr key={cmp.feature} className="text-base-content/80">
                      <td className="font-medium text-base-content">{cmp.feature}</td>
                      <td className="font-semibold text-primary">{cmp.daysynth}</td>
                      <td>{cmp.tappy}</td>
                      <td>{cmp.chouseisan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <motion.div
            className="mt-12 rounded-2xl border border-base-200 bg-base-100 p-6 text-center shadow-sm"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={2}
          >
            <p className="text-base font-medium text-base-content">
              ヒートマップ表示とカレンダー連携、そしてログイン不要の軽快さ。DaySynth はチーム全体の合意形成をこれまで以上に簡単にします。
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-base-100 py-24 sm:py-28">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div
            className="text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <span className="inline-flex items-center justify-center rounded-full bg-base-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
              FAQ
            </span>
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
              よくある質問
            </h2>
          </motion.div>
          <div className="mt-12 space-y-4">
            {faqs.map((f, i) => (
              <motion.div
                key={f.q}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={i + 1}
              >
                <details className="group rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm transition-shadow hover:shadow-md">
                  <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-lg font-medium text-base-content">
                    {f.q}
                    <span className="text-sm text-base-content/50 transition-transform group-open:rotate-45">＋</span>
                  </summary>
                  <div className="mt-3 text-base text-base-content/70">
                    {f.a}
                  </div>
                </details>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENT HISTORY */}
      <section className="bg-base-100 py-20 sm:py-24">
        <div className="container mx-auto max-w-4xl px-4">
          <motion.div
            className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-base-200 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">
              <History className="h-4 w-4" />
              History
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-base-content sm:text-4xl">履歴</h2>
            <p className="text-base text-base-content/70">
              最近チェックしたイベントにすぐアクセスできます。過去の調整を見返して、再利用もワンクリック。
            </p>
          </motion.div>
          <motion.div
            className="mt-10 rounded-2xl border border-base-200 bg-base-100 p-6 shadow-sm"
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
            <div className="mt-6 text-center">
              <Link href="/history" className="btn btn-outline btn-sm">
                すべての履歴を見る
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-base-100 py-24 sm:py-28">
        <motion.div
          className="container mx-auto max-w-4xl px-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={0}
        >
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-10 text-center shadow-sm">
            <h2 className="text-3xl font-bold tracking-tight text-base-content sm:text-4xl">
              今すぐ日程調整をスマートに
            </h2>
            <p className="mt-4 text-base text-base-content/80 sm:text-lg">
              面倒なやり取りはもう不要。ログイン不要・無料で使える DaySynth で、参加者全員が納得する日程を素早く導き出しましょう。
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/create" className="btn btn-primary btn-lg">
                無料でイベントを作成
              </Link>
              <Link href="#features" className="btn btn-outline btn-lg border-base-300 text-base-content">
                機能を詳しく見る
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
