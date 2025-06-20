import siteConfig from '../site-config';

describe('site-config', () => {
  it('基本情報が定義されている', () => {
    expect(siteConfig.name.full).toBe('DaySynth');
    expect(siteConfig.url).toMatch(/^https?:\/\//);
  });

  it('著作権年が現在の年', () => {
    const year = new Date().getFullYear();
    expect(Number(siteConfig.copyright.year)).toBe(year);
  });
});
