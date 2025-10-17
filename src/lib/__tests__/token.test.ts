import { generatePublicToken } from '../token';

describe('generatePublicToken', () => {
  it('英数字12文字のトークンを生成する', () => {
    const token = generatePublicToken();
    expect(token).toMatch(/^[0-9a-zA-Z]{12}$/);
  });

  it('連続生成しても重複しにくい', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 1000; i += 1) {
      tokens.add(generatePublicToken());
    }
    expect(tokens.size).toBeGreaterThan(990);
  });
});
