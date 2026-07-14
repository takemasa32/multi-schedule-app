import { render, screen } from '@testing-library/react';
import Link from 'next/link';
import StatusPage from '@/components/common/status-page';

describe('StatusPage', () => {
  test('状態説明と復帰操作を一つのランドマーク内に表示する', () => {
    render(
      <StatusPage
        marker={<span>404</span>}
        title="ページが見つかりません"
        description={<p>URLを確認してください。</p>}
        actions={<Link href="/">トップページに戻る</Link>}
        support={<p>問題が続く場合はお問い合わせください。</p>}
      />,
    );

    const main = screen.getByRole('main');
    expect(main).toContainElement(screen.getByRole('heading', { level: 1 }));
    expect(screen.getByText('URLを確認してください。')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'トップページに戻る' })).toHaveAttribute('href', '/');
    expect(screen.getByText('問題が続く場合はお問い合わせください。')).toBeInTheDocument();
  });

  test('補足がない場合は空の補足領域を作らない', () => {
    const { container } = render(
      <StatusPage
        title="処理に失敗しました"
        description={<p>もう一度お試しください。</p>}
        actions={<button type="button">再試行</button>}
      />,
    );

    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument();
    expect(container.querySelectorAll('.text-base-content\\/60')).toHaveLength(0);
  });
});
