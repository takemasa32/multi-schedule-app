import Image from 'next/image';
import siteConfig from '@/lib/site-config';

const heroAlt = '候補日程が重なり最適な時間帯へ集約される概念図';

export default function HeroIllustration() {
  return (
    <div aria-label={heroAlt} className="absolute inset-0" role="img">
      <div className="hero-illustration-light absolute inset-0 opacity-[.56] sm:opacity-[.6] lg:opacity-100">
        <Image
          src={siteConfig.illustrations.hero}
          alt=""
          aria-hidden="true"
          fill
          loading="eager"
          sizes="(max-width: 1024px) 70vw, 50vw"
          priority
          className="object-contain object-right"
        />
      </div>
      <div className="hero-illustration-dark absolute inset-0 opacity-[.42] sm:opacity-[.46] lg:opacity-100">
        <Image
          src={siteConfig.illustrations.heroDark}
          alt=""
          aria-hidden="true"
          fill
          loading="eager"
          sizes="(max-width: 1024px) 70vw, 50vw"
          priority
          className="object-contain object-right"
        />
      </div>
    </div>
  );
}
