"use client";
import { useMemo, useState } from "react";
import ShareEventButton from "./share-event-button";
import { buildAvailableDatesMessage } from "@/lib/share-utils";
import type { EventDate, Participant, Availability } from "@/components/event-client/event-details-section";

interface Props {
  eventTitle: string;
  publicToken: string;
  eventDates: EventDate[];
  participants: Participant[];
  availabilities: Availability[];
}

export default function ShareAvailableDatesButton({
  eventTitle,
  publicToken,
  eventDates,
  participants,
  availabilities,
}: Props) {
  const [minCount, setMinCount] = useState(participants.length);
  const shareText = useMemo(
    () => buildAvailableDatesMessage(eventDates, availabilities, minCount),
    [eventDates, availabilities, minCount]
  );
  const shareUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/event/${publicToken}`
      : "";

  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="label">
          <span className="label-text text-sm">最低人数</span>
        </label>
        <input
          type="number"
          className="input input-sm input-bordered w-20"
          min={1}
          max={participants.length}
          value={minCount}
          onChange={(e) => setMinCount(Number(e.target.value))}
        />
      </div>
      <ShareEventButton
        url={shareUrl}
        text={`${eventTitle}\n${shareText}`}
        label="空き日程を共有"
        ariaLabel="空き日程を共有"
        className="btn-sm"
      />
    </div>
  );
}
