import React from 'react';
import { render, screen } from '@testing-library/react';
import Unauthorized from '../unauthorized/page';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('Unauthorized page', () => {
  it('権限エラーページが表示される', () => {
    render(<Unauthorized />);
    expect(screen.getByText('アクセス権限がありません')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /トップページに戻る/ });
    expect(link).toHaveAttribute('href', '/');
  });
});
