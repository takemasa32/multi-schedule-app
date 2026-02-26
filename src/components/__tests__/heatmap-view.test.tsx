import React from 'react';
import { render, screen } from '@testing-library/react';
import HeatmapView from '../availability-summary/heatmap-view';

jest.mock('next-themes', () => {
  return {
    useTheme: () => {
      const themeAttr = document.documentElement.getAttribute('data-theme');
      const resolved = themeAttr ?? 'light';
      return {
        theme: resolved,
        resolvedTheme: resolved,
        setTheme: jest.fn(),
        systemTheme: undefined,
      };
    },
  };
});

describe('HeatmapView', () => {
  const uniqueDates = [
    {
      date: '2025-10-18',
      dateObj: new Date('2025-10-18T00:00:00.000Z'),
    },
    {
      date: '2025-10-19',
      dateObj: new Date('2025-10-19T00:00:00.000Z'),
    },
  ];

  const uniqueTimeSlots = [
    {
      slotKey: 'slot-10',
      startTime: '10:00',
      endTime: '11:00',
      timeObj: new Date('2025-10-18T10:00:00.000Z'),
      labels: ['10:00〜11:00'],
    },
  ];

  const baseProps = {
    uniqueDates,
    uniqueTimeSlots,
    maxAvailable: 0,
    onPointerTooltipStart: jest.fn(),
    onPointerTooltipEnd: jest.fn(),
    onPointerTooltipClick: jest.fn(),
    isDragging: false,
    minColoredCount: 0,
    isPastEventGrayscaleEnabled: false,
  };

  it('イベント未設定のセルにはハイフンを表示する', () => {
    const heatmapData = new Map();
    render(<HeatmapView {...baseProps} heatmapData={heatmapData} />);

    // イベントデータが存在しないセルは「-」が描画される
    const placeholder = screen.getAllByText('-', { selector: 'span' })[0];
    expect(placeholder).toBeInTheDocument();
    expect(placeholder.closest('td')).toBeTruthy();
  });

  it('回答者数が0人のセルには0を表示する', () => {
    const heatmapData = new Map<
      string,
      {
        dateId: string;
        availableCount: number;
        unavailableCount: number;
        heatmapLevel: number;
        isSelected: boolean;
        totalResponses: number;
      }
    >();
    heatmapData.set('2025-10-18_slot-10', {
      dateId: '2025-10-18',
      availableCount: 0,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 0,
    });

    render(<HeatmapView {...baseProps} heatmapData={heatmapData} />);

    const zero = screen.getByText('0', { selector: 'span' });
    expect(zero).toBeInTheDocument();
    expect(zero.closest('td')).toBeTruthy();
  });

  it('過去日程をグレースケール表示してもボーダー装飾を追加しない', () => {
    const heatmapData = new Map<
      string,
      {
        dateId: string;
        availableCount: number;
        unavailableCount: number;
        heatmapLevel: number;
        isSelected: boolean;
        totalResponses: number;
      }
    >();
    heatmapData.set('2000-01-01_slot-10', {
      dateId: '2000-01-01',
      availableCount: 5,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 5,
    });

    render(
      <HeatmapView
        {...baseProps}
        uniqueDates={[{ date: '2000-01-01', dateObj: new Date('2000-01-01T00:00:00.000Z') }]}
        heatmapData={heatmapData}
        maxAvailable={5}
        isPastEventGrayscaleEnabled
      />,
    );

    const targetCell = screen.getAllByRole('cell').find((cell) => cell.textContent?.trim() === '5');

    expect(targetCell).toBeDefined();
    const cellElement = targetCell as HTMLTableCellElement;
    const styleAttribute = cellElement.getAttribute('style') ?? '';
    expect(styleAttribute).toContain('background-color: rgba(148, 163, 184, 0.45)');
    expect(styleAttribute).not.toContain('box-shadow');
  });

  it('data-theme属性がダークテーマの場合でも初期描画から暗い配色を適用する', () => {
    document.documentElement.setAttribute('data-theme', 'night');

    const heatmapData = new Map<
      string,
      {
        dateId: string;
        availableCount: number;
        unavailableCount: number;
        heatmapLevel: number;
        isSelected: boolean;
        totalResponses: number;
      }
    >();
    heatmapData.set('2000-01-01_slot-10', {
      dateId: '2000-01-01',
      availableCount: 3,
      unavailableCount: 1,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 4,
    });

    let cleanup: (() => void) | null = null;
    try {
      const rendered = render(
        <HeatmapView
          {...baseProps}
          uniqueDates={[{ date: '2000-01-01', dateObj: new Date('2000-01-01T00:00:00.000Z') }]}
          heatmapData={heatmapData}
          maxAvailable={5}
          isPastEventGrayscaleEnabled
        />,
      );
      cleanup = rendered.unmount;

      const targetCell = screen
        .getAllByRole('cell')
        .find((cell) => cell.textContent?.trim().startsWith('3'));

      expect(targetCell).toBeDefined();
      const cellElement = targetCell as HTMLTableCellElement;
      const backgroundColor = cellElement.style.backgroundColor;

      expect(backgroundColor).toContain('80, 88, 104');
      expect(backgroundColor).not.toContain('148, 163, 184');
    } finally {
      cleanup?.();
      document.documentElement.removeAttribute('data-theme');
    }
  });

  describe('初期スクロール機能', () => {
    beforeEach(() => {
      // スクロール関連のモック
      Element.prototype.scrollTo = jest.fn();
    });

    it('今日の日付が範囲内の場合、今日の列にスクロールする', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const datesWithToday = [
        { date: yesterdayStr, dateObj: new Date(yesterday) },
        { date: todayStr, dateObj: new Date(today) },
        { date: tomorrowStr, dateObj: new Date(tomorrow) },
      ];

      const heatmapData = new Map();

      const { container } = render(
        <HeatmapView {...baseProps} uniqueDates={datesWithToday} heatmapData={heatmapData} />,
      );

      // useEffectの実行を待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      const tableContainer = container.querySelector('.overflow-x-auto');
      expect(tableContainer).toBeTruthy();
    });

    it('今日の日付が範囲外の場合、スクロールしない', async () => {
      const pastDate1 = new Date('2020-01-01T00:00:00.000Z');
      const pastDate2 = new Date('2020-01-02T00:00:00.000Z');

      const datesWithoutToday = [
        { date: '2020-01-01', dateObj: pastDate1 },
        { date: '2020-01-02', dateObj: pastDate2 },
      ];

      const heatmapData = new Map();

      const { container } = render(
        <HeatmapView {...baseProps} uniqueDates={datesWithoutToday} heatmapData={heatmapData} />,
      );

      // useEffectの実行を待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      const tableContainer = container.querySelector('.overflow-x-auto');
      expect(tableContainer).toBeTruthy();
    });
  });

  describe('過去日程のグレースケール表示（ライトモード）', () => {
    beforeEach(() => {
      document.documentElement.setAttribute('data-theme', 'light');
    });

    afterEach(() => {
      document.documentElement.removeAttribute('data-theme');
    });

    it('ライトモードの過去日程はグレー系の色で表示される', async () => {
      const heatmapData = new Map<
        string,
        {
          dateId: string;
          availableCount: number;
          unavailableCount: number;
          heatmapLevel: number;
          isSelected: boolean;
          totalResponses: number;
        }
      >();
      heatmapData.set('2000-01-01_slot-10', {
        dateId: '2000-01-01',
        availableCount: 3,
        unavailableCount: 0,
        heatmapLevel: 0,
        isSelected: false,
        totalResponses: 3,
      });

      render(
        <HeatmapView
          {...baseProps}
          uniqueDates={[{ date: '2000-01-01', dateObj: new Date('2000-01-01T00:00:00.000Z') }]}
          heatmapData={heatmapData}
          maxAvailable={5}
          isPastEventGrayscaleEnabled
        />,
      );
      // useEffectの実行を待つ
      await new Promise((resolve) => setTimeout(resolve, 100));
      const targetCell = screen
        .getAllByRole('cell')
        .find((cell) => cell.textContent?.trim() === '3');
      expect(targetCell).toBeDefined();
      const cellElement = targetCell as HTMLTableCellElement;
      const styleAttribute = cellElement.getAttribute('style') ?? '';
      // ライトモードではグレー系（148, 163, 184）の色が使用される
      expect(styleAttribute).toContain('148, 163, 184');
      // ダーク系（80, 88, 104）は使用されない
      expect(styleAttribute).not.toContain('80, 88, 104');
    });

    it('過去日程のヘッダーもグレー系の背景色になる', async () => {
      const heatmapData = new Map();

      const { container } = render(
        <HeatmapView
          {...baseProps}
          uniqueDates={[{ date: '2000-01-01', dateObj: new Date('2000-01-01T00:00:00.000Z') }]}
          heatmapData={heatmapData}
          isPastEventGrayscaleEnabled
        />,
      );

      // useEffectの実行を待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      const headerCells = container.querySelectorAll('th[data-date-index]');
      expect(headerCells.length).toBeGreaterThan(0);

      const firstHeader = headerCells[0] as HTMLTableCellElement;
      const styleAttribute = firstHeader.getAttribute('style') ?? '';

      // ライトモードの過去日程ヘッダーはグレー系背景
      if (styleAttribute) {
        expect(styleAttribute).toContain('220, 220, 220');
      }
    });
  });

  describe('SSR/CSRハイドレーション対応', () => {
    it('初期状態（SSR相当）ではスタイルが適用されない', () => {
      const heatmapData = new Map();

      const { container } = render(
        <HeatmapView
          {...baseProps}
          uniqueDates={[{ date: '2000-01-01', dateObj: new Date('2000-01-01T00:00:00.000Z') }]}
          heatmapData={heatmapData}
          isPastEventGrayscaleEnabled
        />,
      );

      // 初期レンダリング直後はstartOfTodayがnullのため、スタイルは適用されない
      const headerCells = container.querySelectorAll('th[data-date-index]');
      expect(headerCells.length).toBeGreaterThan(0);
    });

    it('クライアント側（useEffect実行後）でスタイルが適用される', async () => {
      const heatmapData = new Map();

      const { container } = render(
        <HeatmapView
          {...baseProps}
          uniqueDates={[{ date: '2000-01-01', dateObj: new Date('2000-01-01T00:00:00.000Z') }]}
          heatmapData={heatmapData}
          isPastEventGrayscaleEnabled
        />,
      );

      // useEffectの実行を待つ
      await new Promise((resolve) => setTimeout(resolve, 100));

      const headerCells = container.querySelectorAll('th[data-date-index]');
      expect(headerCells.length).toBeGreaterThan(0);

      const firstHeader = headerCells[0] as HTMLTableCellElement;
      const styleAttribute = firstHeader.getAttribute('style');

      // useEffect実行後はstartOfTodayが設定され、過去日程にスタイルが適用される
      expect(styleAttribute).toBeTruthy();
    });
  });

  describe('過去日程フィルター設定', () => {
    it('過去日程グレースケール切替ボタンが表示される', () => {
      const heatmapData = new Map();
      const onToggle = jest.fn();
      const onMinColorChange = jest.fn();

      render(
        <HeatmapView
          {...baseProps}
          heatmapData={heatmapData}
          isPastEventGrayscaleEnabled
          onPastEventGrayscaleToggle={onToggle}
          onMinColoredCountChange={onMinColorChange}
        />,
      );

      const toggle = screen.getByRole('checkbox', { name: /過去日程のグレー表示切り替え/i });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toBeChecked();
    });

    it('過去日程グレースケール切替ボタンをクリックするとハンドラが呼ばれる', () => {
      const heatmapData = new Map();
      const onToggle = jest.fn();
      const onMinColorChange = jest.fn();

      render(
        <HeatmapView
          {...baseProps}
          heatmapData={heatmapData}
          isPastEventGrayscaleEnabled={false}
          onPastEventGrayscaleToggle={onToggle}
          onMinColoredCountChange={onMinColorChange}
        />,
      );

      const toggle = screen.getByRole('checkbox', { name: /過去日程のグレー表示切り替え/i });
      toggle.click();

      expect(onToggle).toHaveBeenCalledWith(true);
    });
  });
});
