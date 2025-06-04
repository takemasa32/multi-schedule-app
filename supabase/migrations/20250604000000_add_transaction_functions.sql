-- トランザクション処理用のRPC関数を追加
-- データ損失防止とデータ整合性を保つため、複数のデータベース操作を1つのトランザクション内で実行する

/**
 * 参加者の回答を安全に更新するためのRPC関数
 * 既存の回答を削除してから新しい回答を挿入する処理を
 * 1つのトランザクション内で実行することで、データの整合性を保つ
 */
CREATE OR REPLACE FUNCTION update_participant_availability(
  p_participant_id uuid,
  p_event_id uuid,
  p_availabilities jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  availability_record jsonb;
BEGIN
  -- 既存の回答を削除
  DELETE FROM availabilities
  WHERE participant_id = p_participant_id
    AND event_id = p_event_id;

  -- 新しい回答を挿入
  FOR availability_record IN SELECT * FROM jsonb_array_elements(p_availabilities)
  LOOP
    INSERT INTO availabilities (
      event_id,
      participant_id,
      event_date_id,
      availability
    ) VALUES (
      p_event_id,
      p_participant_id,
      (availability_record->>'event_date_id')::uuid,
      (availability_record->>'availability')::boolean
    );
  END LOOP;

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

/**
 * イベントと候補日程を安全に作成するためのRPC関数
 * イベント作成と候補日程の挿入を1つのトランザクション内で実行することで、
 * 不完全なイベントが残ることを防ぐ
 */
CREATE OR REPLACE FUNCTION create_event_with_dates(
  p_title text,
  p_description text,
  p_public_token uuid,
  p_admin_token uuid,
  p_event_dates jsonb
)
RETURNS TABLE (
  event_id uuid,
  public_token uuid,
  admin_token uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_event_id uuid;
  date_record jsonb;
BEGIN
  -- イベントを作成
  INSERT INTO events (title, description, public_token, admin_token)
  VALUES (p_title, p_description, p_public_token, p_admin_token)
  RETURNING id INTO new_event_id;

  -- 候補日程を挿入
  FOR date_record IN SELECT * FROM jsonb_array_elements(p_event_dates)
  LOOP
    INSERT INTO event_dates (event_id, start_time, end_time)
    VALUES (
      new_event_id,
      (date_record->>'start_time')::timestamp,
      (date_record->>'end_time')::timestamp
    );
  END LOOP;

  -- 結果を返す
  RETURN QUERY SELECT new_event_id, p_public_token, p_admin_token;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

/**
 * イベント日程を安全に追加するためのRPC関数
 * 重複チェックと日程挿入を1つのトランザクション内で実行することで、
 * データの整合性を保つ
 */
CREATE OR REPLACE FUNCTION add_event_dates_safe(
  p_event_id uuid,
  p_event_dates jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  date_record jsonb;
  overlap_count integer;
BEGIN
  -- 各日程について重複チェックを行う
  FOR date_record IN SELECT * FROM jsonb_array_elements(p_event_dates)
  LOOP
    -- 重複チェック：既存の日程と時間が重複するものがないか確認
    SELECT COUNT(*) INTO overlap_count
    FROM event_dates
    WHERE event_id = p_event_id
      AND start_time < (date_record->>'end_time')::timestamp
      AND end_time > (date_record->>'start_time')::timestamp;

    IF overlap_count > 0 THEN
      RAISE EXCEPTION '既存の日程と重複しています';
    END IF;
  END LOOP;

  -- 重複がない場合、全ての日程を挿入
  FOR date_record IN SELECT * FROM jsonb_array_elements(p_event_dates)
  LOOP
    INSERT INTO event_dates (event_id, start_time, end_time)
    VALUES (
      p_event_id,
      (date_record->>'start_time')::timestamp,
      (date_record->>'end_time')::timestamp
    );
  END LOOP;

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

/**
 * イベントの日程確定を安全に実行するためのRPC関数
 * イベントの確定状態更新と確定日程の登録を1つのトランザクション内で実行することで、
 * データの整合性を保つ
 * JSONB配列からUUIDを正しく抽出するように最適化済み
 */
CREATE OR REPLACE FUNCTION finalize_event_safe(
  p_event_id uuid,
  p_date_ids jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  date_id_text text;
  first_date_id uuid;
  array_length_val int;
BEGIN
  -- 入力値の型チェック：nullまたは空配列の場合は確定解除
  IF p_date_ids IS NULL OR p_date_ids = 'null'::jsonb THEN
    array_length_val := 0;
  ELSIF jsonb_typeof(p_date_ids) = 'array' THEN
    array_length_val := jsonb_array_length(p_date_ids);
  ELSE
    -- 配列でない場合はエラー
    RAISE EXCEPTION 'p_date_ids must be a JSON array, got: %', jsonb_typeof(p_date_ids);
  END IF;

  -- 日程IDの配列が空の場合は確定解除
  IF array_length_val = 0 THEN
    -- イベントの確定状態を解除
    UPDATE events
    SET is_finalized = false, final_date_id = null
    WHERE id = p_event_id;

    -- 確定日程テーブルからも削除
    DELETE FROM finalized_dates
    WHERE event_id = p_event_id;

    RETURN true;
  END IF;

  -- 確定モード：最初の日程IDを取得（互換性のため）
  -- jsonb_array_elements_text を使用して正しく文字列として抽出
  SELECT value INTO date_id_text
  FROM jsonb_array_elements_text(p_date_ids)
  LIMIT 1;

  first_date_id := date_id_text::uuid;

  -- イベントを確定済み状態に更新
  UPDATE events
  SET is_finalized = true, final_date_id = first_date_id
  WHERE id = p_event_id;

  -- 既存の確定日程をクリア
  DELETE FROM finalized_dates
  WHERE event_id = p_event_id;

  -- 新しい確定日程を挿入
  FOR date_id_text IN SELECT jsonb_array_elements_text(p_date_ids)
  LOOP
    INSERT INTO finalized_dates (event_id, event_date_id)
    VALUES (p_event_id, date_id_text::uuid);
  END LOOP;

  RETURN true;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- 関数にコメントを追加
COMMENT ON FUNCTION update_participant_availability(uuid, uuid, jsonb) IS '参加者の回答を安全に更新するRPC関数。削除と挿入を1つのトランザクション内で実行してデータの整合性を保つ。';
COMMENT ON FUNCTION create_event_with_dates(text, text, uuid, uuid, jsonb) IS 'イベントと候補日程を安全に作成するRPC関数。両方の作成を1つのトランザクション内で実行してデータの整合性を保つ。';
COMMENT ON FUNCTION add_event_dates_safe(uuid, jsonb) IS 'イベント日程を安全に追加するRPC関数。重複チェックと挿入を1つのトランザクション内で実行してデータの整合性を保つ。';
COMMENT ON FUNCTION finalize_event_safe(uuid, jsonb) IS 'イベントの日程確定を安全に実行するRPC関数。確定状態の更新と確定日程の登録を1つのトランザクション内で実行してデータの整合性を保つ。JSONB配列からUUIDを正しく抽出するように最適化済み。';
