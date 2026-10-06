import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { issueAuthorizationCode, validateAuthorization } from '@/lib/mcp/oauth';

export const dynamic = 'force-dynamic';

/** 既存のログインを使い、接続先と操作範囲を本人が確認して許可する。 */
export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const values = await searchParams;
  if (Object.values(values).some((value) => Array.isArray(value)))
    return <p>接続リクエストが不正です。</p>;
  const params = new URLSearchParams(
    Object.entries(values).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
  let request;
  try {
    request = validateAuthorization(params);
  } catch {
    return <p>接続リクエストが不正、または接続機能が無効です。</p>;
  }
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const query = params.toString();
  if (!userId)
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/oauth/authorize?${query}`)}`);

  async function decide(form: FormData) {
    'use server';
    const currentUserId = (await getAuthSession())?.user?.id;
    if (!currentUserId || currentUserId !== userId) redirect(`/oauth/authorize?${query}`);
    const freshParams = new URLSearchParams(query);
    const validated = validateAuthorization(freshParams);
    const callback = new URL(validated.redirectUri);
    if (form.get('decision') === 'allow') {
      const code = await issueAuthorizationCode(currentUserId, freshParams);
      callback.searchParams.set('code', code);
    } else {
      callback.searchParams.set('error', 'access_denied');
    }
    if (validated.state) callback.searchParams.set('state', validated.state);
    redirect(callback.toString());
  }

  return (
    <section className="app-page-narrow space-y-6 py-8">
      <h1 className="page-title" data-testid="mcp-consent-title">
        {request.client.name}にDaySynthへの接続を許可
      </h1>
      <p>{session?.user?.email ?? session?.user?.name}のアカウントで接続します。</p>
      <ul className="list-disc space-y-2 pl-5">
        {request.scope.split(' ').includes('daysynth.read') && (
          <li>イベント、あなたの予定と回答の取得</li>
        )}
        {request.scope.split(' ').includes('daysynth.write') && (
          <li>あなたの回答の登録・編集、予定の更新と各イベントの回答への反映</li>
        )}
      </ul>
      <p>他人の回答や、あなたに紐づいていない回答は編集できません。</p>
      <form action={decide} className="flex flex-wrap gap-3">
        <button
          className="btn btn-primary"
          name="decision"
          value="allow"
          data-testid="mcp-consent-allow"
        >
          許可する
        </button>
        <button
          className="btn btn-ghost"
          name="decision"
          value="deny"
          data-testid="mcp-consent-deny"
        >
          キャンセル
        </button>
      </form>
    </section>
  );
}
