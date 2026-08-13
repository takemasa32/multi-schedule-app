import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // アンダースコアで始まる変数は意図的に未使用の場合が多いので警告を無視
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Next.js 16.3で追加されたReact Compiler向け規則は既存実装へ段階適用する
      'react-hooks/error-boundaries': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores(['.next/**', 'playwright-report/**', 'test-results/**', 'coverage/**']),
]);

export default eslintConfig;
