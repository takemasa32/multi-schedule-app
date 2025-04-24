"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import * as bcrypt from "bcryptjs";
import { getSupabaseServerClient } from "@/lib/supabase";

// サーバーサイド用Supabaseクライアントの初期化
const supabaseAdmin = getSupabaseServerClient();

// CookieをセットするためのServer Action
export async function setAdminTokenCookie(adminToken: string) {
  const cookiesStore = await cookies();
  cookiesStore.set("admin_token", adminToken, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7 * 4, // 28日間
    secure: process.env.NODE_ENV === "production",
  });

  return { success: true };
}

// サーバーアクション: トークンを使ったリダイレクト処理
export async function adminRedirect(adminToken: string, publicId: string) {
  // Cookieにadmin_tokenを保存
  await setAdminTokenCookie(adminToken);

  // イベント詳細ページにリダイレクト
  redirect(`/event/${publicId}`);
}

// サーバーアクション: パスワード認証を行い、成功したらリダイレクト
export async function verifyAdminPassword(formData: FormData) {
  const publicId = formData.get("publicId") as string;
  const password = formData.get("password") as string;

  if (!publicId || !password) {
    return { success: false, error: "パスワードが入力されていません" };
  }

  try {
    // イベントとパスワードハッシュを取得
    const { data: event, error } = await supabaseAdmin
      .from("events")
      .select("id, admin_token, admin_password_hash")
      .eq("public_token", publicId)
      .single();

    if (error || !event) {
      console.error("イベント取得エラー:", error);
      return { success: false, error: "イベントが見つかりませんでした" };
    }

    if (!event.admin_password_hash) {
      return { success: false, error: "このイベントはパスワード認証が設定されていません" };
    }

    // パスワードを検証
    const isPasswordValid = await bcrypt.compare(password, event.admin_password_hash);
    
    if (!isPasswordValid) {
      return { success: false, error: "パスワードが正しくありません" };
    }

    // 認証成功: Cookieを設定してリダイレクト
    await setAdminTokenCookie(event.admin_token);
    
    // リダイレクトは直接行えないのでsuccessフラグを返す
    return { success: true, redirectTo: `/event/${publicId}` };
  } catch (error) {
    console.error("パスワード認証エラー:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "認証処理中にエラーが発生しました" 
    };
  }
}