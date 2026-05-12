import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  BriefcaseBusiness,
  CalendarCheck2,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Cloud,
  Gamepad2,
  History,
  Layers3,
  Music,
  Share2,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Card from '@/components/layout/Card';
import LandingActivitySection from '@/components/landing/landing-activity-section';
import {
  AnimatedDetails,
  AnimatedItem,
  AnimatedListItem,
} from '@/components/landing/landing-motion';

type IconItem = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

type TextItem = {
  title: string;
  desc: string;
};

type FaqItem = {
  q: string;
  a: string;
};

const values: IconItem[] = [
  {
    icon: CalendarPlus,
    title: '候補日をすぐ作れる',
    desc: '期間と時間帯から一括生成。細かく選びたい時はカレンダーから直接指定できます。',
  },
  {
    icon: Users,
    title: '回答はログイン不要',
    desc: '共有リンクを開いて名前と予定を入れるだけ。参加者側の負担を増やしません。',
  },
  {
    icon: Layers3,
    title: '重なりを見て決められる',
    desc: '回答状況をヒートマップで確認し、集まれる枠を迷わず選べます。',
  },
];

const steps: IconItem[] = [
  { icon: CalendarPlus, title: '作る', desc: 'タイトルと候補枠を設定' },
  { icon: Share2, title: '送る', desc: 'リンクをチャットやメールへ共有' },
  { icon: CheckCircle2, title: '決める', desc: '回答の重なりから日程を確定' },
];

const conceptItems: TextItem[] = [
  {
    title: 'Day',
    desc: '日付と時間帯を、参加者が迷わず選択できます。',
  },
  {
    title: 'Synth',
    desc: '複数人の回答を合成し、候補ごとの集まりやすさを可視化します。',
  },
  {
    title: 'Layering',
    desc: '一人ひとりの予定を重ねることで、全体の重なりを自然に把握できます。',
  },
];

const compactBenefits: IconItem[] = [
  {
    icon: Clock3,
    title: '短時間で作成',
    desc: '最小入力で共有リンクまで進めます。',
  },
  {
    icon: CalendarCheck2,
    title: '確定後も扱いやすい',
    desc: 'Google カレンダーや ICS へ追加できます。',
  },
  {
    icon: History,
    title: '履歴を残せる',
    desc: 'よく使うイベントはお気に入りから戻れます。',
  },
];

const loginBenefits: IconItem[] = [
  {
    icon: Cloud,
    title: '履歴を端末間で引き継げる',
    desc: '作成・閲覧したイベントをアカウントに残せるため、別の端末からでも戻りやすくなります。',
  },
  {
    icon: Star,
    title: 'よく使う予定に戻りやすい',
    desc: 'お気に入りと最近開いたイベントをまとめて確認し、繰り返し使う調整を探しやすくできます。',
  },
  {
    icon: UserCheck,
    title: '自分の予定を次回に活かせる',
    desc: '回答後に自分の予定として反映しておくと、ほかのイベントへの回答が楽になります。',
  },
];

const useCases: IconItem[] = [
  {
    icon: Music,
    title: 'バンド練習',
    desc: 'メンバーとスタジオ枠の都合に合わせて、集まれる時間を決められます。',
  },
  {
    icon: Gamepad2,
    title: 'ゲーム',
    desc: 'レイド、対戦会、配信企画など、夜や週末に偏る候補も見比べやすくなります。',
  },
  {
    icon: BriefcaseBusiness,
    title: '会議・面談',
    desc: '参加者にリンクを送るだけで、候補の重なりを確認して確定できます。',
  },
];

const faqs: FaqItem[] = [
  {
    q: 'ログインは必要ですか？',
    a: '参加者の回答にログインは不要です。履歴同期などを使いたい場合だけログインできます。',
  },
  {
    q: '確定した予定はカレンダーに入れられますか？',
    a: '日程確定後に Google カレンダーや ICS へ追加できるリンクを利用できます。',
  },
  {
    q: 'スマートフォンでも使えますか？',
    a: '作成、回答、確認の各画面をスマートフォンでも操作しやすいように調整しています。',
  },
];

function SectionIntro({
  title,
  description,
  className = 'mb-10 max-w-2xl',
}: {
  title: ReactNode;
  description: string;
  className?: string;
}) {
  return (
    <AnimatedItem className={className}>
      <h2 className="text-base-content text-3xl font-semibold leading-tight sm:text-4xl">
        {title}
      </h2>
      <p className="text-base-content/70 mt-5 leading-8">{description}</p>
    </AnimatedItem>
  );
}

function IconCard({ item, index }: { item: IconItem; index: number }) {
  const Icon = item.icon;

  return (
    <AnimatedItem index={index + 1}>
      <Card className="h-full">
        <Icon className="text-primary mb-5 h-7 w-7" aria-hidden />
        <h3 className="text-lg font-semibold">{item.title}</h3>
        <p className="text-base-content/70 mt-3 text-sm leading-7">{item.desc}</p>
      </Card>
    </AnimatedItem>
  );
}

function CompactBenefit({ item }: { item: IconItem }) {
  const Icon = item.icon;

  return (
    <div className="border-base-300 flex gap-3 rounded-lg border p-5">
      <Icon className="text-primary mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div>
        <h3 className="font-semibold">{item.title}</h3>
        <p className="text-base-content/70 mt-2 text-sm leading-6">{item.desc}</p>
      </div>
    </div>
  );
}

function LoginBenefitRow({ item, index }: { item: IconItem; index: number }) {
  const Icon = item.icon;

  return (
    <AnimatedItem
      index={index + 1}
      className="border-base-300 flex gap-4 border-b p-5 last:border-b-0 sm:p-6"
    >
      <div className="bg-primary/10 text-primary mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <h3 className="text-base-content font-semibold">{item.title}</h3>
        <p className="text-base-content/70 mt-2 text-sm leading-7">{item.desc}</p>
      </div>
    </AnimatedItem>
  );
}

function UseCaseCard({ item, index }: { item: IconItem; index: number }) {
  const Icon = item.icon;

  return (
    <AnimatedItem index={index + 1}>
      <div className="border-base-300 h-full rounded-lg border p-5">
        <Icon className="text-primary h-6 w-6" aria-hidden />
        <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
        <p className="text-base-content/70 mt-3 text-sm leading-7">{item.desc}</p>
      </div>
    </AnimatedItem>
  );
}

function StepCard({ step, index }: { step: IconItem; index: number }) {
  const Icon = step.icon;

  return (
    <AnimatedListItem
      className="border-base-300 bg-base-100 relative rounded-lg border p-5 shadow-sm md:min-h-52 md:p-6"
      index={index + 1}
    >
      <div className="flex items-start justify-between gap-4">
        <span className="text-primary/25 text-5xl font-semibold leading-none md:text-6xl">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="bg-primary/10 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-xl font-semibold">{step.title}</h3>
        <p className="text-base-content/70 mt-3 text-sm leading-7">{step.desc}</p>
      </div>
    </AnimatedListItem>
  );
}

export default function LandingPage() {
  return (
    <>
      <section id="concept" className="border-base-300 bg-base-100 border-b px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <SectionIntro
              className="max-w-2xl"
              title={
                <>
                  <span className="block">DaySynth は、</span>
                  <span className="block">予定の重なりを合成する。</span>
                </>
              }
              description="Synth には「合成」と「重ね合わせ」の意味を込めています。参加者それぞれの予定を重ねて全体像を可視化し、集まれる候補を自然に見つけることができるこのサービスを端的に表しました。"
            />
            <div className="grid gap-4 md:grid-cols-3">
              {conceptItems.map((item, index) => (
                <AnimatedItem key={item.title} index={index + 1}>
                  <Card className="h-full">
                    <h3 className="text-primary text-lg font-semibold">{item.title}</h3>
                    <p className="text-base-content/70 mt-3 text-sm leading-7">{item.desc}</p>
                  </Card>
                </AnimatedItem>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-base-300 bg-base-100 border-b px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <SectionIntro
            title={
              <>
                <span className="inline-block">調整に必要なものだけを、</span>
                <span className="inline-block">順番どおりに。</span>
              </>
            }
            description="候補作成・回答・集計・確定までをひとつの流れにまとめています。説明より先に操作できること、でも迷った時には必要な情報が近くにあることを大切にしています。"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {values.map((item, index) => (
              <IconCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-base-200/50 px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-center">
            <AnimatedItem>
              <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
                <span className="inline-block">3つの操作で、</span>
                <span className="inline-block">日程が決まる。</span>
              </h2>
              <p className="text-base-content/70 mt-5 leading-8">
                バンド練習、ゲーム会、会議など、複数人の予定をひとつの流れで調整できます。主催者も参加者も、次に何をすればよいかが自然に分かります。
              </p>
              <Link href="/create" className="btn btn-primary mt-8 shadow-sm">
                イベントを作成
              </Link>
            </AnimatedItem>
            <ol className="relative grid gap-4 md:grid-cols-3 md:gap-5 md:before:bg-primary/20 md:before:absolute md:before:left-6 md:before:right-6 md:before:top-12 md:before:h-px md:before:content-['']">
              {steps.map((step, index) => (
                <StepCard key={step.title} step={step} index={index} />
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="bg-base-100 px-4 py-16">
        <div className="container mx-auto max-w-5xl">
          <AnimatedItem className="grid gap-4 md:grid-cols-3">
            {compactBenefits.map((item) => (
              <CompactBenefit key={item.title} item={item} />
            ))}
          </AnimatedItem>
        </div>
      </section>

      <section className="border-base-300 bg-base-200/40 border-y px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-center">
            <AnimatedItem>
              <div className="bg-primary/10 text-primary mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </div>
              <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">
                <span className="block">ログインすると、</span>
                <span className="block">次の調整が少し楽になる。</span>
              </h2>
              <p className="text-base-content/70 mt-5 leading-8">
                イベント作成や回答はログインなしで使えます。繰り返し使う場合にはログインすると、履歴や自分の予定をあとから扱いやすくできます。
              </p>
              <Link href="/auth/signin" className="btn btn-outline mt-8">
                ログインして使う
              </Link>
            </AnimatedItem>

            <div className="border-base-300 bg-base-100 rounded-lg border">
              {loginBenefits.map((item, index) => (
                <LoginBenefitRow key={item.title} item={item} index={index} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-base-300 bg-base-100 border-y px-4 py-16">
        <div className="container mx-auto max-w-6xl">
          <SectionIntro
            title="使いやすい場面"
            description="予定調整は、相手に負担をかけないことが大切です。どんな場面でも簡単に、楽に回答できる流れで、集まれる時間を見つけやすくしています。"
          />
          <div className="grid gap-4 md:grid-cols-3">
            {useCases.map((item, index) => (
              <UseCaseCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </div>
      </section>

      <LandingActivitySection />

      <section className="bg-base-100 px-4 py-16">
        <div className="container mx-auto mb-16 max-w-4xl">
          <AnimatedItem>
            <h2 className="text-3xl font-semibold sm:text-4xl">よくある質問</h2>
          </AnimatedItem>
          <div className="divide-base-300 border-base-300 mt-8 divide-y border-y">
            {faqs.map((faq, index) => (
              <AnimatedDetails key={faq.q} className="group py-5" index={index + 1}>
                <summary className="cursor-pointer list-none text-lg font-semibold">
                  {faq.q}
                </summary>
                <p className="text-base-content/70 mt-3 leading-7">{faq.a}</p>
              </AnimatedDetails>
            ))}
          </div>
        </div>
        <AnimatedItem className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">次の予定調整は、これで決まり。</h2>
          <p className="text-base-content/70 mx-auto mt-5 max-w-2xl leading-8">
            候補を作るところから確定後の共有まで、すぐ終わる。簡単に。
          </p>
          <Link href="/create" className="btn btn-primary btn-lg mt-8 shadow-sm">
            無料でイベントを作成
          </Link>
        </AnimatedItem>
      </section>
    </>
  );
}
