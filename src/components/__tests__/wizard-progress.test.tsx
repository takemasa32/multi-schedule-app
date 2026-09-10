import { render, screen } from '@testing-library/react';
import WizardProgress from '@/components/common/wizard-progress';

const steps = [
  { label: 'イベント情報', shortLabel: 'イベント情報' },
  { label: '候補日程', shortLabel: '候補' },
  { label: '確認・作成', shortLabel: '確認' },
];

describe('WizardProgress', () => {
  test('現在の作業名とコンパクトな進捗で現在位置を伝える', () => {
    render(<WizardProgress currentStep={2} steps={steps} currentLabel="候補日程を設定" />);

    expect(screen.getByRole('heading', { name: '候補日程を設定' })).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
    const progress = screen.getByRole('progressbar', { name: '候補日程を設定（2/3）' });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '3');
    expect(progress).toHaveAttribute('aria-valuenow', '2');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ステップ 2 \/ 3/)).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  test('最終ステップでも百分率を重複表示しない', () => {
    render(<WizardProgress currentStep={3} steps={steps} currentLabel="確認・作成" />);

    expect(screen.getByRole('heading', { name: '確認・作成' })).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
  });
});
