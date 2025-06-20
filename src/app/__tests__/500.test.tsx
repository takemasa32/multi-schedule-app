import React from 'react';
import { render, screen } from '@testing-library/react';
import ServerError from '../500';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ServerError page', () => {
  it('500ページの内容が表示される', () => {
    render(<ServerError />);
    expect(screen.getByText('500')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /トップページに戻る/ });
    expect(link).toHaveAttribute('href', '/');
  });
});
