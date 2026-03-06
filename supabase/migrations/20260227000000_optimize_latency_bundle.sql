-- 体感最適化向けの非破壊マイグレーション
-- - 参照性能向上のための追加インデックス
-- - 回答送信の一括保存RPC
-- - 履歴一括同期RPC

CREATE INDEX IF NOT EXISTS idx_participants_event_created
  ON public.participants (event_id, created_at);

CREATE INDEX IF NOT EXISTS idx_event_dates_event_start
  ON public.event_dates (event_id, start_time);

CREATE OR REPLACE FUNCTION public.touch_event_last_accessed_if_stale(
  p_public_token text,
  p_accessed_at timestamptz DEFAULT now(),
  p_min_interval_minutes integer DEFAULT 15
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, authjs
AS $$
DECLARE
  v_updated_count integer := 0;
  v_interval interval := make_interval(mins => GREATEST(p_min_interval_minutes, 0));
BEGIN
  UPDATE public.events
  SET last_accessed_at = p_accessed_at
  WHERE public_token = p_public_token
    AND (
      last_accessed_at IS NULL
      OR last_accessed_at <= p_accessed_at - v_interval
    );

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RETURN v_updated_count > 0;
END;
$$;

COMMENT ON FUNCTION public.touch_event_last_accessed_if_stale(text, timestamptz, integer)
  IS '閲覧時の最終アクセス時刻を、一定間隔以上空いた場合のみ更新する。';

REVOKE EXECUTE ON FUNCTION public.touch_event_last_accessed_if_stale(text, timestamptz, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_event_last_accessed_if_stale(text, timestamptz, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.touch_event_last_accessed_if_stale(text, timestamptz, integer) FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_availability_bundle(
  p_event_id uuid,
  p_public_token text,
  p_participant_id uuid,
  p_participant_name text,
  p_comment text,
  p_availabilities jsonb,
  p_user_id text,
  p_override_date_ids jsonb DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  success boolean,
  message text,
  participant_id uuid,
  event_title text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, authjs
AS $$
DECLARE
  v_participant_id uuid;
  v_event_title text;
  v_record jsonb;
  v_selected_date_ids uuid[] := ARRAY[]::uuid[];
  v_override_date_ids uuid[] := ARRAY[]::uuid[];
  v_override_text text;
  v_slot_start timestamp;
  v_slot_end timestamp;
  v_now timestamptz := now();
  v_event_date record;
BEGIN
  SELECT e.title
  INTO v_event_title
  FROM public.events e
  WHERE e.id = p_event_id
    AND e.public_token = p_public_token
  LIMIT 1;

  IF v_event_title IS NULL THEN
    RETURN QUERY SELECT false, 'イベントが見つかりません', NULL::uuid, NULL::text;
    RETURN;
  END IF;

  IF p_participant_name IS NULL OR btrim(p_participant_name) = '' THEN
    RETURN QUERY SELECT false, '必須項目が未入力です', NULL::uuid, v_event_title;
    RETURN;
  END IF;

  IF p_availabilities IS NULL OR jsonb_typeof(p_availabilities) <> 'array' OR jsonb_array_length(p_availabilities) = 0 THEN
    RETURN QUERY SELECT false, '少なくとも1つの回答を入力してください', NULL::uuid, v_event_title;
    RETURN;
  END IF;

  IF p_participant_id IS NOT NULL THEN
    SELECT id
    INTO v_participant_id
    FROM public.participants
    WHERE id = p_participant_id
      AND event_id = p_event_id
    LIMIT 1;

    IF v_participant_id IS NOT NULL THEN
      UPDATE public.participants
      SET
        name = p_participant_name,
        comment = p_comment
      WHERE id = v_participant_id;
    END IF;
  END IF;

  IF v_participant_id IS NULL THEN
    SELECT id
    INTO v_participant_id
    FROM public.participants
    WHERE event_id = p_event_id
      AND name = p_participant_name
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_participant_id IS NOT NULL THEN
      UPDATE public.participants
      SET comment = p_comment
      WHERE id = v_participant_id;
    ELSE
      INSERT INTO public.participants (
        event_id,
        name,
        response_token,
        comment
      )
      VALUES (
        p_event_id,
        p_participant_name,
        pg_catalog.gen_random_uuid(),
        p_comment
      )
      RETURNING id INTO v_participant_id;
    END IF;
  END IF;

  PERFORM public.update_participant_availability(
    v_participant_id,
    p_event_id,
    p_availabilities
  );

  FOR v_record IN SELECT * FROM jsonb_array_elements(p_availabilities)
  LOOP
    IF COALESCE((v_record->>'availability')::boolean, false) THEN
      BEGIN
        v_selected_date_ids := array_append(v_selected_date_ids, (v_record->>'event_date_id')::uuid);
      EXCEPTION
        WHEN invalid_text_representation THEN
          -- 不正なIDは破棄して継続
          NULL;
      END;
    END IF;
  END LOOP;

  UPDATE public.events
  SET last_accessed_at = v_now
  WHERE id = p_event_id;

  IF p_user_id IS NOT NULL THEN
    INSERT INTO public.user_event_links (
      user_id,
      event_id,
      participant_id,
      updated_at
    )
    VALUES (
      p_user_id,
      p_event_id,
      v_participant_id,
      v_now
    )
    ON CONFLICT (user_id, event_id)
    DO UPDATE SET
      participant_id = EXCLUDED.participant_id,
      updated_at = EXCLUDED.updated_at;

    FOR v_event_date IN
      SELECT id, start_time, end_time
      FROM public.event_dates
      WHERE event_id = p_event_id
    LOOP
      v_slot_start := v_event_date.start_time;
      WHILE v_slot_start < v_event_date.end_time LOOP
        v_slot_end := LEAST(v_slot_start + interval '1 hour', v_event_date.end_time);

        INSERT INTO public.user_schedule_blocks (
          user_id,
          start_time,
          end_time,
          availability,
          source,
          event_id,
          updated_at
        )
        VALUES (
          p_user_id,
          v_slot_start,
          v_slot_end,
          (v_event_date.id = ANY(v_selected_date_ids)),
          'event',
          p_event_id,
          v_now
        )
        ON CONFLICT (user_id, start_time, end_time)
        DO UPDATE SET
          availability = EXCLUDED.availability,
          source = EXCLUDED.source,
          event_id = EXCLUDED.event_id,
          updated_at = EXCLUDED.updated_at;

        v_slot_start := v_slot_end;
      END LOOP;
    END LOOP;

    IF p_override_date_ids IS NULL
      OR jsonb_typeof(p_override_date_ids) <> 'array'
      OR jsonb_array_length(p_override_date_ids) = 0 THEN
      DELETE FROM public.user_event_availability_overrides
      WHERE user_id = p_user_id
        AND event_id = p_event_id;
    ELSE
      FOR v_override_text IN SELECT * FROM jsonb_array_elements_text(p_override_date_ids)
      LOOP
        BEGIN
          v_override_date_ids := array_append(v_override_date_ids, v_override_text::uuid);
        EXCEPTION
          WHEN invalid_text_representation THEN
            NULL;
        END;
      END LOOP;

      IF COALESCE(array_length(v_override_date_ids, 1), 0) = 0 THEN
        DELETE FROM public.user_event_availability_overrides
        WHERE user_id = p_user_id
          AND event_id = p_event_id;
      ELSE
        INSERT INTO public.user_event_availability_overrides (
          user_id,
          event_id,
          event_date_id,
          availability,
          reason,
          updated_at
        )
        SELECT
          p_user_id,
          p_event_id,
          id,
          (id = ANY(v_selected_date_ids)),
          'conflict_override',
          v_now
        FROM unnest(v_override_date_ids) AS id
        ON CONFLICT (user_id, event_id, event_date_id)
        DO UPDATE SET
          availability = EXCLUDED.availability,
          reason = EXCLUDED.reason,
          updated_at = EXCLUDED.updated_at;

        DELETE FROM public.user_event_availability_overrides
        WHERE user_id = p_user_id
          AND event_id = p_event_id
          AND NOT (event_date_id = ANY(v_override_date_ids));
      END IF;
    END IF;
  END IF;

  RETURN QUERY SELECT true, '回答を送信しました。ありがとうございます！', v_participant_id, v_event_title;
END;
$$;

COMMENT ON FUNCTION public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb
) IS '回答送信時に参加者更新、出欠保存、回答紐づけ、予定反映、上書き保存、最終アクセス更新を一括で実行する。';

REVOKE EXECUTE ON FUNCTION public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb
) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb
) FROM authenticated;

CREATE OR REPLACE FUNCTION public.upsert_event_access_histories_bulk(
  p_user_id text,
  p_items jsonb
)
RETURNS TABLE (
  processed_count integer,
  skipped_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, authjs
AS $$
DECLARE
  v_item jsonb;
  v_processed integer := 0;
  v_skipped integer := 0;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RETURN QUERY SELECT 0, 0;
    RETURN;
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF NOT (v_item ? 'event_public_token') OR NOT (v_item ? 'event_title') THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    BEGIN
      PERFORM public.upsert_event_access_history(
        p_user_id,
        v_item->>'event_public_token',
        v_item->>'event_title',
        COALESCE((v_item->>'is_created_by_me')::boolean, false),
        COALESCE((v_item->>'accessed_at')::timestamptz, now())
      );

      v_processed := v_processed + 1;
    EXCEPTION
      WHEN others THEN
        v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT v_processed, v_skipped;
END;
$$;

COMMENT ON FUNCTION public.upsert_event_access_histories_bulk(text, jsonb)
  IS 'イベント閲覧履歴をJSON配列で一括upsertする。';

REVOKE EXECUTE ON FUNCTION public.upsert_event_access_histories_bulk(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_event_access_histories_bulk(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.upsert_event_access_histories_bulk(text, jsonb) FROM authenticated;
