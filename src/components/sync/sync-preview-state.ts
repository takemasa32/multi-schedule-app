import type { UserAvailabilitySyncPreviewEvent } from '@/lib/schedule-actions';

export type SyncPreviewState = {
  events: UserAvailabilitySyncPreviewEvent[];
  cellSelectionMap: Record<string, Record<string, boolean>>;
  weekPageMap: Record<string, number>;
  overwriteMap: Record<string, boolean>;
  allowFinalizedMap: Record<string, boolean>;
  messageMap: Record<string, string>;
};

type SyncPreviewWeekResolver = (event: UserAvailabilitySyncPreviewEvent) => number;

export const createEmptySyncPreviewState = (): SyncPreviewState => ({
  events: [],
  cellSelectionMap: {},
  weekPageMap: {},
  overwriteMap: {},
  allowFinalizedMap: {},
  messageMap: {},
});

export const buildSyncPreviewState = (
  events: UserAvailabilitySyncPreviewEvent[],
  resolveWeekPage: SyncPreviewWeekResolver,
): SyncPreviewState => ({
  events,
  cellSelectionMap: Object.fromEntries(
    events.map((event) => [
      event.eventId,
      Object.fromEntries(event.dates.map((date) => [date.eventDateId, date.desiredAvailability])),
    ]),
  ),
  weekPageMap: Object.fromEntries(events.map((event) => [event.eventId, resolveWeekPage(event)])),
  overwriteMap: Object.fromEntries(events.map((event) => [event.eventId, false])),
  allowFinalizedMap: Object.fromEntries(events.map((event) => [event.eventId, false])),
  messageMap: {},
});
