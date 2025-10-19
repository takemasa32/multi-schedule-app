import React from 'react';
import { render, screen } from '@testing-library/react';
import HeatmapView from '../availability-summary/heatmap-view';

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
});
