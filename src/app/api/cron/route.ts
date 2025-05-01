import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  // セキュリティ: Authorization ヘッダーで CRON_SECRET を検証
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Supabase管理クライアント
  const supabase = createSupabaseAdmin();

  // 1年以上前のイベントIDを抽出
  // - event_datesの最大end_time
  // - events.last_accessed_at
  // の両方が1年以上前
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const oneYearAgoStr = oneYearAgo.toISOString();

  // 1年以上前のイベントIDを取得
  // SQL: event_datesの最大end_time, events.last_accessed_atの両方が1年以上前
  const { data: oldEvents, error } = await supabase.rpc("find_old_events", {
    threshold: oneYearAgoStr
  });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!oldEvents || oldEvents.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 });
  }
  const ids = oldEvents.map((e: { id: string }) => e.id);

  // 削除（ON DELETE CASCADE前提）
  const { error: delError } = await supabase.from("events").delete().in("id", ids);
  if (delError) {
    return NextResponse.json({ ok: false, error: delError.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deleted: ids.length });
}
