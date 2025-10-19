'use client';

import { ThemeProvider as NextThemesProvider, type Attribute } from 'next-themes';
import { type ReactNode } from 'react';

interface ThemeProviderProps {
  children: ReactNode;
  attribute?: Attribute;
  defaultTheme?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  attribute = 'data-theme' as Attribute,
  defaultTheme = 'system',
  enableSystem = true, // OSのカラースキーム設定を優先
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
