import { randomBytes } from 'crypto';

const PUBLIC_TOKEN_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const PUBLIC_TOKEN_LENGTH = 12;
const ALPHABET_LENGTH = PUBLIC_TOKEN_ALPHABET.length;
const ACCEPTABLE_RANGE = Math.floor(256 / ALPHABET_LENGTH) * ALPHABET_LENGTH;

/**
 * 公開用トークンを生成する
 * URL共有しやすい英数字のみ、固定長で生成する
 *
 * @returns 生成した公開トークン
 */
export function generatePublicToken(): string {
  let token = '';

  // 望ましい長さに達するまで乱数を生成し続ける
  while (token.length < PUBLIC_TOKEN_LENGTH) {
    const bytes = randomBytes(PUBLIC_TOKEN_LENGTH);

    for (let i = 0; i < bytes.length && token.length < PUBLIC_TOKEN_LENGTH; i += 1) {
      const value = bytes[i];

      // アルファベット範囲に収まる値のみ採用し、偏りを避ける
      if (value < ACCEPTABLE_RANGE) {
        const index = value % ALPHABET_LENGTH;
        token += PUBLIC_TOKEN_ALPHABET[index];
      }
    }
  }

  return token;
}
