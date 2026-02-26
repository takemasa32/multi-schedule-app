// jsdomのrequestSubmit未実装対策
if (!HTMLFormElement.prototype.requestSubmit) {
  HTMLFormElement.prototype.requestSubmit = function () {
    this.submit();
  };
}

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AvailabilitySummary from '../availability-summary';

describe('AvailabilitySummary', () => {
  const eventDates = [
    {
      id: 'date1',
      start_time: '2025-05-10 19:00:00',
      end_time: '2025-05-10 20:00:00',
      label: '午前枠',
    },
    {
      id: 'date2',
      start_time: '2025-05-12 00:00:00',
      end_time: '2025-05-12 01:00:00',
      label: '午後枠',
    },
  ];

  const participants = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
  ];

  const availabilities = [
    { participant_id: 'p1', event_date_id: 'date1', availability: true },
    { participant_id: 'p2', event_date_id: 'date1', availability: false },
    { participant_id: 'p3', event_date_id: 'date1', availability: true },
    { participant_id: 'p1', event_date_id: 'date2', availability: false },
    { participant_id: 'p2', event_date_id: 'date2', availability: true },
    { participant_id: 'p3', event_date_id: 'date2', availability: true },
  ];

  const defaultProps = {
    eventDates,
    participants,
    availabilities,
  };

  it('ヒートマップがデフォルト表示される', () => {
    render(<AvailabilitySummary {...defaultProps} />);

    expect(screen.getByText('みんなの回答状況')).toBeInTheDocument();
    expect(screen.getByText('時間')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('(1)').length).toBeGreaterThan(0);
  });

  it('minColoredCountを指定すると閾値未満のセルがグレースケールになる', () => {
    const customAvailabilities = [
      { participant_id: 'p1', event_date_id: 'date1', availability: true },
      { participant_id: 'p2', event_date_id: 'date1', availability: false },
      { participant_id: 'p3', event_date_id: 'date1', availability: true },
      { participant_id: 'p1', event_date_id: 'date2', availability: true },
      { participant_id: 'p2', event_date_id: 'date2', availability: false },
      { participant_id: 'p3', event_date_id: 'date2', availability: false },
    ];

    const { container } = render(
      <AvailabilitySummary
        {...defaultProps}
        availabilities={customAvailabilities}
        minColoredCount={2}
      />,
    );

    const grayCells = container.querySelectorAll('td[style*="grayscale(1)"]');
    expect(grayCells.length).toBeGreaterThan(0);
  });

  it('過去日程グレースケール設定が初期値オンで切り替え可能', () => {
    render(<AvailabilitySummary {...defaultProps} />);

    fireEvent.click(screen.getByText('フィルター設定'));

    const toggle = screen.getByRole('checkbox', { name: /過去日程のグレー表示切り替え/i });
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(toggle).not.toBeChecked();
  });

  it('除外された参加者の回答がヒートマップ集計に反映される', () => {
    render(
      <AvailabilitySummary
        {...defaultProps}
        excludedParticipantIds={['p2']}
      />,
    );

    // Bob除外後
    // date1: Alice(○), Charlie(○) => 2
    // date2: Alice(×), Charlie(○) => 1
    expect(screen.getAllByText('2')[0]).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});
