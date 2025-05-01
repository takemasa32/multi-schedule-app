import { createSupabaseClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");
    const name = searchParams.get("name");

    // パラメータのバリデーション
    if (!eventId || !name) {
      return NextResponse.json(
        { error: "必須パラメータがありません" },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();

    // 参加者を名前で検索
    const { data, error } = await supabase
      .from("participants")
      .select("id")
      .eq("event_id", eventId)
      .eq("name", name.trim())
      .maybeSingle();

    if (error) {
      console.error("参加者検索エラー:", error);
      return NextResponse.json(
        { error: "参加者検索中にエラーが発生しました" },
        { status: 500 }
      );
    }

    // 結果を返す - 参加者が存在するかどうか
    return NextResponse.json({
      exists: !!data,
    });
  } catch (error) {
    console.error("予期せぬエラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}