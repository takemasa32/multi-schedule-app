import { fireEvent, render, screen } from '@testing-library/react';
import TermsCheckbox from '@/components/terms/terms-checkbox';

describe('TermsCheckbox', () => {
  test('ラベルクリックとキーボード操作に使える標準チェックボックスを表示する', () => {
    const onChange = jest.fn();
    render(<TermsCheckbox isChecked={false} onChange={onChange} id="terms-test" />);

    const checkbox = screen.getByRole('checkbox', { name: /利用規約\s*を読み、同意します/ });
    expect(checkbox).toHaveAttribute('id', 'terms-test');
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test('利用規約を別タブで確認できる', () => {
    const onChange = jest.fn();
    render(<TermsCheckbox isChecked={true} onChange={onChange} />);

    const termsLink = screen.getByRole('link', { name: '利用規約' });
    expect(termsLink).toHaveAttribute('href', '/terms');
    expect(termsLink).toHaveAttribute('target', '_blank');

    fireEvent.click(termsLink);
    expect(onChange).not.toHaveBeenCalled();
  });
});
