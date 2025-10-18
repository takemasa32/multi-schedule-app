import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManualTimeSlotPicker from '../manual-time-slot-picker';

function setup(props: Partial<React.ComponentProps<typeof ManualTimeSlotPicker>> = {}) {
  const handleChange = jest.fn();
  render(
    <ManualTimeSlotPicker onTimeSlotsChange={handleChange} forcedIntervalMinutes={60} {...props} />,
  );
  return handleChange;
}

describe('ManualTimeSlotPicker', () => {
  test('セルを選択するとコールバックが呼ばれる', async () => {
    const onChange = setup();
    const startInput = screen.getAllByLabelText(/開始日/)[0];
    const endInput = screen.getAllByLabelText(/終了日/)[0];
    fireEvent.change(startInput, { target: { value: '2099-01-01' } });
    fireEvent.change(endInput, { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText(/デフォルト開始時間/), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText(/デフォルト終了時間/), {
      target: { value: '10:00' },
    });

    const cell = await screen.findByTestId('slot-cell');
    fireEvent.pointerDown(cell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(cell, { pointerId: 1, pointerType: 'mouse' });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([expect.objectContaining({ startTime: '09:00', endTime: '10:00' })]),
      );
      expect(cell).toHaveAttribute('aria-label', '選択済み');
    });
  });

  test('initialSlots の更新は差分があるときだけ同期される', async () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <ManualTimeSlotPicker onTimeSlotsChange={onChange} initialSlots={[]} />,
    );

    const startInput = screen.getAllByLabelText(/開始日/)[0];
    const endInput = screen.getAllByLabelText(/終了日/)[0];
    fireEvent.change(startInput, { target: { value: '2099-01-01' } });
    fireEvent.change(endInput, { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText(/デフォルト開始時間/), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText(/デフォルト終了時間/), {
      target: { value: '10:00' },
    });

    const firstCell = await screen.findByTestId('slot-cell');
    const cellKey = firstCell.getAttribute('data-key') ?? '';
    expect(cellKey).not.toBe('');
    const [datePart, timeRange] = cellKey.split('_');
    const [startTimeRaw, endTimeRaw] = (timeRange ?? '-').split('-');

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const baseCalls = onChange.mock.calls.length;

    const slotFromKey = {
      date: new Date(`${datePart}T00:00:00`),
      startTime: startTimeRaw,
      endTime: endTimeRaw,
    };

    rerender(<ManualTimeSlotPicker onTimeSlotsChange={onChange} initialSlots={[slotFromKey]} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(baseCalls));
    expect((await screen.findAllByTestId('slot-cell'))[0]).toHaveAttribute(
      'aria-label',
      '選択済み',
    );

    rerender(<ManualTimeSlotPicker onTimeSlotsChange={onChange} initialSlots={[slotFromKey]} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(baseCalls));

    rerender(<ManualTimeSlotPicker onTimeSlotsChange={onChange} initialSlots={[]} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(baseCalls));
    expect((await screen.findAllByTestId('slot-cell'))[0]).toHaveAttribute('aria-label', '未選択');
  });

  test('disabledSlotKeys に含まれるセルは選択できない', async () => {
    const onChange = jest.fn();
    const { rerender } = render(<ManualTimeSlotPicker onTimeSlotsChange={onChange} />);

    const startInput = screen.getAllByLabelText(/開始日/)[0];
    const endInput = screen.getAllByLabelText(/終了日/)[0];
    fireEvent.change(startInput, { target: { value: '2099-01-01' } });
    fireEvent.change(endInput, { target: { value: '2099-01-01' } });
    fireEvent.change(screen.getByLabelText(/デフォルト開始時間/), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText(/デフォルト終了時間/), {
      target: { value: '10:00' },
    });

    const cell = await screen.findByTestId('slot-cell');
    const cellKey = cell.getAttribute('data-key') ?? '';
    expect(cellKey).not.toBe('');

    rerender(
      <ManualTimeSlotPicker
        onTimeSlotsChange={onChange}
        disabledSlotKeys={[cellKey]}
        initialSlots={[]}
      />,
    );

    const disabledCell = await screen.findByTestId('slot-cell');
    expect(disabledCell).toHaveTextContent('済');
    expect(disabledCell).toHaveAttribute('aria-disabled', 'true');
    expect(disabledCell).toHaveAttribute('aria-label', '既存の日程のため選択不可');

    const baseCalls = onChange.mock.calls.length;

    fireEvent.pointerDown(disabledCell, { pointerId: 1, pointerType: 'mouse' });
    fireEvent.pointerUp(disabledCell, { pointerId: 1, pointerType: 'mouse' });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(baseCalls);
    });
  });

  test('ヘッダーで月・年の変わり目のみ月情報が表示される', async () => {
    render(<ManualTimeSlotPicker onTimeSlotsChange={jest.fn()} />);

    const startInput = screen.getAllByLabelText(/開始日/)[0];
    const endInput = screen.getAllByLabelText(/終了日/)[0];
    fireEvent.change(startInput, { target: { value: '2099-12-31' } });
    fireEvent.change(endInput, { target: { value: '2100-01-02' } });
    fireEvent.change(screen.getByLabelText(/デフォルト開始時間/), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText(/デフォルト終了時間/), {
      target: { value: '10:00' },
    });

    const headers = await screen.findAllByRole('columnheader');
    const headerLabels = headers
      .slice(1)
      .map((header) => header.textContent ?? '')
      .map((text) =>
        text
          .replace(/\s*\([^)]*\)/, '')
          .replace(/\s+/g, ' ')
          .trim(),
      )
      .filter((text) => text.length > 0);

    const newYearIndex = headerLabels.indexOf('2100/1/1');
    expect(newYearIndex).toBeGreaterThan(0);
    expect(headerLabels[newYearIndex - 1]).toBe('31');
    expect(headerLabels).toContain('2100/1/1');
    expect(headerLabels).toContain('2');
  });
});
