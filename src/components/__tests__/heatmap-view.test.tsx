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

  it('日付列が少ない場合でも時間列の幅を固定する', () => {
    const { container } = render(<HeatmapView {...baseProps} heatmapData={new Map()} />);
    const timeCol = container.querySelector('colgroup col:first-child');

    expect(timeCol).toBeTruthy();
    expect(timeCol?.className).toContain('w-[50px]');
    expect(timeCol?.className).toContain('sm:w-[64px]');
  });

  it('境界色が同じ場合のみ水平線を表示する', () => {
    document.documentElement.setAttribute('data-theme', 'night');
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
      {
        date: '2025-10-19',
        dateObj: new Date('2025-10-19T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
    // 1列目は同色（同人数）にして線を表示
    heatmapData.set('2025-10-18_slot-10', {
      dateId: '2025-10-18',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    // 2列目は異色（人数差）にして線なし
    heatmapData.set('2025-10-19_slot-10', {
      dateId: '2025-10-19',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-19_slot-11', {
      dateId: '2025-10-19',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={2}
      />,
    );
    const secondRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(secondRow).toBeTruthy();

    const sameColorBoundaryCell = secondRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    const differentColorBoundaryCell = secondRow?.querySelector(
      'td[data-col-index="1"]',
    ) as HTMLTableCellElement | null;
    expect(sameColorBoundaryCell).toBeTruthy();
    expect(differentColorBoundaryCell).toBeTruthy();
    expect(sameColorBoundaryCell?.style.borderTopWidth).toBe('1px');
    expect(differentColorBoundaryCell?.style.borderTopWidth).toBe('0px');
    document.documentElement.removeAttribute('data-theme');
  });

  it('上辺に角丸があるセルでは水平線を表示しない', () => {
    document.documentElement.setAttribute('data-theme', 'night');
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
    // 上セルは可、下セルは未回答にして連結されないため、下セル上辺に角丸が付く
    heatmapData.set('2025-10-18_slot-10', {
      dateId: '2025-10-18',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 0,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 0,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={2}
      />,
    );
    const secondRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(secondRow).toBeTruthy();
    const targetCell = secondRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(targetCell).toBeTruthy();
    expect(targetCell?.style.borderTopWidth).toBe('0px');
    document.documentElement.removeAttribute('data-theme');
  });

  it('境界線色が同じでもセル見た目が異なる場合は水平線を表示しない', () => {
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
    // どちらもlineColorは上限クランプで同じになり得るが、背景濃度は異なる組み合わせ
    heatmapData.set('2025-10-18_slot-10', {
      dateId: '2025-10-18',
      availableCount: 5,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 5,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 4,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 4,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={5}
      />,
    );
    const secondRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(secondRow).toBeTruthy();
    const targetCell = secondRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(targetCell).toBeTruthy();
    expect(targetCell?.style.borderTopWidth).toBe('0px');
  });

  it('回答0セル同士（neutral）で上辺に角丸がある場合は水平線を表示しない', () => {
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 0,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 0,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={1}
      />,
    );

    const secondRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(secondRow).toBeTruthy();
    const targetCell = secondRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(targetCell).toBeTruthy();
    expect(targetCell?.style.borderTopWidth).toBe('0px');
  });

  it('ライトモードでは色付きセル（primary）の境界に水平線を表示しない', () => {
    document.documentElement.removeAttribute('data-theme');
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={2}
      />,
    );
    const secondRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(secondRow).toBeTruthy();
    const targetCell = secondRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(targetCell).toBeTruthy();
    expect(targetCell?.style.borderTopWidth).toBe('0px');
  });

  it('過去日程グレー表示がOFFなら同じ人数の色は過去列でも一致する', () => {
    const dates = [
      {
        date: '2000-01-01',
        dateObj: new Date('2000-01-01T00:00:00.000Z'),
      },
      {
        date: '2999-01-01',
        dateObj: new Date('2999-01-01T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
    ];
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
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2999-01-01_slot-10', {
      dateId: '2999-01-01',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={2}
        isPastEventGrayscaleEnabled={false}
      />,
    );

    const row = container.querySelector('td[aria-label="10:00〜11:00"]')?.closest('tr');
    expect(row).toBeTruthy();
    const pastCell = row?.querySelector('td[data-col-index="0"]') as HTMLTableCellElement | null;
    const futureCell = row?.querySelector('td[data-col-index="1"]') as HTMLTableCellElement | null;
    expect(pastCell).toBeTruthy();
    expect(futureCell).toBeTruthy();

    const pastVisual = pastCell?.querySelector('div[class*="z-10"]') as HTMLDivElement | null;
    const futureVisual = futureCell?.querySelector('div[class*="z-10"]') as HTMLDivElement | null;
    expect(pastVisual).toBeTruthy();
    expect(futureVisual).toBeTruthy();
    expect(pastVisual?.style.backgroundColor).toBe(futureVisual?.style.backgroundColor);
    expect(pastVisual?.style.backgroundImage).toBe(futureVisual?.style.backgroundImage);
  });

  it('段差レイヤー無効時は縦方向でも下地レイヤーを描画しない', () => {
    document.documentElement.removeAttribute('data-theme');
    const layeredDates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const layeredSlots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={layeredDates}
        uniqueTimeSlots={layeredSlots}
        heatmapData={heatmapData}
        maxAvailable={2}
      />,
    );

    const topCount = screen.getByText('2', { selector: 'span' });
    const topVisualLayer = topCount.closest('div[class*="z-10"]') as HTMLDivElement | null;
    expect(topVisualLayer).toBeTruthy();
    expect(topVisualLayer?.className).not.toContain('rounded-bl-[0.4rem]');
    expect(topVisualLayer?.className).not.toContain('rounded-br-[0.4rem]');

    const cellContainer = topVisualLayer?.parentElement;
    const bottomUnderlay = cellContainer?.querySelector(
      'div.pointer-events-none.absolute.inset-x-0.bottom-0',
    ) as HTMLDivElement | null;
    expect(bottomUnderlay).toBeFalsy();

    // ライトテーマでは、色の濃淡差があっても有色セル同士の境界で補正レイヤーを描画する
    const secondRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(secondRow).toBeTruthy();
    const secondRowCell = secondRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(secondRowCell).toBeTruthy();
    expect(secondRowCell?.style.borderTopWidth).toBe('0px');
    const secondRowTopBleed = secondRowCell?.querySelector('div.heatmap-join-bleed-top');
    expect(secondRowTopBleed).toBeTruthy();
    document.documentElement.removeAttribute('data-theme');
  });

  it('ダークテーマでは色差がある有色セル境界に上辺補正レイヤーを描画する', () => {
    document.documentElement.setAttribute('data-theme', 'night');
    const layeredDates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const layeredSlots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={layeredDates}
        uniqueTimeSlots={layeredSlots}
        heatmapData={heatmapData}
        maxAvailable={2}
      />,
    );

    const secondRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(secondRow).toBeTruthy();
    const secondRowCell = secondRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(secondRowCell).toBeTruthy();
    expect(secondRowCell?.style.borderTopWidth).toBe('0px');
    const secondRowTopBleed = secondRowCell?.querySelector('div.heatmap-join-bleed-top');
    expect(secondRowTopBleed).toBeTruthy();
    document.documentElement.removeAttribute('data-theme');
  });

  it('段差レイヤー無効時は縦連結の中央セルを角丸化しない', () => {
    const layeredDates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const layeredSlots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
      {
        slotKey: 'slot-12',
        startTime: '12:00',
        endTime: '13:00',
        timeObj: new Date('2025-10-18T12:00:00.000Z'),
        labels: ['12:00〜13:00'],
      },
    ];
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
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 3,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 3,
    });
    heatmapData.set('2025-10-18_slot-12', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    render(
      <HeatmapView
        {...baseProps}
        uniqueDates={layeredDates}
        uniqueTimeSlots={layeredSlots}
        heatmapData={heatmapData}
        maxAvailable={3}
      />,
    );

    const middleCount = screen.getByText('3', { selector: 'span' });
    const middleVisualLayer = middleCount.closest('div[class*="z-10"]') as HTMLDivElement | null;
    expect(middleVisualLayer).toBeTruthy();
    expect(middleVisualLayer?.className).toContain('rounded-none');

    const cellContainer = middleVisualLayer?.parentElement;
    const topUnderlay = cellContainer?.querySelector(
      'div.pointer-events-none.absolute.inset-x-0.top-0',
    ) as HTMLDivElement | null;
    const bottomUnderlay = cellContainer?.querySelector(
      'div.pointer-events-none.absolute.inset-x-0.bottom-0',
    ) as HTMLDivElement | null;
    expect(topUnderlay).toBeFalsy();
    expect(bottomUnderlay).toBeFalsy();
  });

  it('段差レイヤー無効時は横連結中でも下方向の角丸を付けない', () => {
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
      {
        date: '2025-10-19',
        dateObj: new Date('2025-10-19T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
      availableCount: 3,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 3,
    });
    heatmapData.set('2025-10-19_slot-10', {
      dateId: '2025-10-19',
      availableCount: 3,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 3,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-19_slot-11', {
      dateId: '2025-10-19',
      availableCount: 3,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 3,
    });

    render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={3}
      />,
    );

    const targetCount = screen.getAllByText('3', { selector: 'span' })[0];
    const targetVisualLayer = targetCount.closest('div[class*="z-10"]') as HTMLDivElement | null;
    expect(targetVisualLayer).toBeTruthy();
    expect(targetVisualLayer?.className).not.toContain('rounded-bl-[0.4rem]');
    expect(targetVisualLayer?.className).not.toContain('rounded-br-[0.4rem]');
  });

  it('段差レイヤー無効時は上下左右の重なりレイヤーを描画しない', () => {
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
      {
        date: '2025-10-19',
        dateObj: new Date('2025-10-19T00:00:00.000Z'),
      },
      {
        date: '2025-10-20',
        dateObj: new Date('2025-10-20T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
      {
        slotKey: 'slot-12',
        startTime: '12:00',
        endTime: '13:00',
        timeObj: new Date('2025-10-18T12:00:00.000Z'),
        labels: ['12:00〜13:00'],
      },
    ];

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

    // ベースを同系色連結にするため、全セルに回答ありデータを投入
    dates.forEach((date) => {
      slots.forEach((slot) => {
        heatmapData.set(`${date.date}_${slot.slotKey}`, {
          dateId: date.date,
          availableCount: 2,
          unavailableCount: 0,
          heatmapLevel: 0,
          isSelected: false,
          totalResponses: 2,
        });
      });
    });

    // 中央セル（11:00 / 2025-10-19）だけ載り条件を調整
    heatmapData.set('2025-10-19_slot-11', {
      dateId: '2025-10-19',
      availableCount: 4,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 4,
    });
    // 上・左は少人数にして「載る」判定を成立
    heatmapData.set('2025-10-19_slot-10', {
      dateId: '2025-10-19',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    // 右・下は同人数で連結維持
    heatmapData.set('2025-10-20_slot-11', {
      dateId: '2025-10-20',
      availableCount: 4,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 4,
    });
    heatmapData.set('2025-10-19_slot-12', {
      dateId: '2025-10-19',
      availableCount: 4,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 4,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={4}
      />,
    );

    const targetRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(targetRow).toBeTruthy();
    const targetCell = targetRow?.querySelector(
      'td[data-col-index="1"]',
    ) as HTMLTableCellElement | null;
    expect(targetCell).toBeTruthy();

    const targetVisualLayer = targetCell?.querySelector(
      'div[class*="z-10"]',
    ) as HTMLDivElement | null;
    expect(targetVisualLayer).toBeTruthy();
    expect(targetVisualLayer?.className).toContain('rounded-none');

    const topUnderlay = targetCell?.querySelector(
      'div.pointer-events-none.absolute.inset-x-0.top-0',
    ) as HTMLDivElement | null;
    const leftUnderlay = targetCell?.querySelector(
      'div.pointer-events-none.absolute.inset-y-0.left-0',
    ) as HTMLDivElement | null;
    expect(topUnderlay).toBeFalsy();
    expect(leftUnderlay).toBeFalsy();
  });

  it('左右方向は段差を付けないため境界角を作らない', () => {
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
      {
        date: '2025-10-19',
        dateObj: new Date('2025-10-19T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
    // 画像再現: [1,2] / [1,1]
    heatmapData.set('2025-10-18_slot-10', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-19_slot-10', {
      dateId: '2025-10-19',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-19_slot-11', {
      dateId: '2025-10-19',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={2}
      />,
    );

    const targetRow = container.querySelector('td[aria-label="10:00〜11:00"]')?.closest('tr');
    expect(targetRow).toBeTruthy();
    const targetCell = targetRow?.querySelector(
      'td[data-col-index="1"]',
    ) as HTMLTableCellElement | null;
    expect(targetCell).toBeTruthy();

    const targetVisualLayer = targetCell?.querySelector(
      'div[class*="z-10"]',
    ) as HTMLDivElement | null;
    expect(targetVisualLayer).toBeTruthy();
    expect(targetVisualLayer?.style.borderBottomLeftRadius).toBe('0px');
  });

  it('連結セル（rounded-none）は背景を二重塗りしない', () => {
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
      {
        slotKey: 'slot-12',
        startTime: '12:00',
        endTime: '13:00',
        timeObj: new Date('2025-10-18T12:00:00.000Z'),
        labels: ['12:00〜13:00'],
      },
    ];
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
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-18_slot-12', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={1}
      />,
    );

    const middleRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(middleRow).toBeTruthy();
    const middleCell = middleRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(middleCell).toBeTruthy();

    const wrapper = middleCell?.querySelector('div.relative.h-full') as HTMLDivElement | null;
    const surface = middleCell?.querySelector('div.relative.z-10') as HTMLDivElement | null;
    expect(wrapper).toBeTruthy();
    expect(surface).toBeTruthy();
    expect(surface?.className).toContain('rounded-none');

    // 背景はラッパー側の1レイヤーのみとし、内側レイヤーで重ね塗りしない
    expect(wrapper?.style.backgroundColor).not.toBe('');
    expect(surface?.style.backgroundColor).toBe('');
    expect(surface?.style.backgroundImage).toBe('');
  });

  it('水平境界線がある連結境界では背景抜け防止レイヤーを描画しない', () => {
    document.documentElement.setAttribute('data-theme', 'night');
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
      {
        slotKey: 'slot-12',
        startTime: '12:00',
        endTime: '13:00',
        timeObj: new Date('2025-10-18T12:00:00.000Z'),
        labels: ['12:00〜13:00'],
      },
    ];
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
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });
    heatmapData.set('2025-10-18_slot-12', {
      dateId: '2025-10-18',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={1}
      />,
    );

    const middleRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(middleRow).toBeTruthy();
    const middleCell = middleRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(middleCell).toBeTruthy();

    const topBleed = middleCell?.querySelector(
      'div.heatmap-join-bleed-top',
    ) as HTMLDivElement | null;
    const bottomBleed = middleCell?.querySelector(
      'div.heatmap-join-bleed-bottom',
    ) as HTMLDivElement | null;
    const leftBleed = middleCell?.querySelector(
      'div.heatmap-join-bleed-left',
    ) as HTMLDivElement | null;
    const rightBleed = middleCell?.querySelector(
      'div.heatmap-join-bleed-right',
    ) as HTMLDivElement | null;
    expect(topBleed).toBeFalsy();
    expect(bottomBleed).toBeFalsy();
    expect(leftBleed).toBeFalsy();
    expect(rightBleed).toBeFalsy();
    document.documentElement.removeAttribute('data-theme');
  });

  it('上に載る境界では背景抜け防止レイヤーを描画しない', () => {
    document.documentElement.setAttribute('data-theme', 'night');
    const dates = [
      {
        date: '2025-10-18',
        dateObj: new Date('2025-10-18T00:00:00.000Z'),
      },
      {
        date: '2025-10-19',
        dateObj: new Date('2025-10-19T00:00:00.000Z'),
      },
      {
        date: '2025-10-20',
        dateObj: new Date('2025-10-20T00:00:00.000Z'),
      },
    ];
    const slots = [
      {
        slotKey: 'slot-10',
        startTime: '10:00',
        endTime: '11:00',
        timeObj: new Date('2025-10-18T10:00:00.000Z'),
        labels: ['10:00〜11:00'],
      },
      {
        slotKey: 'slot-11',
        startTime: '11:00',
        endTime: '12:00',
        timeObj: new Date('2025-10-18T11:00:00.000Z'),
        labels: ['11:00〜12:00'],
      },
    ];
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
    // 左上セルは上・左非連結、右・下連結（左上角のみ丸い）
    heatmapData.set('2025-10-18_slot-10', {
      dateId: '2025-10-18',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-19_slot-10', {
      dateId: '2025-10-19',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-18_slot-11', {
      dateId: '2025-10-18',
      availableCount: 2,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 2,
    });
    heatmapData.set('2025-10-19_slot-11', {
      dateId: '2025-10-19',
      availableCount: 1,
      unavailableCount: 0,
      heatmapLevel: 0,
      isSelected: false,
      totalResponses: 1,
    });

    const { container } = render(
      <HeatmapView
        {...baseProps}
        uniqueDates={dates.slice(0, 2)}
        uniqueTimeSlots={slots}
        heatmapData={heatmapData}
        maxAvailable={2}
      />,
    );

    const targetRow = container.querySelector('td[aria-label="10:00〜11:00"]')?.closest('tr');
    expect(targetRow).toBeTruthy();
    const targetCell = targetRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(targetCell).toBeTruthy();

    const surfaceLayer = targetCell?.querySelector('div.relative.z-10') as HTMLDivElement | null;
    expect(surfaceLayer).toBeTruthy();
    expect(surfaceLayer?.style.borderTopLeftRadius).toBe('0.4rem');
    expect(surfaceLayer?.style.borderTopRightRadius).toBe('0px');
    expect(surfaceLayer?.style.borderBottomLeftRadius).toBe('0px');
    expect(surfaceLayer?.style.borderBottomRightRadius).toBe('0px');

    const topBleed = targetCell?.querySelector('div.heatmap-join-bleed-top');
    const leftBleed = targetCell?.querySelector('div.heatmap-join-bleed-left');
    const rightBleed = targetCell?.querySelector('div.heatmap-join-bleed-right');
    const bottomBleed = targetCell?.querySelector('div.heatmap-join-bleed-bottom');
    expect(topBleed).toBeFalsy();
    expect(leftBleed).toBeFalsy();
    expect(rightBleed).toBeFalsy();
    expect(bottomBleed).toBeFalsy();

    // 上に載る境界では重ね塗り回避のため下セル側の補正レイヤーを描画しない
    const nextRow = container.querySelector('td[aria-label="11:00〜12:00"]')?.closest('tr');
    expect(nextRow).toBeTruthy();
    const bottomNeighborCell = nextRow?.querySelector(
      'td[data-col-index="0"]',
    ) as HTMLTableCellElement | null;
    expect(bottomNeighborCell).toBeTruthy();
    const bottomNeighborTopBleed = bottomNeighborCell?.querySelector('div.heatmap-join-bleed-top');
    expect(bottomNeighborTopBleed).toBeFalsy();
    document.documentElement.removeAttribute('data-theme');
  });

  it('過去日程をグレースケール表示しても外側ボーダー装飾を追加しない', () => {
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
    const visualLayer = cellElement.querySelector('div[style]') as HTMLDivElement | null;
    expect(visualLayer).toBeTruthy();
    const styleAttribute = visualLayer?.getAttribute('style') ?? '';
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
      const visualLayer = cellElement.querySelector('div[style]') as HTMLDivElement | null;
      expect(visualLayer).toBeTruthy();
      const backgroundColor = visualLayer?.style.backgroundColor ?? '';

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
      const visualLayer = cellElement.querySelector('div[style]') as HTMLDivElement | null;
      expect(visualLayer).toBeTruthy();
      const styleAttribute = visualLayer?.getAttribute('style') ?? '';
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
