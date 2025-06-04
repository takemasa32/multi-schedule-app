import { fetchParticipantsByDate } from "../tooltip-utils";
import type { Participant } from "@/types/participant";

describe("fetchParticipantsByDate", () => {
  it("コメント付きで参加者を分類できる", () => {
    const participants: Participant[] = [
      { id: "p1", name: "Alice", comment: "よろしく" },
      { id: "p2", name: "Bob", comment: null },
      { id: "p3", name: "Charlie" },
    ];
    const availabilities = [
      { participant_id: "p1", event_date_id: "d1", availability: true },
      { participant_id: "p2", event_date_id: "d1", availability: false },
      { participant_id: "p3", event_date_id: "d1", availability: false },
    ];
    const result = fetchParticipantsByDate(participants, availabilities, "d1");
    expect(result.availableParticipants).toEqual([
      { name: "Alice", comment: "よろしく" },
    ]);
    expect(result.unavailableParticipants).toEqual([
      { name: "Bob", comment: null },
      { name: "Charlie", comment: undefined },
    ]);
  });
});
