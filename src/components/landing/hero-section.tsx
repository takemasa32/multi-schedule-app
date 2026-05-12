import Link from 'next/link';
import Image from 'next/image';
import siteConfig from '@/lib/site-config';

export default function HeroSection() {
  return (
    <section className="relative flex min-h-[60vh] items-center overflow-hidden bg-base-100 px-2 pb-10 pt-12 sm:min-h-[70vh] sm:px-4 sm:pb-16 sm:pt-24">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-base-300" />
      <div className="container relative z-10 mx-auto grid max-w-6xl lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:gap-10">
        <div
          className="pointer-events-none absolute -right-28 -top-14 z-0 h-[28rem] w-[40rem] sm:-right-24 sm:-top-20 sm:h-[36rem] sm:w-[54rem] md:-right-16 md:-top-20 md:h-[38rem] md:w-[58rem] lg:relative lg:right-auto lg:top-auto lg:col-start-2 lg:row-start-1 lg:h-[32rem] lg:w-full"
        >
          <div className="absolute inset-0 opacity-[.56] sm:opacity-[.6] lg:opacity-100 [[data-theme=dark]_&]:hidden">
            <Image
              src={siteConfig.illustrations.hero}
              alt="候補日程が重なり最適な時間帯へ集約される概念図"
              fill
              loading="eager"
              sizes="(max-width: 1024px) 70vw, 50vw"
              priority
              className="object-contain object-right"
            />
          </div>
          <div className="hero-illustration-dark absolute inset-0 hidden opacity-[.42] sm:opacity-[.46] lg:opacity-100 [[data-theme=dark]_&]:block">
            <Image
              src={siteConfig.illustrations.heroDark}
              alt="候補日程が重なり最適な時間帯へ集約される概念図"
              fill
              loading="lazy"
              sizes="(max-width: 1024px) 70vw, 50vw"
              className="object-contain object-right"
            />
          </div>
        </div>
        <div className="relative z-10 w-full py-7 sm:py-10 lg:col-start-1 lg:row-start-1 lg:py-0">
          <div className="pointer-events-none absolute -inset-x-4 -inset-y-5 -z-10 bg-gradient-to-r from-base-100 via-base-100/88 to-base-100/16 lg:hidden" />
          <h1 className="mb-4 text-4xl font-semibold leading-[1.05] tracking-normal text-base-content sm:text-5xl lg:text-6xl">
            DaySynth
          </h1>
          <h2 className="mb-5 max-w-xl text-2xl font-semibold leading-relaxed text-base-content sm:text-3xl">
            <span className="block">みんなの予定を重ねて、</span>
            <span className="block">
              <span className="text-primary">集まれる日だけ</span>を見つける。
            </span>
          </h2>
          <p className="mb-7 max-w-xl text-base leading-8 text-base-content/70 sm:text-lg">
            候補を作ってリンクを送るだけ。参加者はログインなしで回答し、ヒートマップから最適な時間をそのまま確定できます。
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div>
              <Link
                href="/create"
                className="btn btn-primary btn-lg focus-visible:ring-primary/40 w-full px-6 text-base shadow-sm focus-visible:ring-4 sm:w-auto"
              >
                日程調整を作成
              </Link>
            </div>
            <Link
              href="#concept"
              className="btn btn-ghost btn-lg focus-visible:ring-primary/30 w-full px-6 text-base focus-visible:ring-4 sm:w-auto"
            >
              使い方を見る
            </Link>
          </div>
          <p className="mt-5 text-sm text-base-content/60">
            無料・広告なし。ログインなしでも回答できます。
          </p>
        </div>
      </div>
    </section>
  );
}
