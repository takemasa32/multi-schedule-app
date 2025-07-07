import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import ManualTimeSlotPicker from "../manual-time-slot-picker";

function setup() {
  const handleChange = jest.fn();
  render(<ManualTimeSlotPicker onTimeSlotsChange={handleChange} />);
  return handleChange;
}

describe("ManualTimeSlotPicker", () => {
  test("マスを選択するとコールバックが呼ばれる", async () => {
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
    fireEvent.change(screen.getByLabelText(/時間間隔/), {
      target: { value: "60" },
    });

    const cell = await screen.findByTestId("slot-cell");
    fireEvent.pointerDown(cell);
    fireEvent.pointerUp(cell);

    await waitFor(() => {
      expect(onChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ startTime: "09:00", endTime: "10:00" }),
        ])
      );
      expect(cell).toHaveTextContent("○");
    });
  });
});
