import 'server-only';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createSupabaseAdmin } from '@/lib/supabase';
import { fetchUserScheduleBlocks } from '@/lib/schedule-service';
import { answerInput, eventInput, scheduleInput, weekInput } from './schemas';
import { MCP_TOOL_SCOPES, mcpChallenge, toolSecurity, type McpToolName } from './authorization';
import {
  McpInputError,
  previewMyScheduleUpdate,
  readEvent,
  readMyAnswer,
  saveMyAnswer,
  updateMySchedule,
} from './services';

/** HTTPリクエストごとに認証済み本人を閉じ込め、別ユーザーへの状態の混入を防ぐ。 */
export function createMcpServer(identity: { userId: string; scopes: string[] } | null) {
  const user = identity ?? { userId: '', scopes: [] };
  const server = new McpServer({ name: 'daysynth', version: '1.0.0' });
  const run = async (name: McpToolName, operation: () => Promise<unknown>) => {
    const scope = MCP_TOOL_SCOPES[name];
    if (!user.scopes.includes(scope))
      return {
        content: [
          {
            type: 'text' as const,
            text: 'この接続には必要な操作権限がありません。必要な範囲で再接続してください。',
          },
        ],
        isError: true,
        _meta: {
          'mcp/www_authenticate': [
            mcpChallenge(scope, identity ? 'insufficient_scope' : 'invalid_token'),
          ],
        },
      };
    try {
      const result = await operation();
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
    } catch (error) {
      return {
        content: [
          {
            type: 'text' as const,
            text:
              error instanceof McpInputError
                ? error.message
                : '処理を完了できませんでした。時間をおいて再度お試しください。',
          },
        ],
        isError: true,
      };
    }
  };
  const read = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  const write = {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
  server.registerTool(
    'list_my_events',
    {
      description: '本人のアカウントに紐づくイベントを一覧取得する。続きはoffsetを指定する。',
      inputSchema: z.object({ offset: z.number().int().min(0).max(100000).default(0) }).strict(),
      annotations: read,
      _meta: toolSecurity('list_my_events'),
    },
    ({ offset }) =>
      run('list_my_events', async () => {
        const { data, error } = await createSupabaseAdmin()
          .from('user_event_links')
          .select('events(title,public_token,is_finalized)')
          .eq('user_id', user.userId)
          .order('id')
          .range(offset, offset + 99);
        if (error) throw new Error();
        return {
          events: (data ?? []).map((row) => row.events).filter(Boolean),
          next_offset: data?.length === 100 ? offset + 100 : null,
        };
      }),
  );
  server.registerTool(
    'get_event',
    {
      description:
        '公開トークンからイベントと候補日時を取得する。日時は既存の保存形式で、日本時間の壁時計時刻として読む。',
      inputSchema: eventInput,
      annotations: read,
      _meta: toolSecurity('get_event'),
    },
    ({ public_token }) => run('get_event', () => readEvent(public_token)),
  );
  server.registerTool(
    'get_my_answer',
    {
      description: '本人に紐づく回答だけを取得する。紐づきがなければanswerはnull。',
      inputSchema: eventInput,
      annotations: read,
      _meta: toolSecurity('get_my_answer'),
    },
    ({ public_token }) => run('get_my_answer', () => readMyAnswer(user.userId, public_token)),
  );
  server.registerTool(
    'get_my_schedule',
    {
      description: '指定日から7日間の本人の予定を取得する。日時は日本時間の壁時計時刻として読む。',
      inputSchema: weekInput,
      annotations: read,
      _meta: toolSecurity('get_my_schedule'),
    },
    ({ week_start }) =>
      run('get_my_schedule', async () => ({
        blocks: await fetchUserScheduleBlocks(user.userId, week_start, true),
        time_zone: 'Asia/Tokyo',
      })),
  );
  server.registerTool(
    'save_my_answer',
    {
      description:
        '本人の回答を登録・編集する。未指定の枠は保持する。指定した回答は手動上書きとして予定同期から保護される。本人の回答がなければ名前検索せず新規作成する。アカウント予定は変更しない。',
      inputSchema: answerInput,
      annotations: write,
      _meta: toolSecurity('save_my_answer'),
    },
    (input) => run('save_my_answer', () => saveMyAnswer(user.userId, input)),
  );
  server.registerTool(
    'preview_my_schedule_update',
    {
      description:
        '予定変更を保存せず、各イベントに反映される変更数を確認する。日時はAsia/Tokyo、YYYY-MM-DDTHH:00:00、最大7日。',
      inputSchema: scheduleInput,
      annotations: read,
      _meta: toolSecurity('preview_my_schedule_update'),
    },
    (input) => run('preview_my_schedule_update', () => previewMyScheduleUpdate(user.userId, input)),
  );
  server.registerTool(
    'update_my_schedule',
    {
      description:
        '本人の予定を保存し、本人に紐づく全イベントの未来の回答へ反映する。日本時間、毎正時、最大7日。手動上書きと過去回答を保持し、確定済みイベントはallow_finalized=trueで明示された場合のみ更新する。部分失敗時は同じ入力で再試行できる。',
      inputSchema: scheduleInput,
      annotations: write,
      _meta: toolSecurity('update_my_schedule'),
    },
    (input) => run('update_my_schedule', () => updateMySchedule(user.userId, input)),
  );
  return server;
}
