-- 1年以上前のイベントIDを返すRPC
CREATE OR REPLACE FUNCTION find_old_events(threshold timestamp)
RETURNS TABLE(id uuid) AS $$
  SELECT e.id
  FROM events e
  LEFT JOIN (
    SELECT event_id, MAX(end_time) AS max_end_time
    FROM event_dates
    GROUP BY event_id
  ) d ON e.id = d.event_id
  WHERE (d.max_end_time IS NULL OR d.max_end_time < threshold)
    AND (e.last_accessed_at IS NULL OR e.last_accessed_at < threshold)
$$ LANGUAGE sql STABLE;
