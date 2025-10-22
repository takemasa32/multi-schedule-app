import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DateRangePicker from '../date-range-picker';

describe('DateRangePicker', () => {
  test('各日の終了時刻を変更すると生成される枠数が更新される', async () => {
    const handleTimeSlotsChange = jest.fn();
    render(<DateRangePicker onTimeSlotsChange={handleTimeSlotsChange} allowPastDates />);

    const startInput = screen.getByLabelText('開始日');
    const endInput = screen.getByLabelText('終了日');

    fireEvent.change(startInput, { target: { value: '2099-01-01' } });
    fireEvent.change(endInput, { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText(/^各日の開始時刻$/), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(/^各日の終了時刻$/), { target: { value: '12:00' } });

    await waitFor(() => {
      const latestCall = handleTimeSlotsChange.mock.calls.at(-1)?.[0];
      expect(latestCall).toHaveLength(2);
    });

    fireEvent.change(screen.getByLabelText(/^各日の終了時刻$/), { target: { value: '18:00' } });

    await waitFor(() => {
      const latestCall = handleTimeSlotsChange.mock.calls.at(-1)?.[0];
      expect(latestCall).toHaveLength(5);
    });
  });
});
