"use client";
import { useMemo, useState } from "react";
import ShareEventButton from "./share-event-button";
import { buildAvailableDatesMessage } from "@/lib/share-utils";
import type {
  EventDate,
  Participant,
  Availability,
} from "@/components/event-client/event-details-section";

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
    <div className=" ">
      <div className="flex gap-2 items-end ">
        <input
          type="number"
          className="input input-sm input-bordered w-10"
          min={1}
          max={participants.length}
          value={minCount}
          onChange={(e) => {
            const value = Number(e.target.value);
            setMinCount(value);
          }}
          onBlur={(e) => {
            const value = Number(e.target.value);
            const validValue =
              isNaN(value) || value < 1
                ? 1
                : value > participants.length
                ? participants.length
                : value;
            setMinCount(validValue);
          }}
        />
        <label className="label">
          <span className="label-text text-sm">人以上の予定を共有</span>
        </label>
      </div>
      <ShareEventButton
        url={shareUrl}
        text={`${eventTitle}\n${shareText}`}
        label="共通日程を共有"
        ariaLabel="共通日程を共有"
        className="btn-sm mt-2"
      />
    </div>
  );
}
