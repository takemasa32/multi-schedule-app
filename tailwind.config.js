// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        slideUp: 'slideUp 0.3s ease-out',
        pulse: 'pulse 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  daisyui: {
    themes: [
      {
        light: {
          primary: '#4f46e5',
          'primary-focus': '#4338ca',
          'primary-content': '#ffffff',
          secondary: '#9333ea',
          'secondary-focus': '#7e22ce',
          'secondary-content': '#ffffff',
          accent: '#10b981',
          'accent-focus': '#059669',
          'accent-content': '#ffffff',
          neutral: '#3D4451',
          'base-100': '#FFFFFF',
          'base-200': '#F5F5F5',
          'base-300': '#E5E5E5',
          'base-content': '#1F2937',
          info: '#3ABFF8',
          success: '#10b981',
          warning: '#F59E0B',
          error: '#ef4444',
        },
      },
      {
        daysynth: {
          /* カラーパレット */
          primary: '#2563EB',
          'primary-content': '#ffffff',
          secondary: '#38BDF8',
          'secondary-content': '#1E293B',
          accent: '#06B6D4',
          'accent-content': '#ffffff',
          neutral: '#F1F5F9',
          'neutral-content': '#334155',
          'base-100': '#ffffff',
          'base-200': '#F8FAFC',
          'base-300': '#F1F5F9',
          'base-content': '#1E293B',
          info: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          /* 追加トークン例 */
          '--rounded-btn': '0.5rem', // ボタン角丸 8px
          '--rounded-box': '1rem', // コンテナ角丸 16px
        },
      },
      {
        dark: {
          primary: '#6366F1',
          'primary-content': '#ffffff',
          secondary: '#A78BFA',
          'secondary-content': '#ffffff',
          accent: '#22D3EE',
          'accent-content': '#0F172A',
          neutral: '#1F2937',
          'neutral-content': '#E5E7EB',
          'base-100': '#0F172A', // ダークモードのメイン背景
          'base-200': '#1E293B',
          'base-300': '#334155',
          'base-content': '#F1F5F9',
          info: '#38BDF8',
          success: '#34D399',
          warning: '#FBBF24',
          error: '#F87171',
        },
      },
    ],
    // デフォルトテーマを daysynth に設定
    defaultTheme: 'daysynth',
  },
};
