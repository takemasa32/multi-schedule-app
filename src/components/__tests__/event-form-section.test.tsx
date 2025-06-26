import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import EventFormSection from "@/components/event-client/event-form-section";
import type { EventDate } from "@/components/event-client/event-details-section";

const mockEvent = {
  id: "e1",
  title: "テストイベント",
  description: null,
  public_token: "tok",
  is_finalized: true,
  final_date_id: "date1",
};

const mockDates: EventDate[] = [
  { id: "date1", start_time: "2025-06-01T10:00:00", end_time: "2025-06-01T11:00:00" },
  { id: "date2", start_time: "2025-06-02T15:00:00", end_time: "2025-06-02T16:00:00" },
];

describe("EventFormSection", () => {
  test("複数の確定日程が表示される", () => {
    render(
      <EventFormSection
        event={mockEvent}
        eventDates={mockDates}
        participants={[]}
        finalizedDateIds={["date1", "date2"]}
      />
    );
    expect(screen.getByText("日程が確定しました！")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
  });
});
