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
          primary: '#6366f1',
          'primary-focus': '#4338ca',
          'primary-content': '#ffffff',
          secondary: '#9333ea',
          'secondary-focus': '#7e22ce',
          'secondary-content': '#ffffff',
          accent: '#10b981',
          'accent-focus': '#059669',
          'accent-content': '#0F172A',
          neutral: '#3D4451',
          'base-100': '#FFFFFF',
          'base-200': '#F5F5F5',
          'base-300': '#E5E5E5',
          'base-content': '#1F2937',
          info: '#3ABFF8',
          'info-content': '#0F172A',
          success: '#10b981',
          'success-content': '#0F172A',
          warning: '#F59E0B',
          'warning-content': '#0F172A',
          error: '#DC2626',
          'error-content': '#ffffff',
        },
      },
      {
        dark: {
          primary: '#6366F1',
          'primary-focus': '#4F46E5',
          'primary-content': '#ffffff',
          secondary: '#A78BFA',
          'secondary-content': '#0F172A',
          accent: '#22D3EE',
          'accent-content': '#0F172A',
          neutral: '#1F2937',
          'neutral-content': '#E5E7EB',
          'base-100': '#0F172A', // ダークモードのメイン背景
          'base-200': '#1E293B',
          'base-300': '#334155',
          'base-content': '#F1F5F9',
          info: '#38BDF8',
          'info-content': '#0F172A',
          success: '#34D399',
          'success-content': '#0F172A',
          warning: '#FBBF24',
          'warning-content': '#0F172A',
          error: '#F87171',
          'error-content': '#0F172A',
        },
      },
    ],
    // デフォルトテーマを light に設定
    defaultTheme: 'light',
  },
};
