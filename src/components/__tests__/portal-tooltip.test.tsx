import { fireEvent, render, screen } from '@testing-library/react';
import PortalTooltip from '@/components/common/portal-tooltip';
import { calcTooltipPosition } from '@/lib/tooltip-utils';

jest.mock('@/lib/tooltip-utils', () => ({
  calcTooltipPosition: jest.fn(),
}));

const mockedCalcTooltipPosition = calcTooltipPosition as jest.MockedFunction<
  typeof calcTooltipPosition
>;

describe('PortalTooltip', () => {
  beforeEach(() => {
    mockedCalcTooltipPosition.mockReturnValue({ x: 100, y: 120 });
    document.getElementById('global-portal-tooltip')?.remove();
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.getElementById('global-portal-tooltip')?.remove();
  });

  it('open=false のときは描画しない', () => {
    const onClose = jest.fn();

    render(
      <PortalTooltip
        open={false}
        anchor={{ x: 10, y: 20 }}
        text="メモ"
        onClose={onClose}
        maxWidth={240}
      />,
    );

    expect(screen.queryByText('メモ')).not.toBeInTheDocument();
    expect(mockedCalcTooltipPosition).not.toHaveBeenCalled();
  });

  it('anchor と座標計算結果を使ってポータル表示する', () => {
    const onClose = jest.fn();

    render(
      <PortalTooltip
        open
        anchor={{ x: 40, y: 60 }}
        text="コメント本文"
        onClose={onClose}
        maxWidth={280}
      />,
    );

    expect(screen.getByText('コメント本文')).toBeInTheDocument();
    expect(mockedCalcTooltipPosition).toHaveBeenCalledWith(40, 60, 280, 200);
    expect(document.getElementById('global-portal-tooltip')).toBeTruthy();
  });

  it('Escape キーと外側クリックで閉じる', () => {
    const onClose = jest.fn();

    render(<PortalTooltip open anchor={{ x: 10, y: 20 }} text="閉じる確認" onClose={onClose} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(document.body);

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('ツールチップ内クリックでは閉じない', () => {
    const onClose = jest.fn();

    render(<PortalTooltip open anchor={{ x: 10, y: 20 }} text="内部クリック" onClose={onClose} />);

    fireEvent.click(screen.getByText('内部クリック'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
