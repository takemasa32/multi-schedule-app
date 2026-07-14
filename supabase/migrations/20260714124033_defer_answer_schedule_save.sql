-- 回答送信時はイベント回答と紐づけのみ保存し、予定ブロックは完了画面の明示操作で保存する。
-- 過去環境に残る拡張シグネチャを削除し、PostgRESTがRPCを一意に解決できるようにする。
DROP FUNCTION IF EXISTS public.submit_availability_bundle(
  uuid,
  text,
  uuid,
  text,
  text,
  jsonb,
  text,
  jsonb,
  jsonb,
  jsonb
);

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
  v_now timestamptz := now();
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
