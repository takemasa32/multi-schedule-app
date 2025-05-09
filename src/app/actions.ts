"use server";

import { createSupabaseClient } from "@/lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";

/**
 * イベント作成処理
 */
export async function createEvent(formData: FormData) {
  try {
    // フォームからデータを取得
    const title = formData.get("title") as string;
    const description = formData.get("description") as string | null;

    // 開始・終了時間の配列を取得
    const startTimes = formData.getAll("startTimes") as string[];
    const endTimes = formData.getAll("endTimes") as string[];

    // バリデーション
    if (!title || !title.trim()) {
      throw new Error("タイトルを入力してください");
    }

    if (!startTimes.length || !endTimes.length || startTimes.length !== endTimes.length) {
      throw new Error("候補日程の情報が正しくありません");
    }

    // トークン生成
    const publicToken = uuidv4();
    const adminToken = uuidv4();

    // Supabaseクライアント取得
    const supabase = createSupabaseClient();

    // イベント作成
    const { data: eventData, error: eventError } = await supabase
      .from("events")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        public_token: publicToken,
        admin_token: adminToken,
      })
      .select("id")
      .single();

    if (eventError || !eventData) {
      console.error("イベント作成エラー:", eventError);
      throw new Error("イベント作成に失敗しました。もう一度お試しください。");
    }

    // 候補日程を登録
    const dateEntries = [];
    for (let i = 0; i < startTimes.length; i++) {
      dateEntries.push({
        event_id: eventData.id,
        start_time: startTimes[i],
        end_time: endTimes[i],
      });
    }

    const { error: datesError } = await supabase
      .from("event_dates")
      .insert(dateEntries);

    if (datesError) {
      console.error("候補日程登録エラー:", datesError);
      // イベントは作成済みだがロールバックはせず、エラーを返す
      throw new Error("候補日程の登録に失敗しました。イベント管理者に連絡してください。");
    }

    // クライアントコンポーネントで履歴保存できるように情報を返す
    const redirectUrl = `/event/${publicToken}?admin=${adminToken}`;

    return {
      success: true,
      publicToken,
      adminToken,
      redirectUrl
    };

  } catch (err) {
    // エラーログ出力
    console.error("Error in createEvent:", err);

    // Next.jsのリダイレクト例外はそのまま投げる（リダイレクト処理を妨げない）
    if (err instanceof Error && err.message.includes("NEXT_REDIRECT")) {
      throw err;
    }

    // それ以外のエラーは適切なメッセージにラップして返す
    throw new Error(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
  }
}

/**
 * 参加者の回答を保存するAction
 */
export async function submitAvailability(formData: FormData) {
  try {
    const eventId = formData.get("eventId") as string;
    const publicToken = formData.get("publicToken") as string;
    const participantName = formData.get("participant_name") as string;

    // 編集モードの場合、既存の参加者IDが提供される
    const participantId = formData.get("participantId") as string | null;

    // バリデーション
    if (!eventId || !publicToken || !participantName) {
      return { success: false, message: "必須項目が未入力です" };
    }

    const supabase = createSupabaseClient();

    // イベントの存在確認
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("public_token", publicToken)
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return { success: false, message: "イベントが見つかりません" };
    }

    // 参加者の作成/特定
    let existingParticipantId = participantId;
    let isNewParticipant = false;

    if (!existingParticipantId) {
      // 参加者IDが指定されていない場合は、名前で既存参加者を探す
      const { data: existingParticipant } = await supabase
        .from("participants")
        .select("id")
        .eq("event_id", eventId)
        .eq("name", participantName)
        .maybeSingle();

      if (existingParticipant) {
        existingParticipantId = existingParticipant.id;
      } else {
        // 新規参加者を作成
        const responseToken = uuidv4();
        const { data: newParticipant, error: participantError } = await supabase
          .from("participants")
          .insert({
            event_id: eventId,
            name: participantName,
            response_token: responseToken
          })
          .select("id")
          .single();

        if (participantError || !newParticipant) {
          console.error("Participant creation error:", participantError);
          throw new Error("参加者登録に失敗しました");
        }

        existingParticipantId = newParticipant.id;
        isNewParticipant = true;
      }
    }

    // 既存の参加者の回答を削除
    await supabase
      .from("availabilities")
      .delete()
      .eq("participant_id", existingParticipantId)
      .eq("event_id", eventId);

    // フォームデータから利用可能時間を収集
    const availabilityEntries = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("availability_")) {
        const dateId = key.replace("availability_", "");
        availabilityEntries.push({
          event_id: eventId,
          participant_id: existingParticipantId,
          event_date_id: dateId,
          availability: value === "on" // checkbox値はonまたは存在しない
        });
      }
    }

    // 回答がない場合
    if (availabilityEntries.length === 0) {
      throw new Error("少なくとも1つの回答を入力してください");
    }

    // 既存参加者の場合は削除とINSERTを並列化
    if (!isNewParticipant) {
      await Promise.all([
        supabase
          .from("availabilities")
          .delete()
          .eq("participant_id", existingParticipantId)
          .eq("event_id", eventId),
        supabase
          .from("availabilities")
          .insert(availabilityEntries)
      ]);
    } else {
      // 新規参加者はINSERTのみ
      const { error: availabilityError } = await supabase
        .from("availabilities")
        .insert(availabilityEntries);
      if (availabilityError) {
        console.error("Availability submission error:", availabilityError);
        throw new Error("回答の保存に失敗しました");
      }
    }

    // 回答保存後にイベントの最終閲覧時刻を更新
    await supabase
      .from("events")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", eventId);

    // ページを再検証（キャッシュを更新）
    try {
      revalidatePath(`/event/${publicToken}`);
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('revalidatePath error:', e);
      }
      // テスト時は握りつぶす
    }

    return {
      success: true,
      message: "回答を送信しました。ありがとうございます！"
    };
  } catch (err) {
    console.error("Error in submitAvailability:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "予期せぬエラーが発生しました"
    };
  }
}

/**
 * イベント日程確定用のAction
 * 複数の日程を確定できるように修正
 * 管理者でなくても使えるように変更
 */
export async function finalizeEvent(eventId: string, dateIds: string[]) {
  try {
    if (!eventId || !dateIds || dateIds.length === 0) {
      return { success: false, message: "必須パラメータが不足しています" };
    }

    const supabase = createSupabaseClient();

    // イベント情報を取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, public_token")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      console.error("Event retrieval error:", eventError);
      return { success: false, message: "イベントが見つかりません" };
    }

    // 選択された日程が存在するか確認
    const { data: dateCheck, error: dateCheckError } = await supabase
      .from("event_dates")
      .select("id")
      .eq("event_id", eventId)
      .in("id", dateIds);

    if (dateCheckError || !dateCheck || dateCheck.length !== dateIds.length) {
      console.error("Invalid date selection:", dateCheckError);
      return { success: false, message: "選択された日程が見つかりません" };
    }

    // イベントを確定済み状態に更新
    // 互換性のためfinal_date_idも設定（最初の日程IDを使用）
    const { error: finalizeError } = await supabase
      .from("events")
      .update({
        is_finalized: true,
        final_date_id: dateIds[0]  // 互換性のため最初の日程IDを設定
      })
      .eq("id", eventId);

    if (finalizeError) {
      console.error("Finalize error:", finalizeError);
      return { success: false, message: "イベント確定に失敗しました" };
    }

    // 確定日程テーブルをクリアしてから新しい日程を挿入（再確定の場合のため）
    await supabase
      .from("finalized_dates")
      .delete()
      .eq("event_id", eventId);

    // 複数の確定日程をfinalized_datesテーブルに登録
    const finalizedEntries = dateIds.map(dateId => ({
      event_id: eventId,
      event_date_id: dateId
    }));

    const { error: insertError } = await supabase
      .from("finalized_dates")
      .insert(finalizedEntries);

    if (insertError) {
      console.error("Finalized dates insertion error:", insertError);
      return { success: false, message: "確定日程の登録に失敗しました" };
    }

    // ページを再検証
    try {
      revalidatePath(`/event/${event.public_token}`);
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('revalidatePath error:', e);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Error in finalizeEvent:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "予期せぬエラーが発生しました"
    };
  }
}

/**
 * イベントURLから参加情報を取得
 * @param eventUrl イベントのURL（例: https://domain.com/event/abc123） または publicToken
 */
export async function getEventInfoFromUrl(eventUrl: string) {
  try {
    let publicToken = eventUrl.trim();

    // URLからトークンを抽出
    if (publicToken.includes('/')) {
      const urlParts = publicToken.split('/');
      publicToken = urlParts[urlParts.length - 1];

      // クエリパラメータの除去
      if (publicToken.includes('?')) {
        publicToken = publicToken.split('?')[0];
      }
    }

    // トークンが空または無効な形式の場合
    if (!publicToken || publicToken.length < 5) {
      return { success: false, message: "無効なイベントURLまたはトークンです" };
    }

    const supabase = createSupabaseClient();

    // イベント情報を取得
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, title, public_token, created_at")
      .eq("public_token", publicToken)
      .single();

    if (eventError || !event) {
      console.error("Event retrieval error:", eventError);
      return { success: false, message: "イベントが見つかりません" };
    }

    // イベント日程を取得
    const { data: eventDates, error: datesError } = await supabase
      .from("event_dates")
      .select("id, start_time, end_time")
      .eq("event_id", event.id)
      .order("start_time", { ascending: true });

    if (datesError) {
      console.error("Event dates retrieval error:", datesError);
      return { success: false, message: "イベント日程の取得に失敗しました" };
    }

    return {
      success: true,
      event,
      eventDates
    };

  } catch (err) {
    console.error("Error in getEventInfoFromUrl:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "予期せぬエラーが発生しました"
    };
  }
}

/**
 * イベント間で回答をコピー
 * @param sourceEventUrl コピー元イベントURL
 * @param targetEventId コピー先イベントID
 * @param participantName 参加者名
 * @param matchType マッチング方法（"exact"=完全一致、"time"=時間帯のみ一致、"day"=曜日のみ一致、"both"=時間帯と曜日の両方一致）
 */
export async function copyAvailabilityBetweenEvents(
  sourceEventUrl: string,
  targetEventId: string,
  participantName: string,
  matchType: "exact" | "time" | "day" | "both" = "both"
) {
  try {
    if (!sourceEventUrl || !targetEventId || !participantName) {
      return { success: false, message: "必須パラメータが不足しています" };
    }

    // コピー元イベント情報を取得
    const sourceResult = await getEventInfoFromUrl(sourceEventUrl);
    if (!sourceResult.success || !sourceResult.event) {
      return sourceResult; // エラーを返す
    }

    const supabase = createSupabaseClient();

    // コピー先イベント情報を取得
    const { data: targetEvent, error: targetEventError } = await supabase
      .from("events")
      .select("id, public_token")
      .eq("id", targetEventId)
      .single();

    if (targetEventError || !targetEvent) {
      console.error("Target event retrieval error:", targetEventError);
      return { success: false, message: "コピー先のイベントが見つかりません" };
    }

    // コピー先の日程を取得
    const { data: targetDates, error: targetDatesError } = await supabase
      .from("event_dates")
      .select("id, start_time, end_time")
      .eq("event_id", targetEventId);

    if (targetDatesError || !targetDates || targetDates.length === 0) {
      console.error("Target dates retrieval error:", targetDatesError);
      return { success: false, message: "コピー先の日程情報が取得できません" };
    }

    // コピー元イベントの参加者を取得
    const { data: sourceParticipant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", sourceResult.event.id)
      .eq("name", participantName)
      .maybeSingle();

    if (participantError) {
      console.error("Source participant retrieval error:", participantError);
      return { success: false, message: "参加者情報の取得に失敗しました" };
    }

    // 参加者が存在しない場合
    if (!sourceParticipant) {
      return {
        success: false,
        message: `コピー元のイベントに「${participantName}」という名前の参加者が見つかりません`
      };
    }

    // コピー元の出欠情報を取得
    const { data: sourceAvailabilities, error: availError } = await supabase
      .from("availabilities")
      .select("event_date_id, availability, event_date:event_dates(start_time, end_time)")
      .eq("participant_id", sourceParticipant.id);

    if (availError || !sourceAvailabilities || sourceAvailabilities.length === 0) {
      console.error("Source availabilities retrieval error:", availError);
      return { success: false, message: "コピー元の回答データが見つかりません" };
    }

    // 回答マッチング処理
    interface AvailabilityMatch {
      event_id: string;
      event_date_id: string;
      availability: boolean;
      _sourceTimeKey?: string;
      _targetTimeKey?: string;
      _sourceDay?: number;
      _targetDay?: number;
    }

    const availabilityMatches: AvailabilityMatch[] = [];

    // マッチング方法に応じた処理
    targetDates.forEach(targetDate => {
      const targetStart = new Date(targetDate.start_time);
      const targetEnd = new Date(targetDate.end_time);
      const targetTimeKey = `${targetStart.getHours().toString().padStart(2, "0")}:${targetStart.getMinutes().toString().padStart(2, "0")}-${targetEnd.getHours().toString().padStart(2, "0")}:${targetEnd.getMinutes().toString().padStart(2, "0")}`;
      const targetDay = targetStart.getDay(); // 0=日, 1=月, ..., 6=土

      // 元の回答からマッチするものを探す
      let matchFound = false;

      for (const sourceAvail of sourceAvailabilities) {
        if (!sourceAvail.event_date) continue;

        // event_dateが配列の場合は最初の要素を取得し、そうでない場合はそのまま使用
        const eventDate = Array.isArray(sourceAvail.event_date)
          ? sourceAvail.event_date[0]
          : sourceAvail.event_date;

        // eventDateがnullやundefinedでないことを確認
        if (!eventDate || !eventDate.start_time || !eventDate.end_time) continue;

        const sourceStart = new Date(eventDate.start_time);
        const sourceEnd = new Date(eventDate.end_time);
        const sourceTimeKey = `${sourceStart.getHours().toString().padStart(2, "0")}:${sourceStart.getMinutes().toString().padStart(2, "0")}-${sourceEnd.getHours().toString().padStart(2, "0")}:${sourceEnd.getMinutes().toString().padStart(2, "0")}`;
        const sourceDay = sourceStart.getDay();

        // マッチング条件チェック
        let isMatch = false;

        switch (matchType) {
          case "exact":
            // 完全一致（日付と時間）- 現時点ではほぼ使わない
            isMatch = sourceStart.toISOString() === targetStart.toISOString() &&
                     sourceEnd.toISOString() === targetEnd.toISOString();
            break;

          case "time":
            // 時間帯のみ一致
            isMatch = sourceTimeKey === targetTimeKey;
            break;

          case "day":
            // 曜日のみ一致
            isMatch = sourceDay === targetDay;
            break;

          case "both":
          default:
            // 時間帯と曜日の両方一致（デフォルト）
            isMatch = sourceTimeKey === targetTimeKey && sourceDay === targetDay;
            break;
        }

        if (isMatch) {
          availabilityMatches.push({
            event_id: targetEventId,
            event_date_id: targetDate.id,
            availability: sourceAvail.availability,
            // デバッグ用情報（実際には不要）
            _sourceTimeKey: sourceTimeKey,
            _targetTimeKey: targetTimeKey,
            _sourceDay: sourceDay,
            _targetDay: targetDay
          });
          matchFound = true;
          break; // 最初のマッチで終了（複数マッチの場合は最初のみ採用）
        }
      }

      // マッチしなかった場合はデフォルト（不参加=false）で追加
      if (!matchFound) {
        availabilityMatches.push({
          event_id: targetEventId,
          event_date_id: targetDate.id,
          availability: false
        });
      }
    });

    // 既存の参加者を確認または作成
    let targetParticipantId;

    const { data: existingParticipant } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", targetEventId)
      .eq("name", participantName)
      .maybeSingle();

    if (existingParticipant) {
      // 既存参加者の過去の回答を削除
      targetParticipantId = existingParticipant.id;

      await supabase
        .from("availabilities")
        .delete()
        .eq("participant_id", targetParticipantId);
    } else {
      // 新規参加者を作成
      const responseToken = uuidv4();
      const { data: newParticipant, error: newPartError } = await supabase
        .from("participants")
        .insert({
          event_id: targetEventId,
          name: participantName,
          response_token: responseToken
        })
        .select("id")
        .single();

      if (newPartError || !newParticipant) {
        console.error("Participant creation error:", newPartError);
        return { success: false, message: "参加者の作成に失敗しました" };
      }

      targetParticipantId = newParticipant.id;
    }

    // 参加者IDをセット
    const finalAvailabilities = availabilityMatches.map(item => ({
      ...item,
      participant_id: targetParticipantId
    }));

    // 回答を挿入
    const { error: insertError } = await supabase
      .from("availabilities")
      .insert(finalAvailabilities.map(({_sourceTimeKey, _targetTimeKey, _sourceDay, _targetDay, ...rest}) => rest)); // デバッグ情報を除去

    if (insertError) {
      console.error("Availability insertion error:", insertError);
      return { success: false, message: "回答のコピーに失敗しました" };
    }

    // 成功
    try {
      revalidatePath(`/event/${targetEvent.public_token}`);
    } catch (e) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('revalidatePath error:', e);
      }
    }

    return {
      success: true,
      message: `${participantName}さんの回答をコピーしました`,
      matches: availabilityMatches.filter(m => m.availability).length, // 参加可能な数
      total: availabilityMatches.length, // 総数
      participantId: targetParticipantId
    };

  } catch (err) {
    console.error("Error in copyAvailabilityBetweenEvents:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "予期せぬエラーが発生しました"
    };
  }
}
