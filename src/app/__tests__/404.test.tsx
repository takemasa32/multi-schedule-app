import React from 'react';
import { render, screen } from '@testing-library/react';
import NotFound from '../not-found';

jest.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href}>{children}</a>
    ),
  };
});

describe('NotFound page', () => {
  it('404ページの内容が表示される', () => {
    render(<NotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /トップページに戻る/ });
    expect(link).toHaveAttribute('href', '/');
  });
});
