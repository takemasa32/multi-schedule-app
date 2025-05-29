import AvailabilitySummary from "./index";
import {
  getEventDates,
  getParticipants,
  getAvailabilities,
} from "@/lib/actions";

interface Props {
  eventId: string;
  finalizedDateIds?: string[];
  publicToken?: string;
}

/**
 * 回答状況（集計）サーバーコンポーネント
 * - eventIdのみでデータ取得し、AvailabilitySummaryへ渡す
 */
export default async function AvailabilitySummaryServer({
  eventId,
  finalizedDateIds,
  publicToken,
}: Props) {
  const [eventDates, participants, availabilities] = await Promise.all([
    getEventDates(eventId),
    getParticipants(eventId),
    getAvailabilities(eventId),
  ]);
  return (
    <AvailabilitySummary
      eventDates={eventDates || []}
      participants={participants || []}
      availabilities={availabilities || []}
      finalizedDateIds={finalizedDateIds}
      publicToken={publicToken}
    />
  );
}
