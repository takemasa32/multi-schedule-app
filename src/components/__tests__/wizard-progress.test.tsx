import { render, screen } from '@testing-library/react';
import WizardProgress from '@/components/common/wizard-progress';

const steps = [
  { label: '基本情報', shortLabel: '基本' },
  { label: '候補日程', shortLabel: '候補' },
  { label: '確認・作成', shortLabel: '確認' },
];

describe('WizardProgress', () => {
  test('画面名とステップ一覧だけで現在位置を伝える', () => {
    render(<WizardProgress currentStep={2} steps={steps} currentLabel="候補日程を設定" />);

    expect(screen.getByRole('heading', { name: '候補日程を設定' })).toBeInTheDocument();
    const stepItems = screen.getAllByRole('listitem');
    expect(stepItems).toHaveLength(3);
    expect(stepItems[0]).toHaveTextContent('基本（完了）');
    expect(stepItems[1]).toHaveAttribute('aria-current', 'step');
    expect(stepItems[1]).toHaveTextContent('候補（現在）');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/ステップ 2 \/ 3/)).not.toBeInTheDocument();
  });

  test('最終ステップでも百分率を重複表示しない', () => {
    render(<WizardProgress currentStep={3} steps={steps} currentLabel="確認・作成" />);

    expect(screen.getByRole('heading', { name: '確認・作成' })).toBeInTheDocument();
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    const stepItems = screen.getAllByRole('listitem');
    expect(stepItems[2]).toHaveAttribute('aria-current', 'step');
    expect(stepItems[2]).toHaveTextContent('確認（現在）');
  });
});
