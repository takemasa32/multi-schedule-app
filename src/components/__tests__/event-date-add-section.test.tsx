import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import EventDateAddSection from '../event-client/event-date-add-section';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('@/lib/actions', () => ({
  addEventDates: jest.fn(),
}));

let lastForcedIntervalMinutes: number | null = null;
jest.mock('../date-range-picker', () => {
  const ReactModule = jest.requireActual('react') as typeof import('react');
  const { useEffect, useRef } = ReactModule;
  type MockDateRangePickerProps = {
    onTimeSlotsChange: (slots: { date: Date; startTime: string; endTime: string }[]) => void;
    forcedIntervalMinutes?: number | null;
  };
  function MockDateRangePicker({
    onTimeSlotsChange,
    forcedIntervalMinutes,
  }: MockDateRangePickerProps) {
    const calledRef = useRef(false);
    lastForcedIntervalMinutes = forcedIntervalMinutes ?? null;
    useEffect(() => {
      if (calledRef.current) return;
      calledRef.current = true;
      onTimeSlotsChange([
        { date: new Date('2099-01-03T00:00:00'), startTime: '09:00', endTime: '10:00' },
      ]);
    }, [onTimeSlotsChange]);
    return <div data-testid="mock-date-range-picker">date-range</div>;
  }
  return {
    __esModule: true,
    default: MockDateRangePicker,
  };
});

jest.mock('../manual-time-slot-picker', () => {
  const ReactModule = jest.requireActual('react') as typeof import('react');
  const { useEffect } = ReactModule;
  type MockManualTimeSlotPickerProps = {
    onTimeSlotsChange: (slots: { date: Date; startTime: string; endTime: string }[]) => void;
    disabledSlotKeys?: string[];
  };
  function MockManualTimeSlotPicker({ onTimeSlotsChange }: MockManualTimeSlotPickerProps) {
    useEffect(() => {
      onTimeSlotsChange([
        { date: new Date('2099-01-01T00:00:00'), startTime: '09:00', endTime: '10:00' },
        { date: new Date('2099-01-02T00:00:00'), startTime: '09:00', endTime: '10:00' },
      ]);
    }, [onTimeSlotsChange]);
    return <div data-testid="mock-manual-time-slot-picker">manual</div>;
  }
  return {
    __esModule: true,
    default: MockManualTimeSlotPicker,
  };
});

describe('EventDateAddSection', () => {
  afterEach(() => {
    jest.clearAllMocks();
    lastForcedIntervalMinutes = null;
  });

  test('手動モードで既存日程を除外して確認モーダルを表示できる', async () => {
    const event = { id: 'e1', title: 'イベント', public_token: 'token' };
    const eventDates = [
      {
        id: 'd1',
        start_time: '2099-01-01T09:00:00',
        end_time: '2099-01-01T10:00:00',
      },
    ];
    render(<EventDateAddSection event={event} eventDates={eventDates} />);

    fireEvent.click(screen.getByRole('button', { name: '日程を追加する' }));

    fireEvent.click(screen.getByRole('button', { name: 'カレンダー手動選択' }));

    await screen.findByTestId('mock-manual-time-slot-picker');

    expect(
      screen.getByText(/既存日程または重複選択 1 件の枠は自動的に除外されます/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '選択した日程を確認' }));

    const modalTitle = await screen.findByText('日程追加の確認');
    const modalContainer = modalTitle.closest('div');
    expect(modalContainer).not.toBeNull();
    if (!modalContainer) {
      return;
    }
    const listItems = within(modalContainer).getAllByRole('listitem');
    expect(listItems.length).toBeGreaterThan(0);
    expect(listItems[0].textContent).toContain('2099/1/2');
    expect(listItems[0].textContent).not.toContain('2099/1/1');
  });

  test('既存日程が規則的な場合は期間ベースが自動選択される', async () => {
    const event = { id: 'e1', title: 'イベント', public_token: 'token' };
    const eventDates = [
      {
        id: 'd1',
        start_time: '2099-01-01T09:00:00',
        end_time: '2099-01-01T10:00:00',
      },
      {
        id: 'd2',
        start_time: '2099-01-02T09:00:00',
        end_time: '2099-01-02T10:00:00',
      },
    ];
    render(<EventDateAddSection event={event} eventDates={eventDates} />);

    fireEvent.click(screen.getByRole('button', { name: '日程を追加する' }));
    await screen.findByTestId('mock-date-range-picker');

    expect(lastForcedIntervalMinutes).toBe(60);
    const autoButton = screen.getByRole('button', { name: '期間ベース' });
    expect(autoButton).toBeDisabled();
    expect(screen.queryByTestId('mock-manual-time-slot-picker')).not.toBeInTheDocument();
  });
});
