import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManualTimeSlotPicker from "../manual-time-slot-picker";

function setup() {
  const handleChange = jest.fn();
  render(<ManualTimeSlotPicker onTimeSlotsChange={handleChange} />);
  return handleChange;
}

describe("ManualTimeSlotPicker", () => {
  test("セルを選択するとコールバックが呼ばれる", async () => {
    const onChange = setup();
    const startInput = screen.getAllByLabelText(/開始日/)[0];
    const endInput = screen.getAllByLabelText(/終了日/)[0];
    fireEvent.change(startInput, { target: { value: "2099-01-01" } });
    fireEvent.change(endInput, { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/デフォルト開始時間/), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/デフォルト終了時間/), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText("時間間隔"), {
      target: { value: "60" },
    });

    const cell = await screen.findByTestId("slot-cell");
    fireEvent.pointerDown(cell, { pointerId: 1, pointerType: "mouse" });
    fireEvent.pointerUp(cell, { pointerId: 1, pointerType: "mouse" });

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ startTime: "09:00", endTime: "10:00" }),
        ])
      );
      expect(cell).toHaveAttribute("aria-label", "選択済み");
    });
  });

  test("initialSlots の更新は差分があるときだけ同期される", async () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <ManualTimeSlotPicker onTimeSlotsChange={onChange} initialSlots={[]} />
    );

    const startInput = screen.getAllByLabelText(/開始日/)[0];
    const endInput = screen.getAllByLabelText(/終了日/)[0];
    fireEvent.change(startInput, { target: { value: "2099-01-01" } });
    fireEvent.change(endInput, { target: { value: "2099-01-01" } });
    fireEvent.change(screen.getByLabelText(/デフォルト開始時間/), {
      target: { value: "09:00" },
    });
    fireEvent.change(screen.getByLabelText(/デフォルト終了時間/), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText("時間間隔"), {
      target: { value: "60" },
    });

    const firstCell = await screen.findByTestId("slot-cell");
    const cellKey = firstCell.getAttribute("data-key") ?? "";
    expect(cellKey).not.toBe("");
    const [datePart, timeRange] = cellKey.split("_");
    const [startTimeRaw, endTimeRaw] = (timeRange ?? "-").split("-");

    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const baseCalls = onChange.mock.calls.length;

    const slotFromKey = {
      date: new Date(`${datePart}T00:00:00`),
      startTime: startTimeRaw,
      endTime: endTimeRaw,
    };

    rerender(
      <ManualTimeSlotPicker
        onTimeSlotsChange={onChange}
        initialSlots={[slotFromKey]}
      />
    );

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledTimes(baseCalls)
    );
    expect(
      (await screen.findAllByTestId("slot-cell"))[0]
    ).toHaveAttribute("aria-label", "選択済み");

    rerender(
      <ManualTimeSlotPicker
        onTimeSlotsChange={onChange}
        initialSlots={[slotFromKey]}
      />
    );

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledTimes(baseCalls)
    );

    rerender(
      <ManualTimeSlotPicker onTimeSlotsChange={onChange} initialSlots={[]} />
    );

    await waitFor(() =>
      expect(onChange).toHaveBeenCalledTimes(baseCalls)
    );
    expect(
      (await screen.findAllByTestId("slot-cell"))[0]
    ).toHaveAttribute("aria-label", "未選択");
  });
});
