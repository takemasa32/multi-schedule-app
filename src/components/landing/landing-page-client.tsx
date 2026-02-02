'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CalendarRange,
  Users,
  BarChart2,
  Music,
  Gamepad2,
  Briefcase,
  History,
  CalendarPlus,
  Share2,
  CheckCircle2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import Card from '@/components/layout/Card';
import EventHistory from '@/components/event-history';

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
      transition: { delay: i * 0.12, duration: 0.6, ease: 'easeOut' },
    }),
  } as const;

  const features = [
    {
      icon: CalendarRange,
      title: '複数日程の提案',
      desc: '候補日を自由に追加し、柔軟に調整できます。',
    },
    {
      icon: Users,
      title: 'ログイン不要',
      desc: 'アカウント登録不要。リンクを共有するだけ。',
    },
    {
      icon: BarChart2,
      title: '視覚的な集計',
      desc: 'ヒートマップで最適枠を瞬時に把握。',
    },
    {
      icon: Briefcase,
      title: 'カレンダー登録',
      desc: '日程を確定すると自動でカレンダーリンクが生成。',
    },
  ];

  const useCases = [
    {
      icon: Music,
      title: 'バンド練習',
      desc: 'メンバー全員が集まれるスタジオ枠を即決定。',
    },
    {
      icon: Gamepad2,
      title: 'ゲームイベント',
      desc: '複数候補日でレイドや大会日程を調整。',
    },
    {
      icon: Briefcase,
      title: '社内会議',
      desc: '部署横断のミーティング日程をスマートに。',
    },
  ];

  const howToSteps = [
    {
      title: 'イベント作成',
      description:
        'タイトル・候補日など基本情報を入力するだけで、自動でイベントページを作成できます。',
      icon: CalendarPlus,
      accent: 'primary',
      highlight: '作成したイベントは履歴に自動保存',
    },
    {
      title: 'リンク共有',
      description:
        'ワンクリックで共有リンクをコピー。メールやチャットに貼り付けるだけで参加者に案内できます。',
      icon: Share2,
      accent: 'secondary',
      highlight: '共有はWeb Shareとクリップボードに対応',
    },
    {
      title: '日程確定',
      description:
        '回答状況をリアルタイムで集計。最適枠を選ぶと全員のカレンダーにも同期が可能です。',
      icon: CheckCircle2,
      accent: 'accent',
      highlight: '確定後はGoogle/ICSリンクで簡単に共有可能',
    },
  ] as const;

  const howToAccentStyles = {
    primary: {
      border: 'border-t-4 border-t-primary/60',
      number: 'bg-primary/10 text-primary ring-primary/30',
      icon: 'text-primary',
      highlightBg: 'bg-primary/10',
      highlightText: 'text-primary',
      highlightRing: 'ring-primary/20',
    },
    secondary: {
      border: 'border-t-4 border-t-secondary/60',
      number: 'bg-secondary/10 text-secondary ring-secondary/30',
      icon: 'text-secondary',
      highlightBg: 'bg-secondary/10',
      highlightText: 'text-secondary',
      highlightRing: 'ring-secondary/20',
    },
    accent: {
      border: 'border-t-4 border-t-accent/60',
      number: 'bg-accent/10 text-accent ring-accent/30',
      icon: 'text-accent',
      highlightBg: 'bg-accent/10',
      highlightText: 'text-accent',
      highlightRing: 'ring-accent/20',
    },
  } as const;

  // Comparison data
  const comparisons = [
    {
      feature: 'ログイン不要（履歴同期は任意）',
      daysynth: '○',
      service_a: '△',
      service_b: '○',
    },
    {
      feature: 'ヒートマップ表示',
      daysynth: '○',
      service_a: '○',
      service_b: '×',
    },
    {
      feature: '複数予定管理',
      daysynth: '○',
      service_a: '○',
      service_b: '△',
    },
    {
      feature: 'カレンダー連携',
      daysynth: '○',
      service_a: '×',
      service_b: '×',
    },
    {
      feature: 'モバイル最適化',
      daysynth: '○',
      service_a: '○',
      service_b: '○',
    },
    {
      feature: 'シンプルUI/UX',
      daysynth: '○',
      service_a: '△',
      service_b: '△',
    },
  ];

  const faqs = [
    {
      q: '本当に無料で使えますか？',
      a: 'はい、現在すべての機能を無料でご利用いただけます。',
    },
    {
      q: 'ログインは必要ですか？',
      a: '不要です。必要な場合のみGoogleログインで履歴同期などの機能が使えます。',
    },
    {
      q: '広告は表示されますか？',
      a: 'ユーザー体験を損なう広告は現在、一切表示しません。',
    },
  ];

  return (
    <>
      {/* Heroセクションはpage.tsxで表示するためここでは省略 */}
      {/* サービス名の由来・Layeringコンセプト説明 */}
      <section id="concept" className="bg-base-100 border-base-200 border-b px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            className="mb-4 text-center text-2xl font-bold sm:text-3xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            サービス名「DaySynth」に込めた意味
          </motion.h2>
          <motion.div
            className="text-base-content/80 mb-8 text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            <p className="mb-2">
              <span className="text-primary font-bold">Synth</span>
              には「合成（Synthesis）」と「重ね合わせ（Layering）」の2つの意味を込めています。
            </p>
            <p>
              参加者それぞれの予定を重ねて全体像を可視化し、
              <br className="hidden md:inline" />
              <span className="font-bold">重なり合う情報を一望しながら最適日を生み出す</span>
              ──
              <br />
              それが <span className="text-primary font-bold">DaySynth</span>
              のコンセプトです。
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-primary/10">
              <div className="text-primary mb-1 font-bold">Day</div>
              <div className="text-base-content/80">一日単位のスケジュール、日付を象徴</div>
            </Card>
            <Card className="bg-secondary/10">
              <div className="text-secondary mb-1 font-bold">Synth = Synthesis</div>
              <div className="text-base-content/80">複数の候補情報をまとめて最適解を導き出す</div>
            </Card>
            <Card className="bg-accent/10">
              <div className="text-accent mb-1 font-bold">Synth = Layering</div>
              <div className="text-base-content/80">
                各参加者の予定や時間帯のレイヤーを重ね、全体像を可視化
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="bg-base-100 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            className="mb-4 text-center text-3xl font-bold sm:text-4xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            主な機能
          </motion.h2>
          <motion.p
            className="text-base-content/70 mx-auto mb-14 max-w-2xl text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            シンプル操作で複数人の予定を効率よく調整。さらに便利な追加機能も豊富です。
          </motion.p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="h-full transition-transform hover:scale-[1.03]">
                  <div className="flex flex-col items-center gap-4">
                    <f.icon size={48} className="text-primary" />
                    <h3 className="text-xl font-bold">{f.title}</h3>
                    <p className="text-base-content/80 text-center">{f.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="bg-base-200 px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            className="mb-4 text-center text-3xl font-bold sm:text-4xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            活用シーン
          </motion.h2>
          <motion.p
            className="text-base-content/70 mx-auto mb-14 max-w-2xl text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          >
            あらゆるシチュエーションでスムーズな日程調整を実現します。
          </motion.p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((u, i) => (
              <motion.div
                key={u.title}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={i}
              >
                <Card className="h-full transition-transform hover:scale-[1.03]">
                  <div className="flex flex-col items-center gap-4">
                    <u.icon size={48} className="text-primary" />
                    <h3 className="text-xl font-bold">{u.title}</h3>
                    <p className="text-base-content/80 text-center">{u.desc}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW-TO */}
      <section className="bg-base-100 px-4 py-20 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-center">
            <div>
              <motion.span
                className="border-base-300 bg-base-100 text-base-content/70 inline-flex items-center gap-2 rounded-full border px-4 py-1 text-sm font-medium shadow-sm"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={0}
              >
                <Sparkles className="text-primary h-4 w-4" aria-hidden />
                HOW TO
              </motion.span>
              <motion.h2
                className="text-base-content mt-4 text-3xl font-bold leading-tight sm:text-4xl"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={1}
              >
                簡単 3 ステップで日程調整
              </motion.h2>
              <motion.p
                className="text-base-content/70 mt-4 max-w-xl text-base leading-relaxed"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={2}
              >
                初めてでも迷わないシンプルな操作フロー。回答の集計からカレンダー連携まで、一貫したUIで迷わず進められます。
              </motion.p>
              <motion.div
                className="mt-10 sm:mt-12"
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.4 }}
                variants={fadeUp}
                custom={3}
              >
                <Link
                  href="/create"
                  className="btn btn-primary btn-lg w-full px-5 py-3 text-base shadow transition duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto"
                >
                  イベントを作成してみる
                  <ArrowRight className="ml-2 h-5 w-5" aria-hidden />
                </Link>
              </motion.div>
            </div>
            <motion.ol
              className="grid gap-6 md:grid-cols-3"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeUp}
              custom={1}
            >
              {howToSteps.map((step, index) => {
                const Icon = step.icon;
                const styles = howToAccentStyles[step.accent];

                return (
                  <motion.li
                    key={step.title}
                    className={`border-base-200 bg-base-100 flex h-full flex-col rounded-2xl border p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-md ${styles.border}`}
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, amount: 0.4 }}
                    variants={fadeUp}
                    custom={index + 2}
                  >
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold shadow-sm ring-1 ${styles.number}`}
                        >
                          {index + 1}
                        </span>
                        <Icon className={`h-6 w-6 ${styles.icon}`} aria-hidden />
                      </div>
                      <h3 className="text-base-content mt-5 text-lg font-semibold">{step.title}</h3>
                      <p className="text-base-content/70 mt-3 text-sm leading-relaxed">
                        {step.description}
                      </p>
                      <div className="text-base-content/60 mt-6 flex items-center gap-2 text-xs font-medium">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 shadow-inner ring-1 ${styles.highlightBg} ${styles.highlightText} ${styles.highlightRing}`}
                        >
                          <Sparkles className="h-4 w-4" aria-hidden />
                          {step.highlight}
                        </span>
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ol>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section id="comparison" className="from-primary/10 to-base-200 bg-gradient-to-b px-4 py-20">
        <div className="container mx-auto max-w-6xl">
          <motion.h2
            className="mb-4 text-center text-3xl font-bold sm:text-4xl"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <span className="text-primary">DaySynth</span> の強み
          </motion.h2>
          <motion.p
            className="text-base-content/70 mx-auto mb-10 max-w-2xl text-center"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
          ></motion.p>
          <div className="mb-8 overflow-x-auto rounded-lg shadow-lg">
            <table className="table-zebra table w-full">
              <thead className="bg-primary text-primary-content">
                <tr>
                  <th className="text-base">機能</th>
                  <th className="text-base font-bold">DaySynth</th>
                  <th className="text-base opacity-70">サービスA</th>
                  <th className="text-base opacity-70">サービスB</th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((cmp) => (
                  <tr key={cmp.feature}>
                    <td className="font-medium">{cmp.feature}</td>
                    <td className="text-primary font-bold">{cmp.daysynth}</td>
                    <td>{cmp.service_a}</td>
                    <td>{cmp.service_b}</td>
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
            <div className="badge badge-primary badge-lg mb-4">他にはない特徴</div>
            <p className="mx-auto max-w-3xl text-lg font-medium">
              ヒートマップ表示とカレンダー連携を組み合わせた機能性、 ログイン不要の手軽さが
              <span className="text-primary font-bold">DaySynth</span>
              の最大の魅力です。
            </p>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-base-100 px-4 py-20">
        <div className="container mx-auto max-w-4xl">
          <motion.h2
            className="mb-4 text-center text-3xl font-bold sm:text-4xl"
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
                <details className="collapse-arrow bg-base-200 collapse mb-2">
                  <summary className="collapse-title text-lg font-medium">{f.q}</summary>
                  <div className="collapse-content text-base-content/80">{f.a}</div>
                </details>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENT HISTORY */}
      <section className="bg-base-100 px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            className="mb-6 flex items-center justify-center gap-2"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={0}
          >
            <History className="text-primary h-6 w-6" />
            <h2 className="text-center text-3xl font-bold">履歴・お気に入り</h2>
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
      <section className="from-primary/20 to-base-200 bg-gradient-to-b px-4 py-20">
        <motion.div
          className="container mx-auto max-w-3xl text-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={0}
        >
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">今すぐ日程調整をスマートに</h2>
          <p className="text-base-content/80 mb-10 text-lg">
            面倒なやり取りはもう不要。ログイン不要・無料で始められます。
          </p>
          <Link href="/create" className="btn btn-primary btn-lg shadow-lg">
            無料でイベントを作成
          </Link>
        </motion.div>
      </section>
    </>
  );
}
