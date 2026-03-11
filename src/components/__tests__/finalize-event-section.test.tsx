import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FinalizeEventSection from '@/components/finalize-event-section';

describe('FinalizeEventSection', () => {
  it('未確定時は確定CTAを表示する', () => {
    render(
      <FinalizeEventSection
        publicToken="tok"
        eventTitle="テストイベント"
        eventDates={[]}
        availabilities={[]}
        finalizedDateIds={[]}
      />,
    );

    expect(screen.getByRole('link', { name: '日程を確定する' })).toHaveAttribute(
      'href',
      '/event/tok/finalize',
    );
    expect(screen.getByText('未確定')).toBeInTheDocument();
  });

  it('確定済み日程がある場合は変更CTAと一覧を表示する', () => {
    render(
      <FinalizeEventSection
        publicToken="tok"
        eventTitle="テストイベント"
        eventDates={[
          {
            id: 'date-1',
            start_time: '2026-04-01T10:00:00+09:00',
            end_time: '2026-04-01T11:00:00+09:00',
          },
        ]}
        availabilities={[{ participant_id: 'p1', event_date_id: 'date-1', availability: true }]}
        finalizedDateIds={['date-1']}
      />,
    );

    expect(screen.getByRole('link', { name: '確定内容を変更する' })).toHaveAttribute(
      'href',
      '/event/tok/finalize',
    );
    expect(screen.getByText('確定済みの日程')).toBeInTheDocument();
  });
});
