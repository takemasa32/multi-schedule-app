import { redirect } from "next/navigation";
import { cookies } from "next/headers";

// CookieをセットするためのServer Action
async function setAdminTokenCookie(adminToken: string) {
  "use server";

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

// サーバーアクション: リダイレクト処理を行う
async function adminRedirect(adminToken: string, publicId: string) {
  "use server";

  // Cookieにadmin_tokenを保存
  await setAdminTokenCookie(adminToken);

  // イベント詳細ページにリダイレクト
  redirect(`/event/${publicId}`);
}

// この管理者ページは単なるリダイレクターとして機能し、
// admin_tokenをセッションに保存してからイベント詳細ページへリダイレクトします
export default async function EventAdminPage({
  params,
}: {
  params: { public_id: string; admin_token: string };
}) {
  // paramsを非同期APIとして正しく取得
  const resolvedParams = await params;
  const publicId = resolvedParams.public_id;
  const adminToken = resolvedParams.admin_token;

  // この内容はクライアント側に表示される（管理者認証への案内）
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="card-title text-2xl font-bold">管理者認証</h1>
          <p className="py-4">
            イベント管理者として認証します。このページを開いた後、続行するボタンを押してください。
          </p>

          <form action={adminRedirect.bind(null, adminToken, publicId)}>
            <button type="submit" className="btn btn-primary w-full">
              続行する
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-4">
            ※
            このページは管理者用の特別なリンクです。イベントの管理機能が有効になります。
          </p>
        </div>
      </div>
    </div>
  );
}
