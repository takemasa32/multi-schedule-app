import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

// この管理者ページは単なるリダイレクターとして機能し、
// admin_tokenをセッションに保存してからイベント詳細ページへリダイレクトします
export default async function EventAdminPage({
  params,
}: {
  params: { public_id: string; admin_token: string };
}) {
  const cookieStore = cookies();

  // Cookieにadmin_tokenを保存
  // 実際の実装ではセキュリティを考慮して適切に処理する
  cookieStore.set("admin_token", params.admin_token, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7, // 7日間
    secure: process.env.NODE_ENV === "production",
  });

  // イベント詳細ページにリダイレクト
  redirect(`/event/${params.public_id}`);
}
