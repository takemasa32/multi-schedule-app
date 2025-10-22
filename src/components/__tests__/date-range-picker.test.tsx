import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DateRangePicker from '../date-range-picker';

describe('DateRangePicker', () => {
  test('時間枠候補が10分〜6時間の選択肢に限定されている', () => {
    render(<DateRangePicker onTimeSlotsChange={jest.fn()} allowPastDates />);

    const intervalSelect = screen.getByRole('combobox', {
      name: '時間枠の長さ',
    }) as HTMLSelectElement;
    const optionLabels = Array.from(intervalSelect.options).map((option) => option.textContent);

    expect(optionLabels).toEqual(['10分', '30分', '1時間', '2時間', '3時間', '6時間']);
  });

  test('時間枠の長さを変更すると生成される枠数が更新される', async () => {
    const handleChange = jest.fn();
    render(<DateRangePicker onTimeSlotsChange={handleChange} allowPastDates />);

    const startInput = screen
      .getAllByLabelText(/開始日/)
      .find((el) => el instanceof HTMLInputElement && el.type === 'date') as HTMLInputElement;
    const endInput = screen
      .getAllByLabelText(/終了日/)
      .find((el) => el instanceof HTMLInputElement && el.type === 'date') as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: '2099-01-01' } });
    fireEvent.change(endInput, { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText(/^各日の開始時刻$/), { target: { value: '09:00' } });
    fireEvent.change(screen.getByLabelText(/^各日の終了時刻$/), { target: { value: '12:00' } });

    await waitFor(() => {
      expect(handleChange).toHaveBeenCalled();
    });

    const intervalSelect = screen.getByRole('combobox', {
      name: '時間枠の長さ',
    }) as HTMLSelectElement;
    fireEvent.change(intervalSelect, { target: { value: '60' } });

    await waitFor(() => {
      const latestCall = handleChange.mock.calls[handleChange.mock.calls.length - 1]?.[0] ?? [];
      expect(latestCall).toHaveLength(3);
      expect(latestCall[0]).toMatchObject({ startTime: '09:00', endTime: '10:00' });
      expect(latestCall[1]).toMatchObject({ startTime: '10:00', endTime: '11:00' });
      expect(latestCall[2]).toMatchObject({ startTime: '11:00', endTime: '12:00' });
    });
  });

  test('時間枠の長さが固定されている場合は変更できない', () => {
    render(
      <DateRangePicker
        onTimeSlotsChange={jest.fn()}
        forcedIntervalMinutes={45}
        allowPastDates
        initialStartDate={new Date('2099-01-01T00:00:00')}
        initialEndDate={new Date('2099-01-01T00:00:00')}
      />,
    );

    const intervalSelect = screen.getByRole('combobox', {
      name: '時間枠の長さ',
    }) as HTMLSelectElement;
    expect(intervalSelect).toBeDisabled();
    expect(intervalSelect.value).toBe('45');
    expect(screen.getByText('既存イベントの設定に合わせて固定されています')).toBeInTheDocument();
  });

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
